import { getAccessToken, isTokenExpired, refreshAccessToken } from './auth';

const BASE_URL = 'https://api.spotify.com/v1';

// Circuit breakers for endpoints restricted in new API changes
let isAudioFeaturesBlocked = false;
let isArtistsBlocked = false;

async function getValidToken(): Promise<string> {
  if (isTokenExpired()) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) throw new Error('Session expired. Please log in again.');
  }
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');
  return token;
}

async function spotifyFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = await getValidToken();
  const method = options?.method?.toUpperCase() || 'GET';
  
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  // Only set Content-Type for requests with a body
  if (method !== 'GET' && method !== 'HEAD') {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || `API error: ${res.status}`;
    console.error(`[Moodify] ${method} ${endpoint} → ${res.status}: ${msg}`);
    throw new Error(msg);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

// ─── User ──────────────────────────────────────────────────────────────────
export async function getCurrentUser(): Promise<SpotifyUser> {
  return spotifyFetch<SpotifyUser>('/me');
}

// ─── Playlists ─────────────────────────────────────────────────────────────
export async function getUserPlaylists(limit = 50): Promise<SpotifyPlaylist[]> {
  const all: SpotifyPlaylist[] = [];
  let url = `/me/playlists?limit=${limit}`;

  while (url) {
    const data = await spotifyFetch<{ items: SpotifyPlaylist[]; next: string | null }>(url.replace(BASE_URL, ''));
    all.push(...data.items.filter((p) => Boolean(p && p.id && p.name)));
    url = data.next ? data.next.replace(BASE_URL, '') : '';
  }

  return all;
}

export async function getPlaylistTracks(playlistId: string): Promise<SpotifyTrackItem[]> {
  const all: SpotifyTrackItem[] = [];
  let url = `/playlists/${playlistId}/items?limit=50`;

  while (url) {
    const data = await spotifyFetch<{ items: any[]; next: string | null }>(url.replace(BASE_URL, ''));
    
    // Handle both old format (track) and new format (item)
    const mapped = data.items
      .map((i) => {
        const trackData = i?.track ?? i?.item;
        if (!trackData?.id) return null;
        return { track: trackData, added_at: i.added_at } as SpotifyTrackItem;
      })
      .filter(Boolean) as SpotifyTrackItem[];
    
    all.push(...mapped);
    url = data.next ? data.next.replace(BASE_URL, '') : '';
  }

  return all;
}

// ─── Audio Features ────────────────────────────────────────────────────────
export async function getAudioFeatures(trackIds: string[]): Promise<AudioFeatures[]> {
  if (isAudioFeaturesBlocked || trackIds.length === 0) return [];
  const results: AudioFeatures[] = [];
  const chunks = chunkArray(trackIds, 100);

  for (const chunk of chunks) {
    if (isAudioFeaturesBlocked) break;
    try {
      const data = await spotifyFetch<{ audio_features: AudioFeatures[] }>(
        `/audio-features?ids=${chunk.join(',')}`
      );
      if (data?.audio_features) {
        results.push(...data.audio_features.filter(Boolean));
      }
    } catch {
      // Audio features endpoint may be restricted — stop trying
      isAudioFeaturesBlocked = true;
    }
  }

  return results;
}

// ─── Artists ───────────────────────────────────────────────────────────────
export async function getArtists(artistIds: string[]): Promise<SpotifyArtist[]> {
  if (isArtistsBlocked) return [];
  const results: SpotifyArtist[] = [];
  const unique = [...new Set(artistIds)].filter(Boolean);
  if (unique.length === 0) return results;
  const chunks = chunkArray(unique, 50);

  for (const chunk of chunks) {
    if (isArtistsBlocked) break;
    try {
      const data = await spotifyFetch<{ artists: SpotifyArtist[] }>(
        `/artists?ids=${chunk.join(',')}`
      );
      if (data?.artists) {
        results.push(...data.artists.filter(Boolean));
      }
    } catch {
      // Artists endpoint may fail — stop trying
      isArtistsBlocked = true;
    }
  }

  return results;
}

export async function createPlaylist(
  userId: string,
  name: string,
  description: string
): Promise<SpotifyPlaylist> {
  // Use /me/playlists instead of /users/{id}/playlists to bypass Development Mode 403 bugs
  return spotifyFetch<SpotifyPlaylist>(`/users/${userId}/playlists`, {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  }).catch(() => {
    // Fallback to undocumented /me/playlists if the above fails
    return spotifyFetch<SpotifyPlaylist>(`/me/playlists`, {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  });
}

export async function addTracksToPlaylist(playlistId: string, trackUris: string[]): Promise<void> {
  const chunks = chunkArray(trackUris, 100);
  for (const chunk of chunks) {
    await spotifyFetch(`/playlists/${playlistId}/items`, {
      method: 'POST',
      body: JSON.stringify({ uris: chunk }),
    });
  }
}

export async function removeTracksFromPlaylist(playlistId: string, trackUris: string[]): Promise<void> {
  const chunks = chunkArray(trackUris, 100);
  for (const chunk of chunks) {
    await spotifyFetch(`/playlists/${playlistId}/tracks`, {
      method: 'DELETE',
      body: JSON.stringify({ tracks: chunk.map((uri) => ({ uri })) }),
    });
  }
}

// ─── Search & Recommendations ──────────────────────────────────────────────
export async function searchTracks(query: string, limit = 10): Promise<SpotifyTrack[]> {
  // Spotify Feb 2026: max limit is 10, paginate with offset for more
  const maxPerPage = 10;
  const totalNeeded = Math.min(limit, 30);
  const all: SpotifyTrack[] = [];

  for (let offset = 0; all.length < totalNeeded; offset += maxPerPage) {
    try {
      const params = new URLSearchParams({
        q: query,
        type: 'track',
        limit: String(maxPerPage),
        offset: String(offset),
      });
      const data = await spotifyFetch<{ tracks: { items: SpotifyTrack[]; total: number } }>(
        `/search?${params.toString()}`
      );
      const items = data.tracks?.items?.filter(Boolean) ?? [];
      if (items.length === 0) break; // No more results
      all.push(...items);
      if (items.length < maxPerPage) break; // Last page
    } catch (e) {
      console.error('[Moodify] Search failed for:', query, 'offset:', offset, e);
      break;
    }
  }

  return all.slice(0, totalNeeded);
}

export async function getRecommendations(
  seedTracks: string[] = [],
  seedArtists: string[] = [],
  seedGenres: string[] = [],
  features: Record<string, number> = {},
  limit = 30
): Promise<SpotifyTrack[]> {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (seedTracks.length) params.set('seed_tracks', seedTracks.slice(0, 2).join(','));
  if (seedArtists.length) params.set('seed_artists', seedArtists.slice(0, 2).join(','));
  if (seedGenres.length) params.set('seed_genres', seedGenres.slice(0, 1).join(','));
  // Total seeds must be <= 5
  for (const [key, val] of Object.entries(features)) {
    params.set(key, String(val));
  }
  try {
    const data = await spotifyFetch<{ tracks: SpotifyTrack[] }>(`/recommendations?${params.toString()}`);
    return data.tracks?.filter(Boolean) ?? [];
  } catch {
    console.warn('Recommendations API unavailable');
    return [];
  }
}

// ─── Utilities ─────────────────────────────────────────────────────────────
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// ─── Types ──────────────────────────────────────────────────────────────────
export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: { url: string }[];
  followers: { total: number };
  country: string;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  tracks: { total: number };
  owner: { id: string; display_name: string };
  public: boolean;
}

export interface SpotifyTrackItem {
  track: SpotifyTrack;
  added_at: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  preview_url: string | null;
  album: { name: string; images: { url: string }[] };
  artists: { id: string; name: string }[];
  uri?: string;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  images: { url: string }[];
  popularity: number;
}

export interface AudioFeatures {
  id: string;
  danceability: number;
  energy: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
  tempo: number;
  speechiness: number;
  liveness: number;
  loudness: number;
}
