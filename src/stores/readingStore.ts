import { create } from 'zustand';
import type { Book, Chapter, VerseReference, SegmentedWord } from '../types';

interface ReadingState {
  // Current position
  currentBookId: string;
  currentChapter: number;
  currentVerse: number | null;

  // Loaded data
  currentBook: Book | null;
  loadedChapters: Map<string, Chapter>; // key: `${bookId}-${chapter}`

  // UI state
  isLoading: boolean;
  error: string | null;

  // Selected word for definition card
  selectedWord: SegmentedWord | null;
  selectedWordVerse: VerseReference | null;

  // Audio state
  isAudioPlaying: boolean;
  audioCurrentWord: number | null;

  // Actions
  setCurrentPosition: (bookId: string, chapter: number, verse?: number) => void;
  setCurrentBook: (book: Book | null) => void;
  addLoadedChapter: (bookId: string, chapterNum: number, chapter: Chapter) => void;
  clearLoadedChapters: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  selectWord: (word: SegmentedWord | null, verse?: VerseReference) => void;
  clearSelectedWord: () => void;
  setAudioPlaying: (isPlaying: boolean) => void;
  setAudioCurrentWord: (wordIndex: number | null) => void;
}

export const useReadingStore = create<ReadingState>((set, get) => ({
  // Initial state - Matthew 1 (common starting point)
  currentBookId: 'matthew',
  currentChapter: 1,
  currentVerse: null,

  currentBook: null,
  loadedChapters: new Map(),

  isLoading: false,
  error: null,

  selectedWord: null,
  selectedWordVerse: null,

  isAudioPlaying: false,
  audioCurrentWord: null,

  setCurrentPosition: (bookId, chapter, verse) => {
    set({
      currentBookId: bookId,
      currentChapter: chapter,
      currentVerse: verse ?? null,
    });
  },

  setCurrentBook: (book) => set({ currentBook: book }),

  addLoadedChapter: (bookId, chapterNum, chapter) => {
    const key = `${bookId}-${chapterNum}`;
    const newMap = new Map(get().loadedChapters);
    newMap.set(key, chapter);
    set({ loadedChapters: newMap });
  },

  clearLoadedChapters: () => set({ loadedChapters: new Map() }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  selectWord: (word, verse) =>
    set({
      selectedWord: word,
      selectedWordVerse: verse ?? null,
    }),

  clearSelectedWord: () =>
    set({
      selectedWord: null,
      selectedWordVerse: null,
    }),

  setAudioPlaying: (isAudioPlaying) => {
    document.documentElement.setAttribute(
      'data-audio-playing',
      String(isAudioPlaying)
    );
    set({ isAudioPlaying });
  },

  setAudioCurrentWord: (audioCurrentWord) => set({ audioCurrentWord }),
}));
