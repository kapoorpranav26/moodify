'use client';
import { useState, useRef, useEffect } from 'react';
import { parsePlaylistPrompt, isAIAvailable, PlaylistIntent } from '@/lib/ai';
import { searchTracks, createPlaylist, addTracksToPlaylist, SpotifyUser, SpotifyTrack } from '@/lib/spotify';
import styles from './AIPlaylistChat.module.css';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  tracks?: SpotifyTrack[];
  intent?: PlaylistIntent;
  isLoading?: boolean;
  error?: boolean;
}

interface AIPlaylistChatProps {
  user: SpotifyUser;
  onPlaylistCreated: (message: string) => void;
  onError: (message: string) => void;
}

const SUGGESTIONS = [
  '🎧 chill lofi beats for studying',
  '💪 high energy workout songs',
  '🌙 late night vibes',
  '🎉 bollywood party hits',
  '😢 sad songs that hit deep',
  '🚗 road trip anthems',
];

export default function AIPlaylistChat({ user, onPlaylistCreated, onError }: AIPlaylistChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewTracks, setPreviewTracks] = useState<SpotifyTrack[]>([]);
  const [playlistIntent, setPlaylistIntent] = useState<PlaylistIntent | null>(null);
  const [creating, setCreating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (msg: Omit<Message, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    setMessages(prev => [...prev, { ...msg, id }]);
    return id;
  };

  const updateMessage = (id: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const handleSend = async (text?: string) => {
    const prompt = (text || input).trim();
    if (!prompt || isProcessing) return;
    setInput('');
    setPreviewTracks([]);
    setPlaylistIntent(null);

    // Add user message
    addMessage({ role: 'user', content: prompt });

    // Add loading AI message
    const aiMsgId = addMessage({ role: 'ai', content: '', isLoading: true });
    setIsProcessing(true);

    try {
      // Parse prompt with AI
      const intent = await parsePlaylistPrompt(prompt);
      setPlaylistIntent(intent);

      updateMessage(aiMsgId, {
        content: `🎵 ${intent.name}\n\nSearching for ${intent.count} tracks...`,
        isLoading: true,
      });

      // Search Spotify for tracks
      const allTracks: SpotifyTrack[] = [];
      const seenIds = new Set<string>();

      for (const query of intent.searchQueries) {
        if (allTracks.length >= intent.count) break;
        try {
          const results = await searchTracks(query, 20);
          for (const track of results) {
            if (!seenIds.has(track.id) && allTracks.length < intent.count) {
              seenIds.add(track.id);
              allTracks.push(track);
            }
          }
        } catch {
          // Search query failed, continue with next
        }
      }

      if (allTracks.length === 0) {
        updateMessage(aiMsgId, {
          content: '😔 Couldn\'t find any tracks matching your request. Try a different description!',
          isLoading: false,
          error: true,
        });
      } else {
        setPreviewTracks(allTracks);
        updateMessage(aiMsgId, {
          content: `✨ Found ${allTracks.length} tracks for "${intent.name}"!\n\nReview below and click Create to add to Spotify.`,
          isLoading: false,
          tracks: allTracks,
          intent,
        });
      }
    } catch (e) {
      updateMessage(aiMsgId, {
        content: `❌ ${e instanceof Error ? e.message : 'Something went wrong. Please try again.'}`,
        isLoading: false,
        error: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const removePreviewTrack = (trackId: string) => {
    setPreviewTracks(prev => prev.filter(t => t.id !== trackId));
  };

  const handleCreate = async () => {
    if (!playlistIntent || previewTracks.length === 0 || creating) return;
    setCreating(true);

    try {
      const pl = await createPlaylist(
        user.id,
        playlistIntent.name,
        `Created by Moodify AI — ${playlistIntent.moods.join(', ')}`
      );
      await addTracksToPlaylist(
        pl.id,
        previewTracks.map(t => t.uri || `spotify:track:${t.id}`)
      );

      addMessage({
        role: 'ai',
        content: `🎉 "${playlistIntent.name}" created with ${previewTracks.length} tracks! Check your Spotify.`,
      });

      setPreviewTracks([]);
      setPlaylistIntent(null);
      onPlaylistCreated(`✅ "${playlistIntent.name}" created with ${previewTracks.length} tracks!`);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to create playlist');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        className={styles.trigger}
        onClick={() => setOpen(true)}
        title="AI Playlist Generator"
        id="ai-chat-trigger"
      >
        <span className={styles.triggerIcon}>✨</span>
      </button>

      {/* Overlay */}
      {open && <div className={styles.overlay} onClick={() => setOpen(false)} />}

      {/* Chat panel */}
      <div className={`${styles.panel} ${open ? styles.panelOpen : ''}`}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>
            <span>✨</span> AI Playlist
            {!isAIAvailable() && <span className={styles.badge}>Basic</span>}
          </div>
          <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
        </div>

        <div className={styles.messages}>
          {messages.length === 0 && (
            <div className={styles.emptyState}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
              <h3>What kind of playlist do you want?</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
                Describe your perfect playlist and I&apos;ll create it for you!
              </p>
              <div className={styles.suggestions}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    className={styles.suggestion}
                    onClick={() => handleSend(s.replace(/^[^\s]+\s/, ''))}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`${styles.message} ${msg.role === 'user' ? styles.messageUser : styles.messageAI} ${msg.error ? styles.error : ''}`}
            >
              <div className={styles.messageContent}>
                {msg.isLoading && !msg.content ? (
                  <div className={styles.typing}>
                    <span className={styles.dot} />
                    <span className={styles.dot} />
                    <span className={styles.dot} />
                  </div>
                ) : (
                  msg.content.split('\n').map((line, i) => (
                    <span key={i}>
                      {line.replace(/\*\*(.*?)\*\*/g, '$1')}
                      {i < msg.content.split('\n').length - 1 && <br />}
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Track preview */}
        {previewTracks.length > 0 && (
          <>
            <div className={styles.trackPreview}>
              {previewTracks.slice(0, 30).map((track) => (
                <div key={track.id} className={styles.trackCard}>
                  <div className={styles.trackCardArt}>
                    {track.album?.images?.[2]?.url || track.album?.images?.[0]?.url ? (
                      <img src={track.album.images[2]?.url || track.album.images[0]?.url} alt="" />
                    ) : (
                      <span>🎵</span>
                    )}
                  </div>
                  <div className={styles.trackCardInfo}>
                    <div className={styles.trackCardName}>{track.name}</div>
                    <div className={styles.trackCardArtist}>
                      {track.artists?.map(a => a.name).join(', ')}
                    </div>
                  </div>
                  <button
                    className={styles.trackCardRemove}
                    onClick={() => removePreviewTrack(track.id)}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className={styles.createBar}>
              <button
                className={styles.createBtn}
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? 'Creating...' : `🎵 Create "${playlistIntent?.name}" (${previewTracks.length} tracks)`}
              </button>
            </div>
          </>
        )}

        {/* Input area */}
        <div className={styles.inputArea}>
          <div className={styles.inputWrapper}>
            <input
              className={styles.input}
              placeholder="Describe your perfect playlist..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={isProcessing}
              id="ai-chat-input"
            />
            <button
              className={styles.sendBtn}
              onClick={() => handleSend()}
              disabled={isProcessing || !input.trim()}
            >
              {isProcessing ? '...' : '→'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
