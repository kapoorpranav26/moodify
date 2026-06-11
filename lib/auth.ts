// Spotify PKCE Auth Helpers

const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI!;

const SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-library-read',
  'user-top-read',
  'user-read-private',
  'user-read-email',
  'streaming',
  'user-read-playback-state',
  'user-modify-playback-state',
].join(' ');

// Generate random string for PKCE
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array).map((b) => chars[b % chars.length]).join('');
}

// SHA-256 hash
async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

// Base64URL encode
function base64URLEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// Generate code verifier + challenge
export async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const verifier = generateRandomString(128);
  const hashed = await sha256(verifier);
  const challenge = base64URLEncode(hashed);
  return { verifier, challenge };
}

// Build Spotify auth URL
export async function getAuthUrl(): Promise<string> {
  const { verifier, challenge } = await generatePKCE();
  const state = generateRandomString(16);

  localStorage.setItem('pkce_verifier', verifier);
  localStorage.setItem('auth_state', state);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
    scope: SCOPES,
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// Exchange code for tokens
export async function exchangeCode(code: string): Promise<TokenResponse> {
  const verifier = localStorage.getItem('pkce_verifier');
  if (!verifier) throw new Error('No PKCE verifier found');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error_description || 'Token exchange failed');
  }

  const tokens: TokenResponse = await response.json();
  saveTokens(tokens);
  return tokens;
}

// Refresh access token
export async function refreshAccessToken(): Promise<TokenResponse | null> {
  const refreshToken = localStorage.getItem('spotify_refresh_token');
  if (!refreshToken) return null;

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) return null;

  const tokens: TokenResponse = await response.json();
  saveTokens(tokens);
  return tokens;
}

export function saveTokens(tokens: TokenResponse) {
  localStorage.setItem('spotify_access_token', tokens.access_token);
  if (tokens.refresh_token) {
    localStorage.setItem('spotify_refresh_token', tokens.refresh_token);
  }
  const expiresAt = Date.now() + tokens.expires_in * 1000;
  localStorage.setItem('spotify_expires_at', expiresAt.toString());
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('spotify_access_token');
}

export function isTokenExpired(): boolean {
  const expiresAt = localStorage.getItem('spotify_expires_at');
  if (!expiresAt) return true;
  return Date.now() > parseInt(expiresAt) - 60000; // 1 minute buffer
}

export function clearTokens() {
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_expires_at');
  localStorage.removeItem('pkce_verifier');
  localStorage.removeItem('auth_state');
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}
