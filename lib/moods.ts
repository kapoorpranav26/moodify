import { AudioFeatures, SpotifyTrack } from './spotify';
import { EnrichedTrack } from './genres';

export interface MoodPreset {
  name: string;
  emoji: string;
  description: string;
  color: string;
  filter: (et: EnrichedTrack) => boolean;
  playlistDesc: string;
}

export const MOOD_PRESETS: MoodPreset[] = [
  {
    name: 'Late Night 🌙',
    emoji: '🌙',
    description: 'Low energy, moody, atmospheric',
    color: '#6366f1',
    playlistDesc: 'Your late-night, atmospheric vibes — organized by Moodify',
    filter: ({ features, genre, track }) => {
      if (features) return features.energy < 0.45 && features.valence < 0.5 && features.acousticness > 0.2;
      const combined = `${track.name} ${genre.name}`.toLowerCase();
      return ['r&b', 'lo-fi', 'jazz', 'night', 'sleep', 'late', 'moon'].some(k => combined.includes(k));
    },
  },
  {
    name: 'Workout 💪',
    emoji: '💪',
    description: 'High energy, fast tempo, pumped',
    color: '#ef4444',
    playlistDesc: 'Your ultimate workout fuel — organized by Moodify',
    filter: ({ features, genre, track }) => {
      if (features) return features.energy > 0.75 && features.tempo > 120 && features.danceability > 0.55;
      const combined = `${track.name} ${genre.name}`.toLowerCase();
      return ['workout', 'gym', 'pump', 'hip hop', 'metal', 'electronic', 'edm', 'drill', 'hype'].some(k => combined.includes(k));
    },
  },
  {
    name: 'Chill ☕',
    emoji: '☕',
    description: 'Relaxed, balanced, easygoing',
    color: '#86efac',
    playlistDesc: 'Your perfect chill-out session — organized by Moodify',
    filter: ({ features, genre, track }) => {
      if (features) return features.energy < 0.55 && features.valence > 0.4 && features.acousticness > 0.25;
      const combined = `${track.name} ${genre.name}`.toLowerCase();
      return ['chill', 'relax', 'lo-fi', 'acoustic', 'folk', 'breeze', 'vibe'].some(k => combined.includes(k));
    },
  },
  {
    name: 'Happy ✨',
    emoji: '✨',
    description: 'Uplifting, positive, feel-good',
    color: '#fde68a',
    playlistDesc: 'Pure good vibes — organized by Moodify',
    filter: ({ features, genre, track }) => {
      if (features) return features.valence > 0.7 && features.energy > 0.5;
      const combined = `${track.name} ${genre.name}`.toLowerCase();
      return ['happy', 'pop', 'joy', 'sun', 'good', 'smile', 'bollywood', 'latin'].some(k => combined.includes(k));
    },
  },
  {
    name: 'Focus 🎯',
    emoji: '🎯',
    description: 'Instrumental, steady, minimal vocals',
    color: '#38bdf8',
    playlistDesc: 'Deep focus mode — organized by Moodify',
    filter: ({ features, genre, track }) => {
      if (features) return features.instrumentalness > 0.3 && features.speechiness < 0.1 && features.energy < 0.65;
      const combined = `${track.name} ${genre.name}`.toLowerCase();
      return ['focus', 'study', 'classical', 'jazz', 'lo-fi', 'instrumental', 'piano'].some(k => combined.includes(k));
    },
  },
  {
    name: 'Dance Party 🕺',
    emoji: '🕺',
    description: 'High danceability, upbeat, groovy',
    color: '#f472b6',
    playlistDesc: 'Dance floor-ready bangers — organized by Moodify',
    filter: ({ features, genre, track }) => {
      if (features) return features.danceability > 0.75 && features.energy > 0.6;
      const combined = `${track.name} ${genre.name}`.toLowerCase();
      return ['dance', 'party', 'club', 'electronic', 'edm', 'reggaeton', 'latin', 'pop'].some(k => combined.includes(k));
    },
  },
  {
    name: 'Sad Hours 😢',
    emoji: '😢',
    description: 'Melancholic, low valence, introspective',
    color: '#a78bfa',
    playlistDesc: 'For when the feels hit — organized by Moodify',
    filter: ({ features, genre, track }) => {
      if (features) return features.valence < 0.3 && features.energy < 0.5;
      const combined = `${track.name} ${genre.name}`.toLowerCase();
      return ['sad', 'cry', 'tears', 'broken', 'heart', 'miss', 'lonely', 'acoustic', 'indie'].some(k => combined.includes(k));
    },
  },
  {
    name: 'Road Trip 🚗',
    emoji: '🚗',
    description: 'Mid-energy, fun, singalong-worthy',
    color: '#f97316',
    playlistDesc: 'Windows down, music up — organized by Moodify',
    filter: ({ features, genre, track }) => {
      if (features) return features.energy > 0.55 && features.valence > 0.55 && features.danceability > 0.55;
      const combined = `${track.name} ${genre.name}`.toLowerCase();
      return ['road', 'drive', 'trip', 'highway', 'summer', 'pop', 'rock', 'country', 'indie'].some(k => combined.includes(k));
    },
  },
];

export function getRecommendationSeeds(tracks: EnrichedTrack[]): { trackIds: string[]; artistIds: string[] } {
  // Pick top 5 seeds by genre diversity
  const seen = new Set<string>();
  const trackIds: string[] = [];
  const artistIds: string[] = [];

  for (const et of tracks) {
    if (trackIds.length >= 2) break;
    if (!seen.has(et.track.id)) { seen.add(et.track.id); trackIds.push(et.track.id); }
  }
  for (const et of tracks.slice(0, 20)) {
    if (artistIds.length >= 2) break;
    const id = et.track.artists[0]?.id;
    if (id && !seen.has(id)) { seen.add(id); artistIds.push(id); }
  }

  return { trackIds, artistIds };
}
