import { useState, useCallback, useRef, useEffect, startTransition } from 'react';
import { useReadingStore, useSettingsStore } from '../stores';
import { loadChapterAudio, getPositionAtTime, getWordAtPosition, getAudioUrl } from '../data/audio';
import { getBookById } from '../data/bible';
import { getMusicUrl as getConfigMusicUrl } from '../config/audio';
import type { ChapterAudio } from '../types';

// Helper function to get music track for a book/chapter
function getMusicTrack(bookId: string, chapter: number): string | null {
  // Only Revelation has ambient music for now
  if (bookId !== 'revelation') return null;

  // Map chapters to music sections based on thematic content
  if (chapter === 1) {
    return 'vision-intro';           // Ch 1: mysterious, reverent
  } else if (chapter >= 2 && chapter <= 3) {
    return 'letters-to-churches';    // Ch 2-3: authoritative, solemn
  } else if (chapter >= 4 && chapter <= 5) {
    return 'heavenly-throne';        // Ch 4-5: majestic, worship
  } else if (chapter >= 6 && chapter <= 8) {
    return 'seals-judgments';        // Ch 6-8: dramatic, intense
  } else if (chapter >= 9 && chapter <= 11) {
    return 'trumpets';               // Ch 9-11: epic, catastrophic
  } else if (chapter >= 12 && chapter <= 14) {
    return 'cosmic-war';             // Ch 12-14: battle, spiritual warfare
  } else if (chapter >= 15 && chapter <= 16) {
    return 'bowls-wrath';            // Ch 15-16: judgment, finality
  } else if (chapter >= 17 && chapter <= 18) {
    return 'babylon-fall';           // Ch 17-18: dark, mournful
  } else if (chapter === 19) {
    return 'victory-wedding';        // Ch 19: triumphant, celebration
  } else if (chapter >= 20 && chapter <= 22) {
    return 'new-creation';           // Ch 20-22: peaceful, eternal hope
  }

  return null;
}

function getMusicUrl(bookId: string, trackName: string): string {
  return getConfigMusicUrl(bookId, `${trackName}.mp3`);
}

interface UseAudioPlayerOptions {
  bookId: string;
  chapter: number;
  onVerseChange?: (verseNumber: number) => void;
  onChapterEnd?: () => void;
}

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  isAvailable: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  currentVerseNumber: number | null;
  currentWordIndex: number | null;
  currentWord: string | null;
  currentPinyin: string | null;
  currentDefinition: string | null;
  hasEnded: boolean;
  isMusicPlaying: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  seekToVerse: (verseNumber: number) => void;
  seekToWord: (verseNumber: number, wordIndex: number) => void;
  setPlaybackRate: (rate: number) => void;
  resetEnded: () => void;
}

type PendingSeek =
  | { type: 'verse'; bookId: string; chapter: number; verseNumber: number; autoPlay: boolean }
  | { type: 'word'; bookId: string; chapter: number; verseNumber: number; wordIndex: number; autoPlay: boolean };

