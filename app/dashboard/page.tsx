'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken, clearTokens } from '@/lib/auth';
import {
  getCurrentUser, getUserPlaylists, getPlaylistTracks,
  getAudioFeatures, getArtists, createPlaylist, addTracksToPlaylist,
  removeTracksFromPlaylist,
  SpotifyUser, SpotifyPlaylist, SpotifyTrackItem, AudioFeatures, SpotifyArtist
} from '@/lib/spotify';
import { enrichTracks, groupByGenre, EnrichedTrack, GENRE_MAP, GenreInfo, formatDuration, getMoodLabel } from '@/lib/genres';
import { MOOD_PRESETS, MoodPreset } from '@/lib/moods';
import { useAudio } from '@/lib/AudioProvider';
import { useTheme } from '@/lib/ThemeProvider';
import GenreChart from '@/components/GenreChart';
import MergeModal from '@/components/MergeModal';
import DuplicateFinder from '@/components/DuplicateFinder';
import AIPlaylistChat from '@/components/AIPlaylistChat';
import styles from './dashboard.module.css';

type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };
type SideTab = 'genres' | 'mood';

export default function DashboardPage() {
  const router = useRouter();
  const { audio: nowPlaying, toggleTrack } = useAudio();
  const { theme, toggleTheme } = useTheme();

  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [enrichedTracks, setEnrichedTracks] = useState<EnrichedTrack[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<EnrichedTrack[]>([]);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());

  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [activeGenres, setActiveGenres] = useState<Set<string>>(new Set());
  const [activeMood, setActiveMood] = useState<MoodPreset | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sideTab, setSideTab] = useState<SideTab>('genres');
  const [showOrganizeModal, setShowOrganizeModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showDupFinder, setShowDupFinder] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [organizing, setOrganizing] = useState(false);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [dragTrack, setDragTrack] = useState<EnrichedTrack | null>(null);
  const [playlistSearch, setPlaylistSearch] = useState('');

  // ─── Force Re-Auth for New Scopes ───
  useEffect(() => {
    const version = localStorage.getItem('moodify_auth_version');
    if (version !== 'v2') {
      clearTokens();
      localStorage.setItem('moodify_auth_version', 'v2');
      router.replace('/');
    }
  }, [router]);

  // ─── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = getAccessToken();
    if (!token) { router.replace('/'); return; }
    // Small delay to ensure localStorage is fully available after OAuth redirect
    const timer = setTimeout(() => {
      fetchUser();
      fetchPlaylists();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // ─── Filter ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let tracks = enrichedTracks;
    if (activeGenres.size > 0) tracks = tracks.filter((t) => activeGenres.has(t.genre.name));
    if (activeMood) tracks = tracks.filter(activeMood.filter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      tracks = tracks.filter((t) =>
        t.track.name.toLowerCase().includes(q) ||
        t.track.artists.some((a) => a.name.toLowerCase().includes(q)) ||
        t.track.album.name.toLowerCase().includes(q)
      );
    }
    setFilteredTracks(tracks);
  }, [enrichedTracks, activeGenres, activeMood, searchQuery]);

  // ─── API ──────────────────────────────────────────────────────────────────
  async function fetchUser() {
    try {
      const u = await getCurrentUser();
      setUser(u);
    } catch (e) {
      // Don't auto-logout on first failure — retry once
      try {
        const u = await getCurrentUser();
        setUser(u);
      } catch {
        showToast('Could not load your profile. Please refresh.', 'error');
      }
    }
  }

  async function fetchPlaylists() {
    setLoadingPlaylists(true);
    try { setPlaylists(await getUserPlaylists()); }
    catch (e) { showToast(e instanceof Error ? e.message : 'Failed', 'error'); }
    finally { setLoadingPlaylists(false); }
  }

  const selectPlaylist = useCallback(async (playlist: SpotifyPlaylist) => {
    setSelectedPlaylist(playlist);
    setEnrichedTracks([]); setSelectedTrackIds(new Set());
    setActiveGenres(new Set()); setActiveMood(null); setSearchQuery('');
    setLoadingTracks(true); setSidebarOpen(false); setTrackError(null);

    try {
      const items: SpotifyTrackItem[] = await getPlaylistTracks(playlist.id);
      const tracks = items.map((i) => i.track).filter(Boolean);
      if (!tracks.length) { setLoadingTracks(false); return; }

      // Spotify deprecated these endpoints for Dev apps in late 2024, causing 403 Forbidden errors.
      // We skip them entirely to prevent console flooding and rely on our smart fallback detection.
      let featuresMap = new Map<string, AudioFeatures>();
      let artistsMap = new Map<string, SpotifyArtist>();

      setEnrichedTracks(enrichTracks(tracks, featuresMap, artistsMap));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load tracks';
      setTrackError(msg);
      showToast(msg, 'error');
    }
    finally { setLoadingTracks(false); }
  }, []);

  // ─── Genre / Mood controls ─────────────────────────────────────────────────
  const toggleGenre = (genre: string) => {
    setActiveMood(null);
    setActiveGenres((prev) => { const n = new Set(prev); n.has(genre) ? n.delete(genre) : n.add(genre); return n; });
  };
  const applyMood = (mood: MoodPreset) => {
    setActiveGenres(new Set());
    setActiveMood((prev) => prev?.name === mood.name ? null : mood);
  };
  const clearFilters = () => { setActiveGenres(new Set()); setActiveMood(null); };

  // ─── Track selection ──────────────────────────────────────────────────────
  const toggleTrackSel = (id: string) => {
    setSelectedTrackIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const selectAll = () => {
    setSelectedTrackIds(selectedTrackIds.size === filteredTracks.length ? new Set() : new Set(filteredTracks.map((t) => t.track.id)));
  };

  // ─── Drag & Drop ──────────────────────────────────────────────────────────
  const handleDragStart = (et: EnrichedTrack) => setDragTrack(et);
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (!dragTrack) return;
    const srcIdx = enrichedTracks.findIndex((t) => t.track.id === dragTrack.track.id);
    if (srcIdx === -1 || srcIdx === targetIdx) { setDragOverIdx(null); setDragTrack(null); return; }
    const reordered = [...enrichedTracks];
    const [moved] = reordered.splice(srcIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    setEnrichedTracks(reordered);
    setDragOverIdx(null);
    setDragTrack(null);
  };
  const handleDragEnd = () => { setDragOverIdx(null); setDragTrack(null); };

  // ─── Organize ─────────────────────────────────────────────────────────────
  const openOrganize = () => {
    const label = activeMood?.name ?? (activeGenres.size === 1 ? [...activeGenres][0] : 'My Mix');
    setNewPlaylistName(`${label} — by Moodify`);
    setShowOrganizeModal(true);
  };

  const autoOrganize = async () => {
    if (!user || !selectedPlaylist) return;
    setOrganizing(true);
    showToast('Auto-organizing...', 'info');
    try {
      const grouped = groupByGenre(enrichedTracks);
      let count = 0;
      for (const [name, trs] of grouped.entries()) {
        if (trs.length < 2) continue;
        const g = GENRE_MAP.find((x) => x.name === name);
        const pl = await createPlaylist(user.id, `${g?.emoji ?? '🎵'} ${name} — by Moodify`, `From "${selectedPlaylist.name}"`);
        await addTracksToPlaylist(pl.id, trs.map((t) => `spotify:track:${t.track.id}`));
        count++;
      }
      count > 0 ? showToast(`✅ Created ${count} genre playlists!`, 'success') : showToast('Not enough tracks per genre.', 'info');
      await fetchPlaylists();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      showToast(msg.includes('403') ? `Spotify Error: ${msg}. Try signing out and signing back in to refresh your permissions.` : `Spotify Error: ${msg}`, 'error');
    }
    finally { setOrganizing(false); }
  };

  const autoOrganizeByMood = async (mood: MoodPreset) => {
    if (!user || !selectedPlaylist) return;
    const matching = enrichedTracks.filter(mood.filter);
    if (matching.length < 2) { showToast(`Not enough tracks match "${mood.name}"`, 'info'); return; }
    setOrganizing(true);
    try {
      const pl = await createPlaylist(user.id, `${mood.name} — by Moodify`, mood.playlistDesc);
      await addTracksToPlaylist(pl.id, matching.map((t) => `spotify:track:${t.track.id}`));
      showToast(`✅ "${mood.name}" created with ${matching.length} tracks!`, 'success');
      await fetchPlaylists();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      showToast(msg.includes('403') ? `Spotify Error: ${msg}. Try signing out and signing back in to refresh your permissions.` : `Spotify Error: ${msg}`, 'error');
    }
    finally { setOrganizing(false); }
  };

  const createFromSelected = async () => {
    if (!user || !newPlaylistName.trim()) return;
    const toUse = selectedTrackIds.size > 0
      ? filteredTracks.filter((t) => selectedTrackIds.has(t.track.id))
      : filteredTracks;
    setOrganizing(true);
    try {
      const pl = await createPlaylist(user.id, newPlaylistName.trim(), `Organized by Moodify — ${toUse.length} tracks`);
      await addTracksToPlaylist(pl.id, toUse.map((t) => `spotify:track:${t.track.id}`));
      showToast(`✅ "${newPlaylistName}" created!`, 'success');
      setShowOrganizeModal(false); setNewPlaylistName('');
      await fetchPlaylists();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      showToast(msg.includes('403') ? `Spotify Error: ${msg}. Try signing out and signing back in to refresh your permissions.` : `Spotify Error: ${msg}`, 'error');
    }
    finally { setOrganizing(false); }
  };

  // ─── Toast ────────────────────────────────────────────────────────────────
  const showToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4500);
  };

  const logout = () => { clearTokens(); router.replace('/'); };

  // ─── Track Removal ────────────────────────────────────────────────────────
  const removeTrack = async (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedPlaylist) return;
    const track = enrichedTracks.find((t) => t.track.id === trackId);
    if (!track) return;

    // Optimistic removal
    const prevTracks = [...enrichedTracks];
    setEnrichedTracks((prev) => prev.filter((t) => t.track.id !== trackId));
    setSelectedTrackIds((prev) => { const n = new Set(prev); n.delete(trackId); return n; });

    const uri = track.track.uri || `spotify:track:${trackId}`;
    try {
      await removeTracksFromPlaylist(selectedPlaylist.id, [uri]);
      // Show undo toast
      const toastId = Date.now();
      setToasts((p) => [...p, { id: toastId, message: `🗑️ Removed "${track.track.name}" · Click to undo`, type: 'info' as const }]);
      const undoTimeout = setTimeout(() => {
        setToasts((p) => p.filter((t) => t.id !== toastId));
      }, 6000);
      // Store undo data
      const handleUndo = async () => {
        clearTimeout(undoTimeout);
        setToasts((p) => p.filter((t) => t.id !== toastId));
        try {
          await addTracksToPlaylist(selectedPlaylist.id, [uri]);
          setEnrichedTracks(prevTracks);
          showToast(`↩️ "${track.track.name}" restored`, 'success');
        } catch { showToast('Failed to undo', 'error'); }
      };
      // Replace the toast click handler by using a custom event
      (window as any).__moodifyUndo = handleUndo;
    } catch {
      // Revert on failure
      setEnrichedTracks(prevTracks);
      showToast('Failed to remove track', 'error');
    }
  };

  const removeSelected = async () => {
    if (!selectedPlaylist || selectedTrackIds.size === 0) return;
    const toRemove = enrichedTracks.filter((t) => selectedTrackIds.has(t.track.id));
    const uris = toRemove.map((t) => t.track.uri || `spotify:track:${t.track.id}`);
    const prevTracks = [...enrichedTracks];

    setEnrichedTracks((prev) => prev.filter((t) => !selectedTrackIds.has(t.track.id)));
    setSelectedTrackIds(new Set());

    try {
      await removeTracksFromPlaylist(selectedPlaylist.id, uris);
      showToast(`🗑️ Removed ${toRemove.length} tracks`, 'success');
    } catch {
      setEnrichedTracks(prevTracks);
      showToast('Failed to remove tracks', 'error');
    }
  };

  // ─── Genre stats ──────────────────────────────────────────────────────────
  const genreStats = (() => {
    const map = new Map<string, { count: number; genre: GenreInfo }>();
    for (const et of enrichedTracks) {
      const x = map.get(et.genre.name);
      if (x) x.count++; else map.set(et.genre.name, { count: 1, genre: et.genre });
    }
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  })();

  const filteredPlaylists = playlists.filter((p) =>
    !playlistSearch || p.name.toLowerCase().includes(playlistSearch.toLowerCase())
  );

  const hasActiveFilter = activeGenres.size > 0 || !!activeMood;

  return (
    <div className={styles.shell}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarLogo}>
            <div className={styles.logoMark}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="currentColor"/>
              </svg>
            </div>
            <span>Moodify</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className={styles.themeBtn} onClick={toggleTheme} title="Toggle theme" id="theme-toggle">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button className={styles.closeSidebar} onClick={() => setSidebarOpen(false)}>✕</button>
          </div>
        </div>

        {user && (
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>
              {user.images?.[0]?.url ? <img src={user.images[0].url} alt={user.display_name} /> : <span>{user.display_name?.[0]}</span>}
            </div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{user.display_name}</div>
              <div className={styles.userSub}>{user.followers?.total?.toLocaleString()} followers</div>
            </div>
          </div>
        )}

        {/* Merge button */}
        <div style={{ padding: '0 12px 8px' }}>
          <button className={`btn btn-secondary btn-sm ${styles.mergeBtn}`} onClick={() => setShowMergeModal(true)}>
            🔀 Merge Playlists
          </button>
        </div>

        <div className={styles.sidebarSection}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 8px' }}>
            <div className={styles.sidebarLabel} style={{ padding: 0 }}>Your Playlists</div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{playlists.length}</span>
          </div>
          <input
            className={`input ${styles.playlistSearch}`}
            placeholder="Search playlists..."
            value={playlistSearch}
            onChange={(e) => setPlaylistSearch(e.target.value)}
          />
          {loadingPlaylists ? (
            <div className={styles.skeletonList}>
              {Array.from({ length: 7 }).map((_, i) => <div key={i} className={`skeleton ${styles.skeletonItem}`} />)}
            </div>
          ) : (
            <div className={styles.playlistList}>
              {filteredPlaylists.map((pl) => (
                <button
                  key={pl.id}
                  className={`${styles.playlistItem} ${selectedPlaylist?.id === pl.id ? styles.playlistItemActive : ''}`}
                  onClick={() => selectPlaylist(pl)}
                >
                  <div className={styles.playlistThumb}>
                    {pl.images?.[0]?.url ? <img src={pl.images[0].url} alt={pl.name} /> : <span>🎵</span>}
                  </div>
                  <div className={styles.playlistMeta}>
                    <div className={styles.playlistName}>{pl.name}</div>
                    <div className={styles.playlistCount}>{pl.tracks?.total ?? 0} tracks</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.sidebarFooter}>
          <button className={`btn btn-ghost ${styles.logoutBtn}`} onClick={logout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className={styles.main}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button className={styles.menuBtn} onClick={() => setSidebarOpen(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            {selectedPlaylist ? (
              <div className={styles.topbarTitle}>
                <div className={styles.topbarThumb}>
                  {selectedPlaylist.images?.[0]?.url ? <img src={selectedPlaylist.images[0].url} alt="" /> : <span>🎵</span>}
                </div>
                <div>
                  <div className={styles.topbarPlaylistName}>{selectedPlaylist.name}</div>
                  <div className={styles.topbarPlaylistSub}>{enrichedTracks.length} tracks · {genreStats.length} genres detected</div>
                </div>
              </div>
            ) : (
              <div className={styles.topbarWelcome}>{user ? `👋 ${user.display_name?.split(' ')[0]}` : 'Moodify'}</div>
            )}
          </div>

          <div className={styles.topbarActions}>
            {selectedPlaylist && !loadingTracks && enrichedTracks.length > 0 && (
              <>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowDupFinder(true)}
                  disabled={selectedPlaylist.owner.id !== user?.id}
                  title={selectedPlaylist.owner.id !== user?.id ? "You can only remove duplicates from playlists you created. Try duplicating this playlist first!" : "Find and remove duplicate tracks"}
                  style={selectedPlaylist.owner.id !== user?.id ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                >
                  🔍 Duplicates
                </button>
                <button className="btn btn-secondary btn-sm" onClick={autoOrganize} disabled={organizing}>
                  {organizing ? '...' : '🪄 Auto-Organize'}
                </button>
                <button className="btn btn-primary btn-sm" onClick={openOrganize}>+ Playlist</button>
              </>
            )}
          </div>
        </header>

        {!selectedPlaylist ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎵</div>
            <h2>Pick a playlist to get started</h2>
            <p>Moodify will analyze every track — genre, mood, energy, danceability & more.</p>
            <button className="btn btn-primary" onClick={() => setSidebarOpen(true)}>Browse Playlists</button>
          </div>
        ) : loadingTracks ? (
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner}>
              <div className={styles.spinnerRing} />
              <div className={styles.spinnerIcon}>🎵</div>
            </div>
            <div className={styles.loadingText}>Analyzing your music...</div>
            <div className={styles.loadingSubtext}>Fetching audio features, genres & moods</div>
          </div>
        ) : trackError ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>⚠️</div>
            <h2>Couldn't load tracks</h2>
            <p style={{ maxWidth: 400 }}>{trackError.includes('403') ? 'Spotify denied access. Try signing out and back in to refresh permissions.' : trackError}</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={() => selectedPlaylist && selectPlaylist(selectedPlaylist)}>Retry</button>
              <button className="btn btn-secondary" onClick={logout}>Sign out & Re-login</button>
            </div>
          </div>
        ) : enrichedTracks.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📭</div>
            <h2>This playlist is empty</h2>
            <p>Add some tracks on Spotify and come back!</p>
          </div>
        ) : (
          <div className={styles.contentGrid}>
            {/* ── Left panel: genre chart + filters ─── */}
            <div className={styles.statsPanel}>
              {/* Genre donut chart */}
              <GenreChart
                data={genreStats.map(([, v]) => ({ genre: v.genre, count: v.count }))}
                total={enrichedTracks.length}
                activeGenres={activeGenres}
                onToggle={toggleGenre}
              />

              {/* Tab switcher */}
              <div className={styles.sideTabRow}>
                <button className={`${styles.sideTab} ${sideTab === 'genres' ? styles.sideTabActive : ''}`} onClick={() => setSideTab('genres')}>Genres</button>
                <button className={`${styles.sideTab} ${sideTab === 'mood' ? styles.sideTabActive : ''}`} onClick={() => setSideTab('mood')}>Moods</button>
              </div>

              {sideTab === 'genres' && (
                <div className={styles.genreStats}>
                  {genreStats.map(([name, { count, genre }]) => (
                    <button
                      key={name}
                      className={`${styles.genreStatItem} ${activeGenres.has(name) ? styles.genreStatActive : ''}`}
                      onClick={() => toggleGenre(name)}
                      style={{ '--genre-color': genre.color } as React.CSSProperties}
                    >
                      <div className={styles.genreStatHeader}>
                        <span className={styles.genreStatName}>{genre.emoji} {name}</span>
                        <span className={styles.genreStatCount}>{count}</span>
                      </div>
                      <div className="feature-bar-track">
                        <div className="feature-bar-fill" style={{ width: `${(count / enrichedTracks.length) * 100}%`, background: genre.color }} />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {sideTab === 'mood' && (
                <div className={styles.moodGrid}>
                  {MOOD_PRESETS.map((mood) => {
                    const count = enrichedTracks.filter(mood.filter).length;
                    const isActive = activeMood?.name === mood.name;
                    return (
                      <div key={mood.name} className={styles.moodCard} style={{ '--mood-color': mood.color } as React.CSSProperties}>
                        <button
                          className={`${styles.moodBtn} ${isActive ? styles.moodBtnActive : ''}`}
                          onClick={() => applyMood(mood)}
                          disabled={count === 0}
                        >
                          <span className={styles.moodEmoji}>{mood.emoji}</span>
                          <span className={styles.moodName}>{mood.name.split(' ')[0]}</span>
                          <span className={styles.moodCount}>{count}</span>
                        </button>
                        {count > 0 && (
                          <button
                            className={styles.moodSave}
                            onClick={() => autoOrganizeByMood(mood)}
                            disabled={organizing}
                            title={`Create "${mood.name}" playlist`}
                          >
                            +
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {hasActiveFilter && (
                <button className={`btn btn-ghost btn-sm ${styles.clearFilter}`} onClick={clearFilters}>
                  ✕ Clear filters
                </button>
              )}
            </div>

            {/* ── Track list ─── */}
            <div className={styles.tracksPanel}>
              <div className={styles.trackControls}>
                <div className={styles.searchWrapper}>
                  <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input id="track-search" className={`input ${styles.searchInput}`} placeholder="Search tracks, artists, albums..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  {searchQuery && <button className={styles.clearSearch} onClick={() => setSearchQuery('')}>✕</button>}
                </div>
                <div className={styles.trackMeta}>
                  <span className={styles.trackCount}>
                    {filteredTracks.length} of {enrichedTracks.length} tracks
                    {selectedTrackIds.size > 0 && ` · ${selectedTrackIds.size} selected`}
                    {hasActiveFilter && ` · filtered`}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {hasActiveFilter && filteredTracks.length > 0 && (
                      <button className="btn btn-primary btn-sm" onClick={openOrganize}>+ Save {filteredTracks.length} tracks</button>
                    )}
                    {selectedTrackIds.size > 0 && (
                      <button className="btn btn-sm" style={{ background: '#ef4444', color: 'white' }} onClick={removeSelected}>
                        🗑️ Remove {selectedTrackIds.size}
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={selectAll}>
                      {selectedTrackIds.size === filteredTracks.length && filteredTracks.length > 0 ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.trackList}>
                {filteredTracks.length === 0 ? (
                  <div className={styles.noTracks}>
                    <div style={{ fontSize: 32 }}>🎵</div>
                    <div>No tracks match your filter</div>
                    <button className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear filters</button>
                  </div>
                ) : (
                  filteredTracks.map((et, idx) => {
                    const { track, features, genre } = et;
                    const isSelected = selectedTrackIds.has(track.id);
                    const isPlaying = nowPlaying.trackId === track.id && nowPlaying.isPlaying;
                    const isDragOver = dragOverIdx === idx;
                    const art = track.album.images?.[1]?.url ?? track.album.images?.[0]?.url ?? '';

                    return (
                      <div
                        key={`${track.id}-${idx}`}
                        className={`${styles.trackRow} ${isSelected ? styles.trackRowSelected : ''} ${isDragOver ? styles.trackRowDragOver : ''}`}
                        draggable
                        onDragStart={() => handleDragStart(et)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={(e) => handleDrop(e, idx)}
                        onDragEnd={handleDragEnd}
                        onClick={() => toggleTrackSel(track.id)}
                      >
                        <div className={styles.dragHandle} title="Drag to reorder">⠿</div>

                        <div className={styles.trackCheck}>
                          <div className={`${styles.checkbox} ${isSelected ? styles.checkboxChecked : ''}`}>
                            {isSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                          </div>
                        </div>

                        <div className={styles.trackCover}>
                          {art ? <img src={art} alt="" /> : <span>🎵</span>}
                          {track.preview_url && (
                            <button
                              className={`${styles.previewBtn} ${isPlaying ? styles.previewBtnPlaying : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTrack({ id: track.id, name: track.name, artist: track.artists.map(a => a.name).join(', '), albumArt: art || null, previewUrl: track.preview_url });
                              }}
                            >
                              {isPlaying
                                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                                : <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>}
                            </button>
                          )}
                          {isPlaying && <div className={styles.playingDot} />}
                        </div>

                        <div className={styles.trackInfo}>
                          <div className={`${styles.trackName} ${isPlaying ? styles.trackNamePlaying : ''}`}>{track.name}</div>
                          <div className={styles.trackArtist}>{track.artists.map((a) => a.name).join(', ')}</div>
                        </div>

                        <div className={styles.trackGenre}>
                          <span className="genre-chip" style={{ backgroundColor: genre.color + '20', color: genre.color, borderColor: genre.color + '40' }}>
                            {genre.emoji} {genre.name}
                          </span>
                        </div>

                        {features && (
                          <div className={styles.trackFeatures}>
                            {[
                              { label: 'Energy', val: features.energy, color: '#f97316' },
                              { label: 'Dance', val: features.danceability, color: '#a78bfa' },
                              { label: 'Mood', val: features.valence, color: '#1DB954' },
                            ].map(({ label, val, color }) => (
                              <div key={label} className={styles.featureRow}>
                                <span className={styles.featureLabel}>{label}</span>
                                <div className="feature-bar-track" style={{ width: '56px' }}>
                                  <div className="feature-bar-fill" style={{ width: `${val * 100}%`, background: color }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className={styles.trackDuration}>
                          <div>{formatDuration(track.duration_ms)}</div>
                          {features && <div className={styles.moodLabel}>{getMoodLabel(features)}</div>}
                        </div>

                        <button
                          className={styles.trackDeleteBtn}
                          onClick={(e) => removeTrack(track.id, e)}
                          title="Remove from playlist"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                          </svg>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Create Playlist Modal ── */}
      {showOrganizeModal && (
        <div className="modal-overlay" onClick={() => setShowOrganizeModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 22, marginBottom: 8 }}>Create New Playlist</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
              {selectedTrackIds.size > 0 ? `Adding ${selectedTrackIds.size} selected tracks` : `Adding all ${filteredTracks.length} filtered tracks`}
            </p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>Playlist Name</label>
              <input id="new-playlist-name" className="input" value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} placeholder="Name your playlist..." autoFocus onKeyDown={(e) => e.key === 'Enter' && createFromSelected()} />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowOrganizeModal(false)}>Cancel</button>
              <button id="create-playlist-btn" className="btn btn-primary" onClick={createFromSelected} disabled={organizing || !newPlaylistName.trim()}>
                {organizing ? 'Creating...' : '+ Create Playlist'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Merge Modal ── */}
      {showMergeModal && user && (
        <MergeModal
          playlists={playlists}
          user={user}
          onClose={() => setShowMergeModal(false)}
          onSuccess={(msg) => { showToast(msg, 'success'); fetchPlaylists(); }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}

      {/* ── Duplicate Finder ── */}
      {showDupFinder && selectedPlaylist && user && (
        <DuplicateFinder
          tracks={enrichedTracks}
          playlist={selectedPlaylist}
          user={user}
          onClose={() => setShowDupFinder(false)}
          onSuccess={(msg) => { showToast(msg, 'success'); selectedPlaylist && selectPlaylist(selectedPlaylist); }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}

      {/* ── Toasts ── */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
            onClick={() => {
              if (t.message.includes('undo') && (window as any).__moodifyUndo) {
                (window as any).__moodifyUndo();
              }
            }}
            style={t.message.includes('undo') ? { cursor: 'pointer' } : undefined}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* ── AI Playlist Chat ── */}
      {user && (
        <AIPlaylistChat
          user={user}
          onPlaylistCreated={(msg) => { showToast(msg, 'success'); fetchPlaylists(); }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}

      {sidebarOpen && <div className={styles.mobileOverlay} onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}
