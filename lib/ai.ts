// AI Playlist Prompt Parser using Gemini API

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export interface PlaylistIntent {
  name: string;           // Suggested playlist name
  searchQueries: string[]; // 3-5 Spotify search queries to find matching tracks
  genres: string[];        // Relevant genres
  moods: string[];         // Mood descriptors
  targetFeatures: {        // Audio feature targets (0-1 scale)
    energy?: number;
    danceability?: number;
    valence?: number;
    acousticness?: number;
    instrumentalness?: number;
    tempo?: number;        // BPM, not 0-1
  };
  count: number;           // Number of tracks to find
  language?: string;       // Preferred language
}

const SYSTEM_PROMPT = `You are a music expert AI that helps create Spotify playlists. Given a user's natural language request, extract structured data for playlist creation.

Respond ONLY with a JSON object (no markdown, no explanation) with these fields:
- name: string (creative playlist name, 2-5 words)
- searchQueries: string[] (3-5 diverse Spotify search queries that would find matching tracks. Include genre, artist, or mood keywords. Make queries specific and varied.)
- genres: string[] (relevant genre tags like "lofi", "hip-hop", "indie", "bollywood", etc.)
- moods: string[] (mood words like "chill", "energetic", "melancholy", "upbeat")
- targetFeatures: object with optional keys:
  - energy: number 0-1 (0=calm, 1=intense)
  - danceability: number 0-1
  - valence: number 0-1 (0=sad, 1=happy)
  - acousticness: number 0-1
  - instrumentalness: number 0-1
  - tempo: number (BPM, e.g. 120)
- count: number (how many tracks, default 25)
- language: string or null (e.g. "hindi", "english", "spanish")

Examples:
User: "chill lofi beats for studying"
Response: {"name":"Study Lofi Session","searchQueries":["lofi hip hop chill beats","lofi study music instrumental","chillhop relaxing beats","lofi jazz cafe"],"genres":["lofi","chillhop","jazz"],"moods":["chill","relaxed","focused"],"targetFeatures":{"energy":0.3,"danceability":0.4,"valence":0.4,"acousticness":0.6,"instrumentalness":0.7,"tempo":85},"count":25,"language":null}

User: "high energy workout songs"
Response: {"name":"Beast Mode","searchQueries":["workout motivation high energy","gym pump up songs","running fast tempo EDM","workout hip hop bangers"],"genres":["edm","hip-hop","pop"],"moods":["energetic","powerful","intense"],"targetFeatures":{"energy":0.9,"danceability":0.7,"valence":0.7,"tempo":140},"count":25,"language":null}

User: "bollywood romantic songs"
Response: {"name":"Dil Se Romance","searchQueries":["bollywood romantic songs","hindi love songs latest","arijit singh romantic","bollywood couple songs"],"genres":["bollywood","indian pop"],"moods":["romantic","emotional","passionate"],"targetFeatures":{"energy":0.4,"valence":0.6,"acousticness":0.5},"count":25,"language":"hindi"}`;

export async function parsePlaylistPrompt(prompt: string): Promise<PlaylistIntent> {
  if (!GEMINI_API_KEY) {
    // Fallback: keyword-based parsing
    return fallbackParse(prompt);
  }

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
          { role: 'model', parts: [{ text: 'Understood. I will respond only with JSON.' }] },
          { role: 'user', parts: [{ text: prompt }] },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      }),
    });

    if (!res.ok) {
      console.warn('Gemini API error, using fallback parser');
      return fallbackParse(prompt);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallbackParse(prompt);
    
    const parsed = JSON.parse(jsonMatch[0]) as PlaylistIntent;
    // Ensure required fields
    return {
      name: parsed.name || 'AI Playlist',
      searchQueries: parsed.searchQueries?.length ? parsed.searchQueries : [prompt],
      genres: parsed.genres || [],
      moods: parsed.moods || [],
      targetFeatures: parsed.targetFeatures || {},
      count: parsed.count || 25,
      language: parsed.language,
    };
  } catch (e) {
    console.warn('AI parse failed, using fallback:', e);
    return fallbackParse(prompt);
  }
}

