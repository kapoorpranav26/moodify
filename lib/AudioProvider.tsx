'use client';
import { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react';

interface AudioState {
  trackId: string | null;
  trackName: string | null;
  artistName: string | null;
  albumArt: string | null;
  previewUrl: string | null;
  isPlaying: boolean;
  progress: number; // 0-1
  duration: number; // seconds
}

interface AudioContextType {
  audio: AudioState;
  playTrack: (track: { id: string; name: string; artist: string; albumArt: string | null; previewUrl: string | null }) => void;
  pauseTrack: () => void;
  toggleTrack: (track: { id: string; name: string; artist: string; albumArt: string | null; previewUrl: string | null }) => void;
}

const AudioCtx = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [audio, setAudio] = useState<AudioState>({
    trackId: null, trackName: null, artistName: null,
    albumArt: null, previewUrl: null, isPlaying: false, progress: 0, duration: 30,
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopCurrent = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const playTrack = useCallback((track: { id: string; name: string; artist: string; albumArt: string | null; previewUrl: string | null }) => {
    if (!track.previewUrl) return;
    stopCurrent();

    const el = new Audio(track.previewUrl);
    audioRef.current = el;

    setAudio({ trackId: track.id, trackName: track.name, artistName: track.artist,
      albumArt: track.albumArt, previewUrl: track.previewUrl, isPlaying: true, progress: 0, duration: 30 });

    el.play().catch(() => {});

    intervalRef.current = setInterval(() => {
      setAudio((prev) => ({ ...prev, progress: el.currentTime / (el.duration || 30) }));
    }, 250);

    el.onended = () => {
      setAudio((prev) => ({ ...prev, isPlaying: false, progress: 0 }));
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [stopCurrent]);

  const pauseTrack = useCallback(() => {
    audioRef.current?.pause();
    setAudio((prev) => ({ ...prev, isPlaying: false }));
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const toggleTrack = useCallback((track: { id: string; name: string; artist: string; albumArt: string | null; previewUrl: string | null }) => {
    if (audio.trackId === track.id && audio.isPlaying) {
      pauseTrack();
    } else {
      playTrack(track);
    }
  }, [audio.trackId, audio.isPlaying, playTrack, pauseTrack]);

  return (
    <AudioCtx.Provider value={{ audio, playTrack, pauseTrack, toggleTrack }}>
      {children}
    </AudioCtx.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error('useAudio must be inside AudioProvider');
  return ctx;
}
