'use client';
import { useState, useMemo } from 'react';
import { EnrichedTrack, formatDuration } from '@/lib/genres';
import { SpotifyUser, SpotifyPlaylist, createPlaylist, addTracksToPlaylist, removeTracksFromPlaylist } from '@/lib/spotify';
import styles from './DuplicateFinder.module.css';

interface Props {
  tracks: EnrichedTrack[];
  playlist: SpotifyPlaylist;
  user: SpotifyUser;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

interface DupGroup {
  name: string;
  artist: string;
  tracks: EnrichedTrack[];
}

export default function DuplicateFinder({ tracks, playlist, user, onClose, onSuccess, onError }: Props) {
  const [removing, setRemoving] = useState(false);
  const [selectedDups, setSelectedDups] = useState<Set<string>>(new Set());

  const dupGroups = useMemo<DupGroup[]>(() => {
    const map = new Map<string, EnrichedTrack[]>();
    for (const et of tracks) {
      const key = `${et.track.name.toLowerCase()}:::${et.track.artists[0]?.name.toLowerCase()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(et);
    }
    return [...map.entries()]
      .filter(([, group]) => group.length > 1)
      .map(([, group]) => ({
        name: group[0].track.name,
        artist: group[0].track.artists.map((a) => a.name).join(', '),
        tracks: group,
      }));
  }, [tracks]);

  const totalDups = dupGroups.reduce((sum, g) => sum + g.tracks.length - 1, 0);

  const toggleDup = (trackId: string) => {
    setSelectedDups((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  };

  const autoSelectDups = () => {
    const ids = new Set<string>();
    dupGroups.forEach((g) => {
      // Keep first, mark rest as duplicate
      g.tracks.slice(1).forEach((et) => ids.add(et.track.id));
    });
    setSelectedDups(ids);
  };

  const removeDuplicates = async () => {
    if (selectedDups.size === 0) return;
    setRemoving(true);
    try {
      const uris = [...selectedDups].map((id) => `spotify:track:${id}`);
      await removeTracksFromPlaylist(playlist.id, uris);
      onSuccess(`✅ Removed ${uris.length} duplicate tracks!`);
      onClose();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Remove failed');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 22, marginBottom: 4 }}>🔍 Duplicate Finder</h3>

        {dupGroups.length === 0 ? (
          <div className={styles.clean}>
            <div style={{ fontSize: 48 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>No duplicates found!</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>This playlist is clean.</p>
            <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
              Found <strong style={{ color: '#ef4444' }}>{totalDups} duplicate{totalDups !== 1 ? 's' : ''}</strong> across {dupGroups.length} tracks.
            </p>

            <button className={`btn btn-secondary btn-sm ${styles.autoBtn}`} onClick={autoSelectDups}>
              Auto-select duplicates
            </button>

            <div className={styles.groups}>
              {dupGroups.map((group) => (
                <div key={group.name + group.artist} className={styles.group}>
                  <div className={styles.groupHeader}>
                    <span className={styles.groupTitle}>{group.name}</span>
                    <span className={styles.groupArtist}>{group.artist}</span>
                    <span className={styles.groupBadge}>{group.tracks.length}×</span>
                  </div>
                  <div className={styles.groupTracks}>
                    {group.tracks.map((et, i) => {
                      const isSelected = selectedDups.has(et.track.id);
                      return (
                        <label key={`${et.track.id}-${i}`} className={`${styles.dupTrack} ${isSelected ? styles.dupSelected : ''}`}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleDup(et.track.id)}
                            style={{ display: 'none' }}
                          />
                          <div className={`${styles.dupCheck} ${isSelected ? styles.dupCheckOn : ''}`}>
                            {isSelected && '✓'}
                          </div>
                          <img
                            src={et.track.album.images?.[2]?.url ?? et.track.album.images?.[0]?.url ?? ''}
                            alt=""
                            className={styles.dupArt}
                          />
                          <div className={styles.dupInfo}>
                            <div className={styles.dupAlbum}>{et.track.album.name}</div>
                            <div className={styles.dupDuration}>{formatDuration(et.track.duration_ms)}</div>
                          </div>
                          {i === 0 && <span className={styles.keepBadge}>Keep</span>}
                          {isSelected && <span className={styles.removeBadge}>Remove</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={onClose} disabled={removing}>Cancel</button>
              <button
                className="btn btn-primary"
                style={{ background: selectedDups.size > 0 ? '#ef4444' : undefined, boxShadow: selectedDups.size > 0 ? '0 0 20px rgba(239,68,68,0.3)' : undefined }}
                onClick={removeDuplicates}
                disabled={selectedDups.size === 0 || removing}
              >
                {removing ? 'Removing...' : `🗑 Remove ${selectedDups.size} Selected`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
