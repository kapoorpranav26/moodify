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
  { name: 'Punjabi', color: '#fb923c', emoji: '🪘', keywords: ['punjabi', 'punjabi pop', 'punjabi hip hop', 'bhangra', 'desi hip hop'] },
  { name: 'Bollywood', color: '#ec4899', emoji: '🎬', keywords: ['bollywood', 'filmi', 'desi pop', 'indian pop'] },
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

// ─── Name-Based Genre Detection (fallback when API data unavailable) ────────
const ARTIST_GENRE_MAP: Record<string, string> = {
  // Hip Hop / Rap
  'drake': 'Hip Hop', 'kendrick lamar': 'Hip Hop', 'j. cole': 'Hip Hop', 'kanye west': 'Hip Hop',
  'travis scott': 'Hip Hop', 'future': 'Hip Hop', 'lil baby': 'Hip Hop', 'lil uzi vert': 'Hip Hop',
  'lil wayne': 'Hip Hop', 'nicki minaj': 'Hip Hop', 'cardi b': 'Hip Hop', 'megan thee stallion': 'Hip Hop',
  'eminem': 'Hip Hop', 'jay-z': 'Hip Hop', 'nas': 'Hip Hop', '21 savage': 'Hip Hop',
  'metro boomin': 'Hip Hop', 'jack harlow': 'Hip Hop', 'playboi carti': 'Hip Hop', 'young thug': 'Hip Hop',
  'a$ap rocky': 'Hip Hop', 'tyler, the creator': 'Hip Hop', 'mac miller': 'Hip Hop', 'post malone': 'Hip Hop',
  'juice wrld': 'Hip Hop', 'xxxtentacion': 'Hip Hop', 'pop smoke': 'Hip Hop', 'roddy ricch': 'Hip Hop',
  'gunna': 'Hip Hop', 'don toliver': 'Hip Hop', 'dababy': 'Hip Hop', 'nipsey hussle': 'Hip Hop',
  'lil nas x': 'Hip Hop', 'offset': 'Hip Hop', 'quavo': 'Hip Hop', 'migos': 'Hip Hop',
  '2pac': 'Hip Hop', 'biggie': 'Hip Hop', 'notorious b.i.g.': 'Hip Hop', 'snoop dogg': 'Hip Hop',
  '50 cent': 'Hip Hop', 'ice cube': 'Hip Hop', 'dr. dre': 'Hip Hop', 'wu-tang clan': 'Hip Hop',
  'childish gambino': 'Hip Hop', 'chance the rapper': 'Hip Hop', 'logic': 'Hip Hop',
  'jid': 'Hip Hop', 'denzel curry': 'Hip Hop', 'ski mask': 'Hip Hop', 'joey bada$$': 'Hip Hop',
  'central cee': 'Hip Hop', 'dave': 'Hip Hop', 'stormzy': 'Hip Hop',
  'seedhe maut': 'Hip Hop', 'raftaar': 'Hip Hop', 'divine': 'Hip Hop', 'emiway bantai': 'Hip Hop',
  'krsna': 'Hip Hop', 'karma': 'Hip Hop', 'kr$na': 'Hip Hop', 'ikka': 'Hip Hop', 'badshah': 'Hip Hop',
  'yo yo honey singh': 'Hip Hop', 'brodha v': 'Hip Hop', 'king': 'Hip Hop',

  // Punjabi
  'karan aujla': 'Punjabi', 'ap dhillon': 'Punjabi', 'gurinder gill': 'Punjabi', 'shinda kahlon': 'Punjabi',
  'sidhu moose wala': 'Punjabi', 'diljit dosanjh': 'Punjabi', 'amrinder gill': 'Punjabi',
  'shubh': 'Punjabi', 'parmish verma': 'Punjabi', 'hardy sandhu': 'Punjabi', 'b praak': 'Punjabi',
  'jaani': 'Punjabi', 'jass manak': 'Punjabi', 'guru randhawa': 'Punjabi', 'ammy virk': 'Punjabi',
  'jassie gill': 'Punjabi', 'nimrat khaira': 'Punjabi', 'jasmine sandlas': 'Punjabi', 'kaka': 'Punjabi',
  'harrdy sandhu': 'Punjabi', 'gur sidhu': 'Punjabi',

  // Bollywood
  'arijit singh': 'Bollywood', 'shreya ghoshal': 'Bollywood', 'neha kakkar': 'Bollywood',
  'sonu nigam': 'Bollywood', 'atif aslam': 'Bollywood', 'jubin nautiyal': 'Bollywood',
  'vishal-shekhar': 'Bollywood', 'pritam': 'Bollywood', 'a.r. rahman': 'Bollywood',
  'k.k.': 'Bollywood', 'kk': 'Bollywood', 'amit trivedi': 'Bollywood', 'sunidhi chauhan': 'Bollywood',
  'darshan raval': 'Bollywood', 'armaan malik': 'Bollywood', 'tulsi kumar': 'Bollywood',

  // Pop
  'taylor swift': 'Pop', 'ariana grande': 'Pop', 'billie eilish': 'Pop', 'harry styles': 'Pop',
  'dua lipa': 'Pop', 'the weeknd': 'Pop', 'ed sheeran': 'Pop', 'justin bieber': 'Pop',
  'olivia rodrigo': 'Pop', 'doja cat': 'Pop', 'sza': 'Pop', 'miley cyrus': 'Pop',
  'lady gaga': 'Pop', 'bruno mars': 'Pop', 'adele': 'Pop', 'rihanna': 'Pop',
  'beyoncé': 'Pop', 'beyonce': 'Pop', 'selena gomez': 'Pop', 'camila cabello': 'Pop',
  'shawn mendes': 'Pop', 'charlie puth': 'Pop', 'sam smith': 'Pop', 'sia': 'Pop',
  'halsey': 'Pop', 'lizzo': 'Pop', 'katy perry': 'Pop', 'bts': 'Pop',
  'blackpink': 'Pop', 'twice': 'Pop', 'lisa': 'Pop', 'rosé': 'Pop',
  'sabrina carpenter': 'Pop', 'chappell roan': 'Pop', 'tate mcrae': 'Pop',
  'lana del rey': 'Indie Pop', 'clairo': 'Indie Pop', 'phoebe bridgers': 'Indie Pop',
  'conan gray': 'Indie Pop', 'girl in red': 'Indie Pop', 'rex orange county': 'Indie Pop',

  // R&B / Soul
  'frank ocean': 'R&B / Soul', 'daniel caesar': 'R&B / Soul', 'brent faiyaz': 'R&B / Soul',
  'summer walker': 'R&B / Soul', 'h.e.r.': 'R&B / Soul', 'jhené aiko': 'R&B / Soul',
  'khalid': 'R&B / Soul', 'usher': 'R&B / Soul',
  'chris brown': 'R&B / Soul', 'r. kelly': 'R&B / Soul', 'alicia keys': 'R&B / Soul',
  'john legend': 'R&B / Soul', 'miguel': 'R&B / Soul', '6lack': 'R&B / Soul',
  'bryson tiller': 'R&B / Soul', 'kehlani': 'R&B / Soul', 'jorja smith': 'R&B / Soul',

  // Rock
  'linkin park': 'Rock', 'imagine dragons': 'Rock', 'arctic monkeys': 'Rock',
  'the 1975': 'Rock', 'twenty one pilots': 'Rock', 'panic! at the disco': 'Rock',
  'fall out boy': 'Rock', 'my chemical romance': 'Rock', 'green day': 'Rock',
  'foo fighters': 'Rock', 'red hot chili peppers': 'Rock', 'nirvana': 'Rock',
  'radiohead': 'Rock', 'coldplay': 'Rock', 'u2': 'Rock', 'oasis': 'Rock',
  'queen': 'Rock', 'led zeppelin': 'Rock', 'pink floyd': 'Rock', 'ac/dc': 'Rock',
  'metallica': 'Metal', 'iron maiden': 'Metal', 'slipknot': 'Metal',
  'megadeth': 'Metal', 'black sabbath': 'Metal', 'tool': 'Metal',
  'the neighbourhood': 'Rock', 'glass animals': 'Rock', 'tame impala': 'Rock',

  // Electronic / EDM
  'marshmello': 'Electronic', 'skrillex': 'Electronic', 'deadmau5': 'Electronic',
  'calvin harris': 'Electronic', 'martin garrix': 'Electronic', 'avicii': 'Electronic',
  'david guetta': 'Electronic', 'zedd': 'Electronic', 'kygo': 'Electronic',
  'alan walker': 'Electronic', 'chainsmokers': 'Electronic', 'tiësto': 'Electronic',
  'diplo': 'Electronic', 'flume': 'Electronic', 'illenium': 'Electronic',
  'daft punk': 'Electronic', 'disclosure': 'Electronic', 'kaytranada': 'Electronic',

  // Latin
  'bad bunny': 'Latin', 'j balvin': 'Latin', 'daddy yankee': 'Latin',
  'ozuna': 'Latin', 'maluma': 'Latin', 'rosalía': 'Latin', 'rosalia': 'Latin',
  'rauw alejandro': 'Latin', 'anuel aa': 'Latin', 'becky g': 'Latin',
  'feid': 'Latin', 'karol g': 'Latin', 'shakira': 'Latin',

  // Jazz
  'miles davis': 'Jazz', 'john coltrane': 'Jazz', 'duke ellington': 'Jazz',
  'louis armstrong': 'Jazz', 'billie holiday': 'Jazz', 'ella fitzgerald': 'Jazz',
  'norah jones': 'Jazz', 'kamasi washington': 'Jazz', 'robert glasper': 'Jazz',

  // Classical
  'beethoven': 'Classical', 'mozart': 'Classical', 'bach': 'Classical',
  'chopin': 'Classical', 'debussy': 'Classical', 'vivaldi': 'Classical',
  'ludovico einaudi': 'Classical', 'yiruma': 'Classical', 'hans zimmer': 'Classical',

  // Folk / Country
  'bon iver': 'Folk / Country', 'fleet foxes': 'Folk / Country', 'iron & wine': 'Folk / Country',
  'hozier': 'Folk / Country', 'mumford & sons': 'Folk / Country', 'vance joy': 'Folk / Country',
  'johnny cash': 'Folk / Country', 'dolly parton': 'Folk / Country', 'morgan wallen': 'Folk / Country',
  'luke combs': 'Folk / Country', 'zach bryan': 'Folk / Country', 'noah kahan': 'Folk / Country',

  // Lo-Fi
  'lofi girl': 'Lo-Fi', 'nujabes': 'Lo-Fi', 'jinsang': 'Lo-Fi',
  'idealism': 'Lo-Fi', 'kupla': 'Lo-Fi', 'tomppabeats': 'Lo-Fi',

  // Bollywood / Indian
  'arijit singh': 'Pop', 'atif aslam': 'Pop', 'neha kakkar': 'Pop',
  'armaan malik': 'Pop', 'jubin nautiyal': 'Pop', 'shreya ghoshal': 'Pop',
  'a.r. rahman': 'Pop', 'pritam': 'Pop', 'vishal-shekhar': 'Pop',
  'amit trivedi': 'Pop', 'sachin-jigar': 'Pop', 'tanishk bagchi': 'Pop',
  'diljit dosanjh': 'Pop', 'guru randhawa': 'Pop', 'ap dhillon': 'Hip Hop',
  'sidhu moose wala': 'Hip Hop', 'karan aujla': 'Hip Hop', 'shubh': 'Hip Hop',
};

