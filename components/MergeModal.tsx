'use client';
import { useState } from 'react';
import { SpotifyUser, SpotifyPlaylist, createPlaylist, addTracksToPlaylist, getPlaylistTracks } from '@/lib/spotify';
import styles from './MergeModal.module.css';

interface Props {
  playlists: SpotifyPlaylist[];
  user: SpotifyUser;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export default function MergeModal({ playlists, user, onClose, onSuccess, onError }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [merging, setMerging] = useState(false);
  const [progress, setProgress] = useState('');

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalTracks = playlists
    .filter((p) => selected.has(p.id))
    .reduce((sum, p) => sum + p.tracks.total, 0);

  const handleMerge = async () => {
    if (selected.size < 2 || !name.trim()) return;
    setMerging(true);
    try {
      const chosenPlaylists = playlists.filter((p) => selected.has(p.id));
      const allUris: string[] = [];
      const seen = new Set<string>();

      for (const pl of chosenPlaylists) {
        setProgress(`Loading "${pl.name}"...`);
        const items = await getPlaylistTracks(pl.id);
        for (const item of items) {
          const uri = `spotify:track:${item.track.id}`;
          if (!seen.has(uri)) { seen.add(uri); allUris.push(uri); }
        }
      }

      setProgress('Creating merged playlist...');
      const newPl = await createPlaylist(user.id, name.trim(), `Merged ${selected.size} playlists by Moodify`);
      await addTracksToPlaylist(newPl.id, allUris);
      onSuccess(`✅ "${name}" created with ${allUris.length} unique tracks!`);
      onClose();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Merge failed');
    } finally {
      setMerging(false);
      setProgress('');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 22, marginBottom: 4 }}>🔀 Merge Playlists</h3>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
          Select 2+ playlists to combine. Duplicates are removed automatically.
        </p>

        <div className={styles.playlistGrid}>
          {playlists.map((pl) => (
            <button
              key={pl.id}
              className={`${styles.plItem} ${selected.has(pl.id) ? styles.plItemSelected : ''}`}
              onClick={() => toggle(pl.id)}
            >
              <div className={styles.plThumb}>
                {pl.images?.[0]?.url ? <img src={pl.images[0].url} alt="" /> : <span>🎵</span>}
                {selected.has(pl.id) && <div className={styles.checkOverlay}>✓</div>}
              </div>
              <div className={styles.plName}>{pl.name}</div>
              <div className={styles.plCount}>{pl.tracks.total} tracks</div>
            </button>
          ))}
        </div>

        {selected.size >= 2 && (
          <div className={styles.nameSection}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              New Playlist Name
            </label>
            <input
              className="input"
              placeholder={`${[...selected].length} Playlists Merged`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              ~{totalTracks} tracks (duplicates removed)
            </div>
          </div>
        )}

        {merging && progress && (
          <div className={styles.progressMsg}>{progress}</div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={merging}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleMerge}
            disabled={selected.size < 2 || !name.trim() || merging}
          >
            {merging ? 'Merging...' : `🔀 Merge ${selected.size} Playlists`}
          </button>
        </div>
      </div>
    </div>
  );
}
