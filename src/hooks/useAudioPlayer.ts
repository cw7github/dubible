import { useState, useCallback, useRef, useEffect } from 'react';
import { useReadingStore } from '../stores';
import { loadChapterAudio, getPositionAtTime, getAudioUrl } from '../data/audio';
import type { ChapterAudio } from '../types';

interface UseAudioPlayerOptions {
  bookId: string;
  chapter: number;
  onVerseChange?: (verseNumber: number) => void;
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
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  seekToVerse: (verseNumber: number) => void;
  seekToWord: (verseNumber: number, wordIndex: number) => void;
  setPlaybackRate: (rate: number) => void;
}

export function useAudioPlayer({
  bookId,
  chapter,
  onVerseChange,
}: UseAudioPlayerOptions): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(0.85);
  const [currentVerseNumber, setCurrentVerseNumber] = useState<number | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);

  const { setAudioPlaying, setAudioCurrentWord } = useReadingStore();

  const audioDataRef = useRef<ChapterAudio | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVerseRef = useRef<number | null>(null);
  const playbackRateRef = useRef(playbackRate);

  // Keep playback rate ref in sync
  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  // Load audio data and create audio element
  useEffect(() => {
    let cancelled = false;
    let loadTimeout: ReturnType<typeof setTimeout> | null = null;

    const setupAudio = async () => {
      setIsLoading(true);
      setIsAvailable(false);

      // Reset state
      setIsPlaying(false);
      setCurrentTime(0);
      setCurrentVerseNumber(null);
      setCurrentWordIndex(null);
      setAudioPlaying(false);
      setAudioCurrentWord(null);

      // Clean up previous audio element
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
        audioElementRef.current = null;
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

      audio.onended = () => {
        if (!cancelled) {
          setIsPlaying(false);
          setAudioPlaying(false);
          setCurrentTime(0);
          setCurrentVerseNumber(null);
          setCurrentWordIndex(null);
          setAudioCurrentWord(null);
        }
      };

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
  }, [bookId, chapter, setAudioPlaying, setAudioCurrentWord]);

  // Update position based on current time (in ms)
  const updatePosition = useCallback((timeMs: number) => {
    const audioData = audioDataRef.current;
    if (!audioData) return;

    const position = getPositionAtTime(audioData, timeMs);

    setCurrentVerseNumber(position.verseNumber);
    setCurrentWordIndex(position.wordIndex);
    setAudioCurrentWord(position.wordIndex);

    // Log position updates periodically (every verse change)
    if (position.verseNumber !== null && position.verseNumber !== lastVerseRef.current) {
      lastVerseRef.current = position.verseNumber;
      console.log(`[AudioPlayer] Position update: verse ${position.verseNumber}, word ${position.wordIndex}, time ${timeMs.toFixed(0)}ms`);
      onVerseChange?.(position.verseNumber);
    }
  }, [setAudioCurrentWord, onVerseChange]);

  // Real audio playback time tracking loop
  const tick = useCallback(() => {
    const audio = audioElementRef.current;
    if (!audio || !isPlaying) return;

    const timeMs = audio.currentTime * 1000;
    setCurrentTime(timeMs);
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
    if (!audio || !isAvailable) {
      console.warn('[AudioPlayer] Cannot play: audio element not ready or not available');
      return;
    }

    try {
      console.log('[AudioPlayer] Starting playback...');
      await audio.play();
      setIsPlaying(true);
      setAudioPlaying(true);
      console.log('[AudioPlayer] Playback started successfully');
    } catch (error) {
      console.error('[AudioPlayer] Failed to play audio:', error);
    }
  }, [isAvailable, setAudioPlaying]);

  const pause = useCallback(() => {
    const audio = audioElementRef.current;
    if (audio) {
      console.log('[AudioPlayer] Pausing playback');
      audio.pause();
    }
    setIsPlaying(false);
    setAudioPlaying(false);
  }, [setAudioPlaying]);

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

    const clampedTime = Math.max(0, Math.min(timeMs, duration));
    audio.currentTime = clampedTime / 1000;
    setCurrentTime(clampedTime);
    updatePosition(clampedTime);
  }, [duration, updatePosition]);

  const seekToVerse = useCallback((verseNumber: number) => {
    const audioData = audioDataRef.current;
    if (!audioData) return;

    const verse = audioData.verses.find(v => v.verseNumber === verseNumber);
    if (verse) {
      seek(verse.startTime);
    }
  }, [seek]);

  const seekToWord = useCallback((verseNumber: number, wordIndex: number) => {
    const audioData = audioDataRef.current;
    if (!audioData) return;

    const verse = audioData.verses.find(v => v.verseNumber === verseNumber);
    if (!verse) return;

    const word = verse.words.find(w => w.wordIndex === wordIndex);
    if (word) {
      seek(word.startTime);
      // Auto-play when seeking to word
      if (!isPlaying) {
        play();
      }
    }
  }, [seek, isPlaying, play]);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    const audio = audioElementRef.current;
    if (audio) {
      audio.playbackRate = rate;
    }
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
    play,
    pause,
    toggle,
    seek,
    seekToVerse,
    seekToWord,
    setPlaybackRate,
  };
}