function detectGenreFromNames(track: SpotifyTrack): GenreInfo {
  // Check each artist name against our mapping
  for (const artist of track.artists) {
    const name = artist.name.toLowerCase().trim();
    const genreName = ARTIST_GENRE_MAP[name];
    if (genreName) {
      const genre = GENRE_MAP.find((g) => g.name === genreName);
      if (genre) return genre;
    }
  }

  // Check track name and artist names for genre-hinting keywords
  const combined = `${track.name} ${track.artists.map((a) => a.name).join(' ')}`.toLowerCase();

  const nameKeywords: Record<string, string> = {
    'remix': 'Electronic', 'edm': 'Electronic', 'dj': 'Electronic',
    'lofi': 'Lo-Fi', 'lo-fi': 'Lo-Fi', 'chillhop': 'Lo-Fi',
    'acoustic': 'Folk / Country', 'unplugged': 'Folk / Country',
    'metal': 'Metal', 'symphony': 'Classical', 'orchestra': 'Classical',
    'reggaeton': 'Latin', 'cumbia': 'Latin', 'bachata': 'Latin',
    'jazz': 'Jazz', 'blues': 'Jazz', 'bossa': 'Jazz',
    'punk': 'Rock', 'rock': 'Rock', 'grunge': 'Rock',
    'rap': 'Hip Hop', 'freestyle': 'Hip Hop', 'cypher': 'Hip Hop',
  };

  for (const [keyword, genreName] of Object.entries(nameKeywords)) {
    if (combined.includes(keyword)) {
      const genre = GENRE_MAP.find((g) => g.name === genreName);
      if (genre) return genre;
    }
  }

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
      if (genre.name === 'Other') genre = detectGenreFromNames(track);
    } else if (features) {
      genre = detectGenreFromFeatures(features);
      if (genre.name === 'Other') genre = detectGenreFromNames(track);
    } else {
      // No API data available — use name-based detection
      genre = detectGenreFromNames(track);
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
