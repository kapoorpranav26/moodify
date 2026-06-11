import { AudioFeatures, SpotifyArtist, SpotifyTrack } from './spotify';

export interface GenreInfo {
  name: string;
  color: string;
  emoji: string;
  keywords: string[];
}

export const GENRE_MAP: GenreInfo[] = [
  { name: 'Indie Pop', color: '#f472b6', emoji: '🎸', keywords: ['indie pop', 'indie', 'indie rock', 'dream pop', 'shoegaze', 'lo-fi indie'] },
  { name: 'Hip Hop', color: '#f97316', emoji: '🎤', keywords: ['hip hop', 'rap', 'trap', 'drill', 'conscious hip hop', 'boom bap', 'cloud rap', 'emo rap'] },
  { name: 'Electronic', color: '#38bdf8', emoji: '⚡', keywords: ['electronic', 'electro', 'edm', 'techno', 'house', 'trance', 'dubstep', 'drum and bass', 'future bass', 'synthwave', 'electropop'] },
  { name: 'R&B / Soul', color: '#a78bfa', emoji: '🎶', keywords: ['r&b', 'soul', 'neo soul', 'contemporary r&b', 'funk', 'motown', 'urban contemporary'] },
  { name: 'Pop', color: '#fb7185', emoji: '✨', keywords: ['pop', 'teen pop', 'dance pop', 'synth-pop', 'chamber pop', 'art pop', 'k-pop', 'j-pop'] },
  { name: 'Rock', color: '#f59e0b', emoji: '🎵', keywords: ['rock', 'alternative rock', 'classic rock', 'punk', 'hard rock', 'garage rock', 'post-punk', 'emo'] },
  { name: 'Jazz', color: '#6ee7b7', emoji: '🎷', keywords: ['jazz', 'bebop', 'smooth jazz', 'jazz fusion', 'bossa nova', 'swing', 'cool jazz'] },
  { name: 'Classical', color: '#c4b5fd', emoji: '🎻', keywords: ['classical', 'orchestral', 'baroque', 'opera', 'chamber music', 'piano', 'symphony'] },
  { name: 'Lo-Fi', color: '#86efac', emoji: '☕', keywords: ['lo-fi', 'lofi', 'chillhop', 'lo-fi beats', 'lo-fi hip hop', 'ambient', 'downtempo'] },
  { name: 'Latin', color: '#fde68a', emoji: '💃', keywords: ['latin', 'reggaeton', 'salsa', 'cumbia', 'bachata', 'merengue', 'latin pop', 'afrobeats'] },
  { name: 'Metal', color: '#94a3b8', emoji: '🤘', keywords: ['metal', 'heavy metal', 'death metal', 'black metal', 'metalcore', 'thrash metal', 'doom metal'] },
  { name: 'Folk / Country', color: '#d97706', emoji: '🪕', keywords: ['folk', 'country', 'americana', 'bluegrass', 'singer-songwriter', 'acoustic', 'indie folk'] },
];

export const UNKNOWN_GENRE: GenreInfo = {
  name: 'Other',
  color: '#64748b',
  emoji: '🎵',
  keywords: [],
};

export function detectGenre(artistGenres: string[]): GenreInfo {
  const lowerGenres = artistGenres.map((g) => g.toLowerCase());

  for (const genre of GENRE_MAP) {
    for (const keyword of genre.keywords) {
      if (lowerGenres.some((g) => g.includes(keyword))) {
        return genre;
      }
    }
  }

  return UNKNOWN_GENRE;
}

export function detectGenreFromFeatures(features: AudioFeatures): GenreInfo {
  const { energy, danceability, acousticness, instrumentalness, speechiness, valence } = features;

  if (speechiness > 0.6) return GENRE_MAP.find((g) => g.name === 'Hip Hop')!;
  if (instrumentalness > 0.6 && energy < 0.4) return GENRE_MAP.find((g) => g.name === 'Classical')!;
  if (instrumentalness > 0.5 && energy < 0.6) return GENRE_MAP.find((g) => g.name === 'Lo-Fi')!;
  if (energy > 0.8 && danceability > 0.7) return GENRE_MAP.find((g) => g.name === 'Electronic')!;
  if (acousticness > 0.7) return GENRE_MAP.find((g) => g.name === 'Folk / Country')!;
  if (energy > 0.7 && valence < 0.4) return GENRE_MAP.find((g) => g.name === 'Rock')!;
  if (danceability > 0.75 && valence > 0.6) return GENRE_MAP.find((g) => g.name === 'Pop')!;

  return UNKNOWN_GENRE;
}

export interface EnrichedTrack {
  track: SpotifyTrack;
  features?: AudioFeatures;
  genre: GenreInfo;
  artistGenres: string[];
}

export function enrichTracks(
  tracks: SpotifyTrack[],
  featuresMap: Map<string, AudioFeatures>,
  artistsMap: Map<string, SpotifyArtist>
): EnrichedTrack[] {
  return tracks.map((track) => {
    const artistGenres = track.artists.flatMap((a) => artistsMap.get(a.id)?.genres ?? []);
    const features = featuresMap.get(track.id);

    let genre: GenreInfo;
    if (artistGenres.length > 0) {
      genre = detectGenre(artistGenres);
      if (genre.name === 'Other' && features) genre = detectGenreFromFeatures(features);
    } else if (features) {
      genre = detectGenreFromFeatures(features);
    } else {
      genre = UNKNOWN_GENRE;
    }

    return { track, features, genre, artistGenres };
  });
}

export function groupByGenre(enrichedTracks: EnrichedTrack[]): Map<string, EnrichedTrack[]> {
  const map = new Map<string, EnrichedTrack[]>();
  for (const et of enrichedTracks) {
    const key = et.genre.name;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(et);
  }
  return map;
}

export function getMoodLabel(features: AudioFeatures): string {
  const { valence, energy } = features;
  if (valence > 0.7 && energy > 0.7) return 'Euphoric';
  if (valence > 0.7 && energy < 0.4) return 'Peaceful';
  if (valence < 0.3 && energy > 0.7) return 'Intense';
  if (valence < 0.3 && energy < 0.4) return 'Melancholic';
  if (energy > 0.7) return 'Energetic';
  if (energy < 0.3) return 'Chill';
  return 'Balanced';
}

export function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
