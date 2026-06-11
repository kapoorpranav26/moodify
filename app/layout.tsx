import type { Metadata } from 'next';
import './globals.css';
import { AudioProvider } from '@/lib/AudioProvider';
import { ThemeProvider } from '@/lib/ThemeProvider';
import NowPlayingBar from '@/components/NowPlayingBar';

export const metadata: Metadata = {
  title: 'Moodify — Smart Spotify Playlist Organizer',
  description:
    'Connect your Spotify account and let Moodify analyze your music taste. Auto-organize playlists by genre — indie pop, hip hop, electro pop, lo-fi & more.',
  keywords: 'Spotify, playlist organizer, music genre, indie pop, hip hop, electro pop, lo-fi',
  openGraph: {
    title: 'Moodify — Smart Spotify Playlist Organizer',
    description: 'Auto-organize your Spotify playlists by genre and mood.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <AudioProvider>
            {children}
            <NowPlayingBar />
          </AudioProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
