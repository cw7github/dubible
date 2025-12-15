import { useState, useCallback, useRef, useEffect } from 'react';
import { useReadingStore } from '../stores';
import { getChapterAudio, getPositionAtTime } from '../data/audio';
import type { ChapterAudio } from '../types';

interface UseAudioPlayerOptions {
  bookId: string;
  chapter: number;
  onVerseChange?: (verseNumber: number) => void;
}

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  isAvailable: boolean;
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
  setPlaybackRate: (rate: number) => void;
}

export function useAudioPlayer({
  bookId,
  chapter,
  onVerseChange,
}: UseAudioPlayerOptions): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [currentVerseNumber, setCurrentVerseNumber] = useState<number | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);

  const { setAudioPlaying, setAudioCurrentWord } = useReadingStore();

  const audioDataRef = useRef<ChapterAudio | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const playbackStartRef = useRef<number>(0);
  const lastVerseRef = useRef<number | null>(null);

  // Get audio data for current chapter
  useEffect(() => {
    audioDataRef.current = getChapterAudio(bookId, chapter);
    // Reset playback state when chapter changes
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentVerseNumber(null);
    setCurrentWordIndex(null);
    setAudioPlaying(false);
    setAudioCurrentWord(null);
  }, [bookId, chapter, setAudioPlaying, setAudioCurrentWord]);

  const isAvailable = audioDataRef.current !== null;
  const duration = audioDataRef.current?.duration || 0;

  // Update position based on current time
  const updatePosition = useCallback((time: number) => {
    const audioData = audioDataRef.current;
    if (!audioData) return;

    const position = getPositionAtTime(audioData, time);

    setCurrentVerseNumber(position.verseNumber);
    setCurrentWordIndex(position.wordIndex);
    setAudioCurrentWord(position.wordIndex);

    // Notify when verse changes
    if (position.verseNumber !== null && position.verseNumber !== lastVerseRef.current) {
      lastVerseRef.current = position.verseNumber;
      onVerseChange?.(position.verseNumber);
    }
  }, [setAudioCurrentWord, onVerseChange]);

  // Playback simulation loop (since we don't have real audio)
  const tick = useCallback(() => {
    if (!isPlaying) return;

    const elapsed = (Date.now() - startTimeRef.current) * playbackRate;
    const newTime = playbackStartRef.current + elapsed;

    if (newTime >= duration) {
      // Playback finished
      setIsPlaying(false);
      setAudioPlaying(false);
      setCurrentTime(duration);
      setCurrentVerseNumber(null);
      setCurrentWordIndex(null);
      setAudioCurrentWord(null);
      return;
    }

    setCurrentTime(newTime);
    updatePosition(newTime);

    animationFrameRef.current = requestAnimationFrame(tick);
  }, [isPlaying, duration, playbackRate, updatePosition, setAudioPlaying, setAudioCurrentWord]);

  // Start/stop animation loop
  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = Date.now();
      playbackStartRef.current = currentTime;
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
  }, [isPlaying, tick, currentTime]);

  const play = useCallback(() => {
    if (!isAvailable) return;
    setIsPlaying(true);
    setAudioPlaying(true);
  }, [isAvailable, setAudioPlaying]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    setAudioPlaying(false);
    setAudioCurrentWord(null);
  }, [setAudioPlaying, setAudioCurrentWord]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    const clampedTime = Math.max(0, Math.min(time, duration));
    setCurrentTime(clampedTime);
    playbackStartRef.current = clampedTime;
    startTimeRef.current = Date.now();
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

  const setPlaybackRate = useCallback((rate: number) => {
    // When changing rate mid-playback, adjust timing references
    if (isPlaying) {
      playbackStartRef.current = currentTime;
      startTimeRef.current = Date.now();
    }
    setPlaybackRateState(rate);
  }, [isPlaying, currentTime]);

  return {
    isPlaying,
    isAvailable,
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
    setPlaybackRate,
  };
}
