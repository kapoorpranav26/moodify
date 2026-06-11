'use client';
import { useAudio } from '@/lib/AudioProvider';
import styles from './NowPlayingBar.module.css';

export default function NowPlayingBar() {
  const { audio, pauseTrack, playTrack } = useAudio();
  if (!audio.trackId) return null;

  const handleToggle = () => {
    if (audio.isPlaying) {
      pauseTrack();
    } else if (audio.previewUrl) {
      playTrack({
        id: audio.trackId!,
        name: audio.trackName!,
        artist: audio.artistName!,
        albumArt: audio.albumArt,
        previewUrl: audio.previewUrl,
      });
    }
  };

  return (
    <div className={styles.bar}>
      {/* Progress bar */}
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${audio.progress * 100}%` }} />
      </div>

      <div className={styles.inner}>
        {/* Track info */}
        <div className={styles.trackInfo}>
          <div className={styles.albumArt}>
            {audio.albumArt
              ? <img src={audio.albumArt} alt="" />
              : <span>🎵</span>}
            {audio.isPlaying && (
              <div className={styles.visualizer}>
                {[1,2,3,4].map(i => <div key={i} className={styles.vizBar} style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            )}
          </div>
          <div className={styles.meta}>
            <div className={styles.trackName}>{audio.trackName}</div>
            <div className={styles.artistName}>{audio.artistName}</div>
          </div>
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <div className={styles.previewBadge}>30s Preview</div>
          <button className={styles.playBtn} onClick={handleToggle} id="now-playing-toggle">
            {audio.isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
            )}
          </button>
          <button className={styles.closeBtn} onClick={pauseTrack} title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
