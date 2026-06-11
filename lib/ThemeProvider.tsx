'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeCtx = createContext<ThemeContextType>({ theme: 'dark', toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('moodify_theme') as Theme | null;
    if (saved) { setTheme(saved); applyTheme(saved); }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('moodify_theme', next);
      applyTheme(next);
      return next;
    });
  };

  return <ThemeCtx.Provider value={{ theme, toggleTheme }}>{children}</ThemeCtx.Provider>;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.style.setProperty('--bg-base', '#f0f2f8');
    root.style.setProperty('--bg-surface', '#ffffff');
    root.style.setProperty('--bg-elevated', '#f8f9fc');
    root.style.setProperty('--bg-card', 'rgba(0,0,0,0.04)');
    root.style.setProperty('--bg-card-hover', 'rgba(0,0,0,0.07)');
    root.style.setProperty('--border', 'rgba(0,0,0,0.08)');
    root.style.setProperty('--border-hover', 'rgba(0,0,0,0.16)');
    root.style.setProperty('--text-primary', '#0a0a14');
    root.style.setProperty('--text-secondary', 'rgba(0,0,0,0.6)');
    root.style.setProperty('--text-muted', 'rgba(0,0,0,0.38)');
  } else {
    root.style.setProperty('--bg-base', '#080810');
    root.style.setProperty('--bg-surface', '#0e0e1a');
    root.style.setProperty('--bg-elevated', '#141428');
    root.style.setProperty('--bg-card', 'rgba(255,255,255,0.04)');
    root.style.setProperty('--bg-card-hover', 'rgba(255,255,255,0.07)');
    root.style.setProperty('--border', 'rgba(255,255,255,0.08)');
    root.style.setProperty('--border-hover', 'rgba(255,255,255,0.16)');
    root.style.setProperty('--text-primary', '#ffffff');
    root.style.setProperty('--text-secondary', 'rgba(255,255,255,0.6)');
    root.style.setProperty('--text-muted', 'rgba(255,255,255,0.35)');
  }
}

export function useTheme() { return useContext(ThemeCtx); }
