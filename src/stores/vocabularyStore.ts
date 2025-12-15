import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  SavedWord,
  SRSData,
  ReviewResult,
  VocabularyStats,
  VerseReference,
} from '../types';

// Simple SRS intervals (in days)
const SRS_INTERVALS = {
  again: 1, // Review tomorrow
  good: [1, 3, 7, 14, 30, 60], // Progressive intervals
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function calculateNextReview(srsData: SRSData, result: ReviewResult): SRSData {
  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;

  if (result === 'again') {
    return {
      interval: SRS_INTERVALS.again,
      streak: 0,
      lastReview: now,
      nextReview: now + SRS_INTERVALS.again * dayInMs,
      status: 'learning',
    };
  }

  // result === 'good'
  const newStreak = srsData.streak + 1;
  const intervalIndex = Math.min(newStreak, SRS_INTERVALS.good.length - 1);
  const newInterval = SRS_INTERVALS.good[intervalIndex];

  let status: SRSData['status'] = 'reviewing';
  if (newStreak >= 4) {
    status = 'mastered';
  } else if (newStreak === 0) {
    status = 'learning';
  }

  return {
    interval: newInterval,
    streak: newStreak,
    lastReview: now,
    nextReview: now + newInterval * dayInMs,
    status,
  };
}

interface VocabularyState {
  words: SavedWord[];

  // Actions
  addWord: (
    chinese: string,
    pinyin: string,
    definition: string,
    sourceVerse: VerseReference,
    partOfSpeech?: string,
    hskLevel?: number
  ) => void;
  removeWord: (wordId: string) => void;
  isWordSaved: (chinese: string) => boolean;
  getWordByChars: (chinese: string) => SavedWord | undefined;
  reviewWord: (wordId: string, result: ReviewResult) => void;
  getWordsDueForReview: () => SavedWord[];
  getStats: () => VocabularyStats;
  clearAllWords: () => void;
}

export const useVocabularyStore = create<VocabularyState>()(
  persist(
    (set, get) => ({
      words: [],

      addWord: (chinese, pinyin, definition, sourceVerse, partOfSpeech, hskLevel) => {
        // Don't add duplicates
        if (get().isWordSaved(chinese)) {
          return;
        }

        const now = Date.now();
        const newWord: SavedWord = {
          id: generateId(),
          chinese,
          pinyin,
          definition,
          partOfSpeech,
          hskLevel,
          sourceVerse,
          srsData: {
            interval: 1,
            streak: 0,
            lastReview: null,
            nextReview: now, // Due immediately for first review
            status: 'learning',
          },
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          words: [newWord, ...state.words],
        }));
      },

      removeWord: (wordId) => {
        set((state) => ({
          words: state.words.filter((w) => w.id !== wordId),
        }));
      },

      isWordSaved: (chinese) => {
        return get().words.some((w) => w.chinese === chinese);
      },

      getWordByChars: (chinese) => {
        return get().words.find((w) => w.chinese === chinese);
      },

      reviewWord: (wordId, result) => {
        set((state) => ({
          words: state.words.map((word) => {
            if (word.id !== wordId) return word;

            return {
              ...word,
              srsData: calculateNextReview(word.srsData, result),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      getWordsDueForReview: () => {
        const now = Date.now();
        return get().words.filter((word) => word.srsData.nextReview <= now);
      },

      getStats: () => {
        const words = get().words;
        const now = Date.now();

        return {
          totalWords: words.length,
          masteredWords: words.filter((w) => w.srsData.status === 'mastered').length,
          learningWords: words.filter((w) => w.srsData.status === 'learning').length,
          reviewingWords: words.filter((w) => w.srsData.status === 'reviewing').length,
          dueForReview: words.filter((w) => w.srsData.nextReview <= now).length,
        };
      },

      clearAllWords: () => set({ words: [] }),
    }),
    {
      name: 'bilingual-bible-vocabulary',
    }
  )
);