export function useAudioPlayer({
  bookId,
  chapter,
  onVerseChange,
  onChapterEnd,
}: UseAudioPlayerOptions): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1.0);
  const [currentVerseNumber, setCurrentVerseNumber] = useState<number | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);
  const [currentWord, setCurrentWord] = useState<string | null>(null);
  const [currentPinyin, setCurrentPinyin] = useState<string | null>(null);
  const [currentDefinition, setCurrentDefinition] = useState<string | null>(null);
  const [hasEnded, setHasEnded] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  const { setAudioPlaying, setAudioCurrentWord } = useReadingStore();
  const ambientMusicEnabled = useSettingsStore(state => state.ambientMusicEnabled);

  const audioDataRef = useRef<ChapterAudio | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const musicElementRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVerseRef = useRef<number | null>(null);
  const playbackRateRef = useRef(playbackRate);
  const lastPositionRef = useRef<{ verseNumber: number | null; wordIndex: number | null }>({
    verseNumber: null,
    wordIndex: null,
  });
  const lastCurrentTimeUpdateRef = useRef<number>(0);
  const pendingSeekRef = useRef<PendingSeek | null>(null);

  // Refs to persist last valid word data during silences
  const lastValidWordRef = useRef<string | null>(null);
  const lastValidPinyinRef = useRef<string | null>(null);
  const lastValidDefinitionRef = useRef<string | null>(null);

  // Chinese punctuation marks to filter out from display
  const PUNCTUATION = ['。', '，', '；', '：', '！', '？', '、', '「', '」', '『', '』', '（', '）', '…', '──'];

  // Keep playback rate ref in sync
  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  // Refs for Media Session callbacks to avoid stale closures
  const playRef = useRef<(() => Promise<void>) | null>(null);
  const pauseRef = useRef<(() => void) | null>(null);

  // Setup Media Session API for background playback control
  useEffect(() => {
    if (!('mediaSession' in navigator)) {
      console.log('[AudioPlayer] Media Session API not supported');
      return;
    }

    const book = getBookById(bookId);
    if (!book) return;

    // Set metadata for lock screen / notification
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${book.name.english} ${chapter}`,
      artist: 'DuBible',
      album: 'Bible Audio',
      artwork: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
    });

    console.log('[AudioPlayer] Media Session metadata set:', {
      title: `${book.name.english} ${chapter}`,
      bookId,
      chapter,
    });

    // Set up action handlers using refs to avoid stale closures
    navigator.mediaSession.setActionHandler('play', () => {
      console.log('[AudioPlayer] Media Session play action triggered');
      playRef.current?.();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      console.log('[AudioPlayer] Media Session pause action triggered');
      pauseRef.current?.();
    });

    // Note: We don't set up nexttrack/previoustrack here because those
    // need to be handled at the ReadingScreen level (chapter navigation)
    // The onChapterEnd callback will handle auto-advance

    return () => {
      // Clean up on unmount
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
      }
    };
  }, [bookId, chapter]);

  // Setup ambient music when enabled
  useEffect(() => {
    if (!ambientMusicEnabled) {
      // Clean up music if it exists
      if (musicElementRef.current) {
        musicElementRef.current.pause();
        musicElementRef.current.src = '';
        musicElementRef.current = null;
      }
      setIsMusicPlaying(false);
      return;
    }

    // Check if music is available for this book/chapter
    const trackName = getMusicTrack(bookId, chapter);
    if (!trackName) {
      setIsMusicPlaying(false);
      return;
    }

    // Create music element
    const musicUrl = getMusicUrl(bookId, trackName);
    const music = new Audio(musicUrl);
    music.loop = true;
    music.volume = 0.18; // 18% volume for subtle ambient music

    music.onloadeddata = () => {
      console.log(`[AudioPlayer] Ambient music loaded: ${trackName}`);
    };

    music.onerror = (error) => {
      console.error(`[AudioPlayer] Music load error for ${musicUrl}:`, error);
      setIsMusicPlaying(false);
    };

    musicElementRef.current = music;

    return () => {
      if (musicElementRef.current) {
        musicElementRef.current.pause();
        musicElementRef.current.src = '';
        musicElementRef.current = null;
      }
    };
  }, [bookId, chapter, ambientMusicEnabled]);

  // Load audio data and create audio element
  useEffect(() => {
    let cancelled = false;
    let loadTimeout: ReturnType<typeof setTimeout> | null = null;

    const setupAudio = async () => {
      const pending = pendingSeekRef.current;
      if (pending && (pending.bookId !== bookId || pending.chapter !== chapter)) {
        pendingSeekRef.current = null;
      }

      setIsLoading(true);
      setIsAvailable(false);

      // Reset state
      setIsPlaying(false);
      setCurrentTime(0);
      setCurrentVerseNumber(null);
      setCurrentWordIndex(null);
      setCurrentWord(null);
      setCurrentPinyin(null);
      setCurrentDefinition(null);
      setAudioPlaying(false);
      setAudioCurrentWord(null);
      setHasEnded(false);

      // Clear persisted word data refs
      lastValidWordRef.current = null;
      lastValidPinyinRef.current = null;
      lastValidDefinitionRef.current = null;

      // Clean up previous audio element
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
        audioElementRef.current = null;
      }

      // Check if the book is in the New Testament (audio only available for NT)
      const book = getBookById(bookId);
      if (!book || book.testament !== 'new') {
        console.log(`[AudioPlayer] Audio not available for ${bookId} (Old Testament)`);
        setIsLoading(false);
        setIsAvailable(false);
        return;
      }

      // Load timing data
      console.log(`[AudioPlayer] Loading audio data for ${bookId} chapter ${chapter}...`);
      const audioData = await loadChapterAudio(bookId, chapter);
      if (cancelled) return;

      if (!audioData) {
        console.log(`[AudioPlayer] No audio data available for ${bookId} chapter ${chapter}`);
        setIsLoading(false);
        setIsAvailable(false);
        return;
      }

      console.log(`[AudioPlayer] Audio data loaded successfully:`, {
        duration: audioData.duration,
        verses: audioData.verses.length,
      });

      audioDataRef.current = audioData;
      setDuration(audioData.duration);

      // Create audio element
      const audioUrl = getAudioUrl(bookId, chapter);
      console.log(`[AudioPlayer] Loading audio from: ${audioUrl}`);
      const audio = new Audio(audioUrl);
      audio.playbackRate = playbackRateRef.current;

      // Set a timeout to prevent infinite loading state
      loadTimeout = setTimeout(() => {
        if (!cancelled && audio.readyState < 2) {
          console.warn(`[AudioPlayer] Audio loading timeout for ${audioUrl}`);
          setIsLoading(false);
          setIsAvailable(false);
        }
      }, 10000); // 10 second timeout

      // Use onloadedmetadata instead of oncanplaythrough for faster feedback
      // readyState >= 1 (HAVE_METADATA) is sufficient to show the player
      audio.onloadedmetadata = () => {
        if (!cancelled) {
          console.log(`[AudioPlayer] Audio metadata loaded: ${audioUrl}`);
          if (loadTimeout) clearTimeout(loadTimeout);
          setIsLoading(false);
          setIsAvailable(true);

          // If the user requested "play from verse/word" while the audio was still loading,
          // apply it now (after metadata is available so currentTime seeking is reliable).
          const pendingSeek = pendingSeekRef.current;
          if (
            pendingSeek &&
            pendingSeek.bookId === bookId &&
            pendingSeek.chapter === chapter
          ) {
            const audioData = audioDataRef.current;
            if (audioData) {
              const verse = audioData.verses.find(v => v.verseNumber === pendingSeek.verseNumber);
              if (verse) {
                const targetTime =
                  pendingSeek.type === 'verse'
                    ? verse.startTime
                    : (verse.words.find(w => w.wordIndex === pendingSeek.wordIndex)?.startTime ?? verse.startTime);

                pendingSeekRef.current = null;
                seek(targetTime);
                if (pendingSeek.autoPlay) {
                  void play();
                }
              }
            }
          }
        }
      };

      audio.onerror = (error) => {
        if (!cancelled) {
          console.error(`[AudioPlayer] Audio load error for ${audioUrl}:`, error);
          if (loadTimeout) clearTimeout(loadTimeout);
          setIsLoading(false);
          setIsAvailable(false);
        }
      };

      // Enhanced onended handler for reliable background playback
      // Use both 'ended' event listener AND onended property for maximum reliability
      const handleEnded = () => {
        if (!cancelled) {
          console.log('[AudioPlayer] Audio ended, triggering chapter end callback');
          setIsPlaying(false);
          setAudioPlaying(false);
          setCurrentTime(0);
          setCurrentVerseNumber(null);
          setCurrentWordIndex(null);
          setCurrentDefinition(null);
          setAudioCurrentWord(null);
          setHasEnded(true);
          lastVerseRef.current = null;
          lastPositionRef.current = { verseNumber: null, wordIndex: null };
          lastCurrentTimeUpdateRef.current = 0;

          // Clear persisted word data when audio ends
          lastValidWordRef.current = null;
          lastValidPinyinRef.current = null;
          lastValidDefinitionRef.current = null;

          // Call the chapter end callback
          // Use setTimeout to ensure this runs even if the page is throttled
          setTimeout(() => {
            onChapterEnd?.();
          }, 0);
        }
      };

      audio.onended = handleEnded;
      audio.addEventListener('ended', handleEnded);

      // Start loading the audio
      audio.load();

      audioElementRef.current = audio;
    };

    setupAudio();

    return () => {
      cancelled = true;
      if (loadTimeout) clearTimeout(loadTimeout);
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
        audioElementRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [bookId, chapter, setAudioPlaying, setAudioCurrentWord, onChapterEnd]);

  // Update position based on current time (in ms)
  const updatePosition = useCallback((timeMs: number) => {
    const audioData = audioDataRef.current;
    if (!audioData) return;

    const position = getPositionAtTime(audioData, timeMs);

    // Avoid re-rendering the entire reading screen on every animation frame.
    // Only commit React state updates when the verse/word actually changes.
    const last = lastPositionRef.current;
    if (position.verseNumber === last.verseNumber && position.wordIndex === last.wordIndex) {
      return;
    }
    lastPositionRef.current = position;

    setCurrentVerseNumber(position.verseNumber);
    setCurrentWordIndex(position.wordIndex);
    setAudioCurrentWord(position.wordIndex);

    // Get word text, pinyin, and definition for display
    if (position.verseNumber !== null && position.wordIndex !== null) {
      const wordData = getWordAtPosition(bookId, chapter, position.verseNumber, position.wordIndex);
      if (wordData) {
        // Skip punctuation - keep showing last valid word instead
        if (PUNCTUATION.includes(wordData.word)) {
          setCurrentWord(lastValidWordRef.current);
          setCurrentPinyin(lastValidPinyinRef.current);
          setCurrentDefinition(lastValidDefinitionRef.current);
        } else {
          // We have valid word data - update state and persist it
          const newWord = wordData.word;
          const newPinyin = wordData.pinyin;
          const newDefinition = wordData.definition || null;

          setCurrentWord(newWord);
          setCurrentPinyin(newPinyin);
          setCurrentDefinition(newDefinition);

          // Persist for use during silences and punctuation
          lastValidWordRef.current = newWord;
          lastValidPinyinRef.current = newPinyin;
          lastValidDefinitionRef.current = newDefinition;
        }
      } else {
        // No word data at this position - keep showing last valid word (during silences)
        setCurrentWord(lastValidWordRef.current);
        setCurrentPinyin(lastValidPinyinRef.current);
        setCurrentDefinition(lastValidDefinitionRef.current);
      }
    } else {
      // No position at all - keep showing last valid word (during silences)
      setCurrentWord(lastValidWordRef.current);
      setCurrentPinyin(lastValidPinyinRef.current);
      setCurrentDefinition(lastValidDefinitionRef.current);
    }

    // Log position updates periodically (every verse change)
    if (position.verseNumber !== null && position.verseNumber !== lastVerseRef.current) {
      lastVerseRef.current = position.verseNumber;
      console.log(`[AudioPlayer] Position update: verse ${position.verseNumber}, word ${position.wordIndex}, time ${timeMs.toFixed(0)}ms`);
      onVerseChange?.(position.verseNumber);
    }
  }, [bookId, chapter, setAudioCurrentWord, onVerseChange]);

  // Real audio playback time tracking loop
  const tick = useCallback(() => {
    const audio = audioElementRef.current;
    if (!audio || !isPlaying) return;

    const timeMs = audio.currentTime * 1000;
    // Throttle time updates (progress bar) to reduce re-render pressure.
    // Keeping this lightweight helps prevent skipped word highlights on long chapters.
    const TIME_UPDATE_INTERVAL_MS = 120;
    if (
      timeMs < lastCurrentTimeUpdateRef.current ||
      timeMs - lastCurrentTimeUpdateRef.current >= TIME_UPDATE_INTERVAL_MS
    ) {
      lastCurrentTimeUpdateRef.current = timeMs;
      startTransition(() => {
        setCurrentTime(timeMs);
      });
    }
    updatePosition(timeMs);

    animationFrameRef.current = requestAnimationFrame(tick);
  }, [isPlaying, updatePosition]);

  // Start/stop time tracking when playing state changes
  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(tick);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, tick]);

  const play = useCallback(async () => {
    const audio = audioElementRef.current;
    const canPlay = Boolean(audio && (isAvailable || audio.readyState >= 1));
    if (!canPlay) {
      console.warn('[AudioPlayer] Cannot play: audio element not ready or not available');
      return;
    }

    try {
      console.log('[AudioPlayer] Starting playback...');
      await audio!.play();
      setIsPlaying(true);
      setAudioPlaying(true);
      console.log('[AudioPlayer] Playback started successfully');

      // Update Media Session playback state
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }

      // Start ambient music if available and enabled
      const music = musicElementRef.current;
      if (music && ambientMusicEnabled) {
        try {
          await music.play();
          setIsMusicPlaying(true);
          console.log('[AudioPlayer] Ambient music started');
        } catch (error) {
          console.error('[AudioPlayer] Failed to play ambient music:', error);
        }
      }
    } catch (error) {
      console.error('[AudioPlayer] Failed to play audio:', error);
    }
  }, [isAvailable, setAudioPlaying, ambientMusicEnabled]);

  const pause = useCallback(() => {
    const audio = audioElementRef.current;
    if (audio) {
      console.log('[AudioPlayer] Pausing playback');
      audio.pause();
    }
    setIsPlaying(false);
    setAudioPlaying(false);

    // Update Media Session playback state
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }

    // Pause ambient music
    const music = musicElementRef.current;
    if (music) {
      music.pause();
      setIsMusicPlaying(false);
      console.log('[AudioPlayer] Ambient music paused');
    }
  }, [setAudioPlaying]);

  // Keep play/pause refs in sync for Media Session API
  useEffect(() => {
    playRef.current = play;
    pauseRef.current = pause;
  }, [play, pause]);

  const toggle = useCallback(async () => {
    if (isPlaying) {
      pause();
    } else {
      await play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((timeMs: number) => {
    const audio = audioElementRef.current;
    if (!audio) return;

    const maxDuration = audioDataRef.current?.duration ?? duration;
    const clampedTime = Math.max(
      0,
      Number.isFinite(maxDuration) && maxDuration > 0 ? Math.min(timeMs, maxDuration) : timeMs
    );
    audio.currentTime = clampedTime / 1000;
    setCurrentTime(clampedTime);
    updatePosition(clampedTime);
  }, [duration, updatePosition]);

  const seekToVerse = useCallback((verseNumber: number) => {
    console.log('[AudioPlayer] seekToVerse called with verse:', verseNumber);
    const audioData = audioDataRef.current;
    const audio = audioElementRef.current;

    // If the audio isn't ready yet, queue the seek and apply it on `loadedmetadata`.
    if (!audioData || !audio || audio.readyState < 1) {
      pendingSeekRef.current = { type: 'verse', bookId, chapter, verseNumber, autoPlay: true };
      console.warn('[AudioPlayer] seekToVerse queued until audio is ready:', {
        verseNumber,
        hasAudioData: Boolean(audioData),
        readyState: audio?.readyState,
      });
      return;
    }

    const verse = audioData.verses.find(v => v.verseNumber === verseNumber);
    if (!verse) {
      console.warn('[AudioPlayer] seekToVerse: Verse not found:', verseNumber);
      return;
    }

    pendingSeekRef.current = null;
    console.log('[AudioPlayer] Found verse:', { verseNumber, startTime: verse.startTime, wordCount: verse.words.length });

    // Check actual audio element state to avoid stale closure issues
    const wasPlaying = !audio.paused;

    // Pause first if playing to ensure clean seek (stops the tick loop)
    if (wasPlaying) {
      pause();
    }

    // Seek to the verse's position
    console.log('[AudioPlayer] Seeking to time:', verse.startTime);
    seek(verse.startTime);

    // Always resume playback from new position (user explicitly requested "play from here")
    // Defer one tick so the browser applies `currentTime` before playback resumes.
    setTimeout(() => {
      console.log('[AudioPlayer] Starting playback after seek');
      void play();
    }, 0);
  }, [bookId, chapter, seek, play, pause]);

  const seekToWord = useCallback((verseNumber: number, wordIndex: number) => {
    const audioData = audioDataRef.current;
    const audio = audioElementRef.current;

    // If the audio isn't ready yet, queue the seek and apply it on `loadedmetadata`.
    if (!audioData || !audio || audio.readyState < 1) {
      pendingSeekRef.current = { type: 'word', bookId, chapter, verseNumber, wordIndex, autoPlay: true };
      console.warn('[AudioPlayer] seekToWord queued until audio is ready:', {
        verseNumber,
        wordIndex,
        hasAudioData: Boolean(audioData),
        readyState: audio?.readyState,
      });
      return;
    }

    const verse = audioData.verses.find(v => v.verseNumber === verseNumber);
    if (!verse) return;

    const word = verse.words.find(w => w.wordIndex === wordIndex);
    if (!word) return;

    pendingSeekRef.current = null;
    // Check actual audio element state to avoid stale closure issues
    const wasPlaying = !audio.paused;

    // Pause first if playing to ensure clean seek (stops the tick loop)
    if (wasPlaying) {
      pause();
    }

    // Seek to the word's position
    seek(word.startTime);

    // Always resume playback from new position (user explicitly requested "play from here")
    // Defer one tick so the browser applies `currentTime` before playback resumes.
    setTimeout(() => {
      void play();
    }, 0);
  }, [bookId, chapter, seek, play, pause]);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    const audio = audioElementRef.current;
    if (audio) {
      audio.playbackRate = rate;
    }
  }, []);

  const resetEnded = useCallback(() => {
    setHasEnded(false);
  }, []);

  return {
    isPlaying,
    isAvailable,
    isLoading,
    currentTime,
    duration,
    playbackRate,
    currentVerseNumber,
    currentWordIndex,
    currentWord,
    currentPinyin,
    currentDefinition,
    hasEnded,
    isMusicPlaying,
    play,
    pause,
    toggle,
    seek,
    seekToVerse,
    seekToWord,
    setPlaybackRate,
    resetEnded,
  };
}
