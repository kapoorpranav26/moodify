import { getAccessToken, isTokenExpired, refreshAccessToken } from './auth';

const BASE_URL = 'https://api.spotify.com/v1';

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
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error: ${res.status}`);
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
    all.push(...data.items.filter(Boolean));
    url = data.next ? data.next.replace(BASE_URL, '') : '';
  }

  return all;
}

export async function getPlaylistTracks(playlistId: string): Promise<SpotifyTrackItem[]> {
  const all: SpotifyTrackItem[] = [];
  let url = `/playlists/${playlistId}/tracks?limit=100&fields=items(track(id,name,duration_ms,preview_url,album(name,images),artists(id,name))),next`;

  while (url) {
    const data = await spotifyFetch<{ items: SpotifyTrackItem[]; next: string | null }>(url.replace(BASE_URL, ''));
    all.push(...data.items.filter((i) => i?.track?.id));
    url = data.next ? data.next.replace(BASE_URL, '') : '';
  }

  return all;
}

// ─── Audio Features ────────────────────────────────────────────────────────
export async function getAudioFeatures(trackIds: string[]): Promise<AudioFeatures[]> {
  const results: AudioFeatures[] = [];
  const chunks = chunkArray(trackIds, 100);

  for (const chunk of chunks) {
    const data = await spotifyFetch<{ audio_features: AudioFeatures[] }>(
      `/audio-features?ids=${chunk.join(',')}`
    );
    results.push(...data.audio_features.filter(Boolean));
  }

  return results;
}

// ─── Artists ───────────────────────────────────────────────────────────────
export async function getArtists(artistIds: string[]): Promise<SpotifyArtist[]> {
  const results: SpotifyArtist[] = [];
  const chunks = chunkArray([...new Set(artistIds)], 50);

  for (const chunk of chunks) {
    const data = await spotifyFetch<{ artists: SpotifyArtist[] }>(
      `/artists?ids=${chunk.join(',')}`
    );
    results.push(...data.artists.filter(Boolean));
  }

  return results;
}

// ─── Create Playlist ───────────────────────────────────────────────────────
export async function createPlaylist(
  userId: string,
  name: string,
  description: string
): Promise<SpotifyPlaylist> {
  return spotifyFetch<SpotifyPlaylist>(`/users/${userId}/playlists`, {
    method: 'POST',
    body: JSON.stringify({ name, description, public: false }),
  });
}

export async function addTracksToPlaylist(playlistId: string, trackUris: string[]): Promise<void> {
  const chunks = chunkArray(trackUris, 100);
  for (const chunk of chunks) {
    await spotifyFetch(`/playlists/${playlistId}/tracks`, {
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