// Keyword-based fallback when no API key is available
function fallbackParse(prompt: string): PlaylistIntent {
  const lower = prompt.toLowerCase();
  
  const moodMap: Record<string, { moods: string[]; features: PlaylistIntent['targetFeatures'] }> = {
    'chill': { moods: ['chill', 'relaxed'], features: { energy: 0.3, valence: 0.5, danceability: 0.4 } },
    'relax': { moods: ['relaxed', 'calm'], features: { energy: 0.2, valence: 0.4, acousticness: 0.7 } },
    'study': { moods: ['focused', 'calm'], features: { energy: 0.3, instrumentalness: 0.6, valence: 0.4 } },
    'workout': { moods: ['energetic', 'powerful'], features: { energy: 0.9, danceability: 0.7, tempo: 140 } },
    'gym': { moods: ['intense', 'powerful'], features: { energy: 0.9, danceability: 0.7, tempo: 140 } },
    'party': { moods: ['energetic', 'fun'], features: { energy: 0.8, danceability: 0.9, valence: 0.8 } },
    'dance': { moods: ['groovy', 'fun'], features: { energy: 0.7, danceability: 0.9, valence: 0.7 } },
    'sad': { moods: ['melancholy', 'emotional'], features: { energy: 0.3, valence: 0.2, acousticness: 0.5 } },
    'happy': { moods: ['joyful', 'upbeat'], features: { energy: 0.7, valence: 0.9, danceability: 0.6 } },
    'romantic': { moods: ['romantic', 'passionate'], features: { energy: 0.4, valence: 0.6, acousticness: 0.5 } },
    'love': { moods: ['romantic', 'tender'], features: { energy: 0.4, valence: 0.6 } },
    'sleep': { moods: ['peaceful', 'dreamy'], features: { energy: 0.1, acousticness: 0.8, instrumentalness: 0.7 } },
    'focus': { moods: ['focused', 'determined'], features: { energy: 0.4, instrumentalness: 0.5, valence: 0.4 } },
    'road trip': { moods: ['adventurous', 'free'], features: { energy: 0.7, valence: 0.7, danceability: 0.6 } },
    'morning': { moods: ['fresh', 'uplifting'], features: { energy: 0.5, valence: 0.7, acousticness: 0.4 } },
    'night': { moods: ['atmospheric', 'moody'], features: { energy: 0.4, valence: 0.4 } },
    'lofi': { moods: ['chill', 'atmospheric'], features: { energy: 0.3, danceability: 0.4, instrumentalness: 0.6 } },
    'energy': { moods: ['energetic', 'pumped'], features: { energy: 0.9, danceability: 0.7 } },
    'intense': { moods: ['intense', 'aggressive'], features: { energy: 0.95, valence: 0.4 } },
    'hype': { moods: ['hype', 'lit'], features: { energy: 0.9, danceability: 0.8, valence: 0.8 } },
    'vibe': { moods: ['atmospheric', 'smooth'], features: { energy: 0.5, valence: 0.6 } },
    'rap': { moods: ['confident', 'bold'], features: { energy: 0.7, danceability: 0.7 } },
    'pop': { moods: ['upbeat', 'catchy'], features: { energy: 0.6, danceability: 0.7, valence: 0.7 } },
    'rock': { moods: ['intense', 'raw'], features: { energy: 0.8, valence: 0.5 } },
    'r&b': { moods: ['smooth', 'soulful'], features: { energy: 0.5, danceability: 0.6, valence: 0.5 } },
    'rnb': { moods: ['smooth', 'soulful'], features: { energy: 0.5, danceability: 0.6, valence: 0.5 } },
    'bollywood': { moods: ['dramatic', 'melodic'], features: { energy: 0.6, valence: 0.6 } },
    'punjabi': { moods: ['energetic', 'fun'], features: { energy: 0.8, danceability: 0.8 } },
    'edm': { moods: ['energetic', 'euphoric'], features: { energy: 0.9, danceability: 0.9 } },
    'classical': { moods: ['serene', 'elegant'], features: { energy: 0.2, acousticness: 0.9, instrumentalness: 0.9 } },
    'jazz': { moods: ['smooth', 'sophisticated'], features: { energy: 0.4, acousticness: 0.7 } },
    'acoustic': { moods: ['intimate', 'warm'], features: { energy: 0.3, acousticness: 0.8 } },
    'indie': { moods: ['dreamy', 'alternative'], features: { energy: 0.5, valence: 0.5 } },
    'metal': { moods: ['aggressive', 'intense'], features: { energy: 0.95, valence: 0.3 } },
    'country': { moods: ['nostalgic', 'storytelling'], features: { energy: 0.5, acousticness: 0.5 } },
    'latin': { moods: ['passionate', 'rhythmic'], features: { energy: 0.7, danceability: 0.8 } },
    'reggaeton': { moods: ['fun', 'rhythmic'], features: { energy: 0.8, danceability: 0.9 } },
  };

  const detectedMoods: string[] = [];
  let features: PlaylistIntent['targetFeatures'] = {};
  const detectedGenres: string[] = [];
  
  for (const [keyword, data] of Object.entries(moodMap)) {
    if (lower.includes(keyword)) {
      detectedMoods.push(...data.moods);
      features = { ...features, ...data.features };
      if (['pop', 'rock', 'rap', 'r&b', 'rnb', 'edm', 'jazz', 'classical', 'metal', 'country', 'latin', 'reggaeton', 'indie', 'bollywood', 'punjabi', 'lofi', 'acoustic'].includes(keyword)) {
        detectedGenres.push(keyword);
      }
    }
  }

  // Extract count if mentioned
  const countMatch = lower.match(/(\d+)\s*(songs?|tracks?)/i);
  const count = countMatch ? Math.min(parseInt(countMatch[1]), 50) : 25;

  // Intelligently extract potential artist names and build targeted search queries
  const stopWords = new Set(['make', 'me', 'a', 'an', 'the', 'with', 'for', 'my', 'of', 'to', 'and', 'or', 'like', 'songs', 'song', 'tracks', 'track', 'playlist', 'mix', 'music', 'give', 'create', 'build', 'some', 'best', 'top', 'hits', 'new', 'good', 'great', 'vibes', 'type', 'beat', 'beats', ...Object.keys(moodMap)]);
  
  // Extract meaningful words (potential artist names, descriptors)
  const cleaned = prompt.replace(/[^a-zA-Z0-9\s&']/g, '').trim();
  const words = cleaned.split(/\s+/).filter(w => !stopWords.has(w.toLowerCase()) && w.length > 1);
  
  // Build smart search queries
  const searchQueries: string[] = [];
  
  // If we have meaningful words left (likely artist names), search for each
  if (words.length > 0) {
    // Try the meaningful words as artist search
    searchQueries.push(`${words.join(' ')}`);
    // Split by "and"/"&" to handle multiple artists
    const artistParts = cleaned.split(/\s+(?:and|&)\s+/i)
      .map(p => p.replace(/[^a-zA-Z0-9\s']/g, '').trim())
      .map(p => p.split(/\s+/).filter(w => !stopWords.has(w.toLowerCase()) && w.length > 1).join(' '))
      .filter(p => p.length > 0);
    
    for (const artist of artistParts) {
      if (artist.length > 1) {
        searchQueries.push(`artist:${artist}`);
        if (detectedGenres.length > 0) {
          searchQueries.push(`artist:${artist} genre:${detectedGenres[0]}`);
        }
      }
    }
  }
  
  // Add genre-based queries
  if (detectedGenres.length > 0) {
    searchQueries.push(`${detectedGenres.join(' ')} ${detectedMoods[0] || 'hits'}`);
  }
  
  // Add mood-based queries
  if (detectedMoods.length > 0 && searchQueries.length < 4) {
    searchQueries.push(`${detectedMoods[0]} ${detectedMoods[1] || ''} music`.trim());
  }
  
  // Fallback: just use the raw prompt
  if (searchQueries.length === 0) {
    searchQueries.push(prompt, `${prompt} songs`, `${prompt} playlist`);
  }

  // Deduplicate and limit to 5
  const uniqueQueries = [...new Set(searchQueries)].slice(0, 5);

  // Generate a creative name
  const name = words.length > 0 && words.length <= 4
    ? words.join(' & ') + (detectedMoods.length > 0 ? ` ${detectedMoods[0]}` : ' Mix')
    : prompt.length > 30 ? prompt.slice(0, 30) + '...' : prompt;

  return {
    name,
    searchQueries: uniqueQueries,
    genres: detectedGenres,
    moods: [...new Set(detectedMoods)],
    targetFeatures: features,
    count,
    language: lower.includes('hindi') || lower.includes('bollywood') ? 'hindi' 
      : lower.includes('spanish') || lower.includes('latino') ? 'spanish' 
      : undefined,
  };
}

export function isAIAvailable(): boolean {
  return !!GEMINI_API_KEY;
}
