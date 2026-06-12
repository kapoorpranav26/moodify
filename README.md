# 🎵 Moodify

Moodify is a powerful, AI-driven Spotify companion app that automatically organizes your chaotic music library and generates hyper-personalized playlists based on your exact mood.

Built with Next.js, the Spotify Web API, and Google's cutting-edge Gemini 2.5 Flash model.

## ✨ Features

- **🪄 Auto-Organize:** Instantly analyzes your saved tracks and automatically sorts them into distinct, beautifully categorized playlists based on Genre and Mood (e.g., "Upbeat Pop", "Chill Lofi", "Energetic Rap").
- **🧠 AI Playlist Generator:** Tell Moodify exactly how you feel (e.g., *"I feel lethargic and need concentration, give me upbeat Punjabi songs"*). The Gemini 2.5 AI mathematically translates your mood into audio targets (energy, valence, danceability) and feeds them into Spotify's core recommendation engine to generate the perfect, vibe-matched playlist.
- **📱 Fully Responsive:** A premium, glassmorphism-inspired UI with smooth micro-animations that looks stunning across Desktop, Tablet, and Mobile devices.
- **🔒 Secure PKCE Authentication:** Logs you in securely using Spotify's modern OAuth 2.0 PKCE flow, ensuring your data and playlists stay private.

## 🛠 Tech Stack

- **Framework:** Next.js 15 (App Router) & React 19
- **Styling:** Vanilla CSS Modules (No Tailwind, fully custom design system)
- **APIs:** Spotify Web API & Google Gemini API (gemini-2.5-flash)

## 🚀 Getting Started

### Prerequisites
1. Create a [Spotify Developer App](https://developer.spotify.com/dashboard) to get a Client ID.
2. Create a [Google AI Studio](https://aistudio.google.com/app/apikey) account to get a free Gemini API Key (starts with `AIzaSy`).

### Installation

1. Clone the repository:
```bash
git clone https://github.com/kapoorpranav26/moodify.git
cd moodify
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory and add your keys:
```env
# Spotify OAuth Configuration
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/callback

# Google Gemini API for AI Playlists
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🚢 Deploying to Vercel

When deploying to Vercel, make sure to add your Environment Variables in the Vercel Dashboard Settings, and update the `NEXT_PUBLIC_REDIRECT_URI` to match your actual Vercel domain (e.g., `https://your-app.vercel.app/callback`). Also, ensure you add this new callback URL to the "Redirect URIs" list in your Spotify Developer Dashboard.
