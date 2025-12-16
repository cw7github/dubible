/**
 * @deprecated This hook is deprecated. Use useAudioPlayer from './useAudioPlayer' instead.
 *
 * useAudioSync - Hook for word-synchronized audio playback
 *
 * NOTE: This is a duplicate implementation. The main audio player implementation
 * is in useAudioPlayer.ts which is used by the app. This file is kept for
 * reference but should not be used in production code.
 *
 * Manages:
 * - Loading audio timing data
 * - Audio playback state
 * - Word/verse tracking synced to audio time
 * - Seeking to specific words
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// Types for audio timing data
interface WordTiming {
  wordIndex: number;
  startTime: number;
  endTime: number;
}

interface VerseAudioTiming {
  verseNumber: number;
  startTime: number;
  endTime: number;
  words: WordTiming[];
}

interface ChapterAudio {
  bookId: string;
  chapter: number;
  audioUrl: string;
  duration: number;
  voiceId: string;
  modelId: string;
  generatedAt: string;
  verses: VerseAudioTiming[];
}

interface AudioSyncState {
  isAvailable: boolean;
  isLoading: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  currentVerse: number | null;
  currentWordIndex: number | null;
  error: string | null;
}

interface UseAudioSyncReturn extends AudioSyncState {
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => Promise<void>;
  seekTo: (time: number) => void;
  seekToWord: (verseNumber: number, wordIndex: number) => void;
  seekToVerse: (verseNumber: number) => void;
  setPlaybackRate: (rate: number) => void;
  close: () => void;
}

export function useAudioSync(
  bookId: string,
  chapter: number
): UseAudioSyncReturn {
  const [audioData, setAudioData] = useState<ChapterAudio | null>(null);
  const [state, setState] = useState<AudioSyncState>({
    isAvailable: false,
    isLoading: true,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
    currentVerse: null,
    currentWordIndex: null,
    error: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Load audio timing data
  useEffect(() => {
    const loadAudioData = async () => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const timingUrl = `/audio/${bookId}/chapter-${chapter}-timing.json`;
        const response = await fetch(timingUrl);

        if (!response.ok) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isAvailable: false,
          }));
          return;
        }

        const data: ChapterAudio = await response.json();
        setAudioData(data);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isAvailable: true,
          duration: data.duration * 1000, // Convert to ms for consistency
        }));
      } catch {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isAvailable: false,
          error: 'Failed to load audio data',
        }));
      }
    };

    loadAudioData();

    // Cleanup on unmount or chapter change
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [bookId, chapter]);

  // Find current verse and word based on time (in seconds)
  const findCurrentPosition = useCallback(
    (timeInSeconds: number) => {
      if (!audioData) return { verse: null, word: null };

      for (const verse of audioData.verses) {
        if (timeInSeconds >= verse.startTime && timeInSeconds <= verse.endTime) {
          // Find current word within verse
          for (const word of verse.words) {
            if (timeInSeconds >= word.startTime && timeInSeconds <= word.endTime) {
              return { verse: verse.verseNumber, word: word.wordIndex };
            }
          }
          return { verse: verse.verseNumber, word: null };
        }
      }

      return { verse: null, word: null };
    },
    [audioData]
  );

  // Update time tracking loop
  const updateTime = useCallback(() => {
    if (audioRef.current && state.isPlaying) {
      const timeInSeconds = audioRef.current.currentTime;
      const timeInMs = timeInSeconds * 1000;

      const { verse, word } = findCurrentPosition(timeInSeconds);

      setState((prev) => ({
        ...prev,
        currentTime: timeInMs,
        currentVerse: verse,
        currentWordIndex: word,
      }));

      animationFrameRef.current = requestAnimationFrame(updateTime);
    }
  }, [state.isPlaying, findCurrentPosition]);

  // Start/stop time tracking when playing state changes
  useEffect(() => {
    if (state.isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTime);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state.isPlaying, updateTime]);

  // Initialize audio element
  const initAudio = useCallback(() => {
    if (!audioData || audioRef.current) return audioRef.current;

    const audio = new Audio(`/${audioData.audioUrl}`);
    audio.playbackRate = state.playbackRate;

    audio.onended = () => {
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        currentTime: 0,
        currentVerse: null,
        currentWordIndex: null,
      }));
    };

    audio.onerror = () => {
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        error: 'Failed to play audio',
      }));
    };

    audioRef.current = audio;
    return audio;
  }, [audioData, state.playbackRate]);

  // Play
  const play = useCallback(async () => {
    const audio = initAudio();
    if (!audio) return;

    try {
      await audio.play();
      setState((prev) => ({ ...prev, isPlaying: true, error: null }));
    } catch {
      setState((prev) => ({ ...prev, error: 'Failed to play audio' }));
    }
  }, [initAudio]);

  // Pause
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState((prev) => ({ ...prev, isPlaying: false }));
    }
  }, []);

  // Toggle play/pause
  const toggle = useCallback(async () => {
    if (state.isPlaying) {
      pause();
    } else {
      await play();
    }
  }, [state.isPlaying, play, pause]);

  // Seek to time (in ms)
  const seekTo = useCallback((timeInMs: number) => {
    const audio = audioRef.current || initAudio();
    if (audio) {
      audio.currentTime = timeInMs / 1000;
      setState((prev) => ({ ...prev, currentTime: timeInMs }));
    }
  }, [initAudio]);

  // Seek to specific word
  const seekToWord = useCallback(
    (verseNumber: number, wordIndex: number) => {
      if (!audioData) return;

      const verse = audioData.verses.find((v) => v.verseNumber === verseNumber);
      if (!verse) return;

      const word = verse.words.find((w) => w.wordIndex === wordIndex);
      if (word) {
        const audio = audioRef.current || initAudio();
        if (audio) {
          audio.currentTime = word.startTime;
          setState((prev) => ({
            ...prev,
            currentTime: word.startTime * 1000,
            currentVerse: verseNumber,
            currentWordIndex: wordIndex,
          }));

          // Auto-play if not already playing
          if (!state.isPlaying) {
            play();
          }
        }
      }
    },
    [audioData, initAudio, state.isPlaying, play]
  );

  // Seek to verse start
  const seekToVerse = useCallback(
    (verseNumber: number) => {
      if (!audioData) return;

      const verse = audioData.verses.find((v) => v.verseNumber === verseNumber);
      if (verse) {
        const audio = audioRef.current || initAudio();
        if (audio) {
          audio.currentTime = verse.startTime;
          setState((prev) => ({
            ...prev,
            currentTime: verse.startTime * 1000,
            currentVerse: verseNumber,
            currentWordIndex: null,
          }));
        }
      }
    },
    [audioData, initAudio]
  );

  // Set playback rate
  const setPlaybackRate = useCallback((rate: number) => {
    setState((prev) => ({ ...prev, playbackRate: rate }));
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  // Close/reset player
  const close = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      currentTime: 0,
      currentVerse: null,
      currentWordIndex: null,
    }));
  }, []);

  return {
    ...state,
    play,
    pause,
    toggle,
    seekTo,
    seekToWord,
    seekToVerse,
    setPlaybackRate,
    close,
  };
}

export default useAudioSync;
