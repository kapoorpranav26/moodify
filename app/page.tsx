'use client';
import { useEffect, useState } from 'react';
import { getAuthUrl } from '@/lib/auth';
import styles from './landing.module.css';

const GENRES = [
  { label: 'Indie Pop', color: '#f472b6', emoji: '🎸' },
  { label: 'Hip Hop', color: '#f97316', emoji: '🎤' },
  { label: 'Electronic', color: '#38bdf8', emoji: '⚡' },
  { label: 'R&B / Soul', color: '#a78bfa', emoji: '🎶' },
  { label: 'Lo-Fi', color: '#86efac', emoji: '☕' },
  { label: 'Pop', color: '#fb7185', emoji: '✨' },
  { label: 'Rock', color: '#f59e0b', emoji: '🎵' },
  { label: 'Jazz', color: '#6ee7b7', emoji: '🎷' },
  { label: 'Latin', color: '#fde68a', emoji: '💃' },
  { label: 'Classical', color: '#c4b5fd', emoji: '🎻' },
  { label: 'Metal', color: '#94a3b8', emoji: '🤘' },
  { label: 'Folk', color: '#d97706', emoji: '🪕' },
];

const BARS = Array.from({ length: 40 }, (_, i) => i);

export default function LandingPage() {
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // If already logged in redirect to dashboard
    const token = localStorage.getItem('spotify_access_token');
    const expiresAt = localStorage.getItem('spotify_expires_at');
    if (token && expiresAt && Date.now() < parseInt(expiresAt) - 60000) {
      window.location.href = '/dashboard';
    }
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const url = await getAuthUrl();
      window.location.href = url;
    } catch {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <main className={styles.main}>
      {/* Animated Background */}
      <div className={styles.bgGradient} />
      <div className={styles.bgGrid} />

      {/* Waveform Animation */}
      <div className={styles.waveform} aria-hidden="true">
        {BARS.map((i) => (
          <div
            key={i}
            className={styles.waveBar}
            style={{ animationDelay: `${(i * 0.08) % 2}s`, animationDuration: `${0.8 + (i % 5) * 0.2}s` }}
          />
        ))}
      </div>

      {/* Floating Genre Chips */}
      <div className={styles.floatingChips} aria-hidden="true">
        {GENRES.map((g, i) => (
          <div
            key={g.label}
            className={styles.floatingChip}
            style={{
              top: `${10 + (i * 7.5) % 80}%`,
              left: `${(i % 2 === 0 ? 3 : 88) + (i * 2) % 6}%`,
              animationDelay: `${i * 0.4}s`,
              borderColor: g.color + '40',
              color: g.color,
              backgroundColor: g.color + '15',
            }}
          >
            {g.emoji} {g.label}
          </div>
        ))}
      </div>

      {/* Glowing Orbs */}
      <div className={styles.orb1} aria-hidden="true" />
      <div className={styles.orb2} aria-hidden="true" />
      <div className={styles.orb3} aria-hidden="true" />

      {/* Content */}
      <div className={styles.content}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="currentColor"/>
            </svg>
          </div>
          <span className={styles.logoText}>Moodify</span>
        </div>

        {/* Headline */}
        <div className={styles.hero}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            AI-Powered Playlist Intelligence
          </div>
          <h1 className={styles.headline}>
            Your Music.<br />
            <span className={styles.headlineGreen}>Perfectly Organized.</span>
          </h1>
          <p className={styles.subheadline}>
            Connect your Spotify account and let Moodify analyze your entire music library.
            Auto-sort playlists by genre, mood, and vibe — indie pop, hip hop, electro pop & beyond.
          </p>
        </div>

        {/* CTA */}
        <div className={styles.cta}>
          <button
            id="spotify-login-btn"
            className={`${styles.spotifyBtn} ${loading ? styles.loading : ''}`}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className={styles.spinner} />
                Connecting...
              </>
            ) : (
              <>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                Connect with Spotify
              </>
            )}
          </button>
          <p className={styles.disclaimer}>Free to use • No credit card required</p>
        </div>

        {/* Feature Pills */}
        <div className={styles.features}>
          {[
            { icon: '🎯', text: 'Smart Genre Detection' },
            { icon: '⚡', text: 'Auto-Organize in 1 Click' },
            { icon: '🎵', text: 'Mood & Energy Analysis' },
            { icon: '🌍', text: 'Works with Any Account' },
          ].map((f) => (
            <div key={f.text} className={styles.featurePill}>
              <span>{f.icon}</span> {f.text}
            </div>
          ))}
        </div>
      </div>

      {/* Scroll hint */}
      <div className={styles.scrollHint}>
        <div className={styles.scrollDot} />
      </div>
    </main>
  );
}
