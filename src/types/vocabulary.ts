// Vocabulary and SRS types

import type { VerseReference } from './bible';

export interface SavedWord {
  id: string;
  chinese: string;
  pinyin: string;
  definition: string;
  partOfSpeech?: string;
  hskLevel?: number;
  // Where this word was first encountered
  sourceVerse: VerseReference;
  // SRS data
  srsData: SRSData;
  // Timestamps
  createdAt: number;
  updatedAt: number;
}

export interface SRSData {
  // Current interval in days
  interval: number;
  // Number of consecutive correct reviews
  streak: number;
  // Last review timestamp
  lastReview: number | null;
  // Next review timestamp
  nextReview: number;
  // Mastery level: 'learning' | 'reviewing' | 'mastered'
  status: 'learning' | 'reviewing' | 'mastered';
}

export type ReviewResult = 'again' | 'good';

export interface FlashcardSession {
  words: SavedWord[];
  currentIndex: number;
  results: {
    wordId: string;
    result: ReviewResult;
  }[];
  startedAt: number;
}

export interface VocabularyStats {
  totalWords: number;
  masteredWords: number;
  learningWords: number;
  reviewingWords: number;
  dueForReview: number;
}
