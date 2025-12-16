import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import type { ReadingStreak, DailyReading, ChapterRead, BookProgress } from '../types/progress';
import { BIBLE_BOOKS } from '../data/bible/books';

// Helper to get today's date string
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// Helper to get yesterday's date string
function getYesterdayString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

// Helper to check if two dates are consecutive
function areConsecutiveDays(date1: string, date2: string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

interface ProgressState {
  // Chapters completed
  chaptersCompleted: string[]; // "bookId:chapter" format

  // Per-book progress
  bookProgress: Record<string, BookProgress>;

  // Streak data
  streak: ReadingStreak;

  // Daily history (last 60 days)
  dailyHistory: DailyReading[];

  // Actions
  markChapterRead: (bookId: string, chapter: number, versesRead?: number) => void;
  getBookProgress: (bookId: string) => BookProgress | null;
  getTotalProgress: () => { chaptersRead: number; totalChapters: number; percent: number };
  getTestamentProgress: (testament: 'old' | 'new') => { chaptersRead: number; totalChapters: number; percent: number };
  getTodayReading: () => DailyReading | null;
  getWeekHistory: () => DailyReading[];
  resetProgress: () => void;
}

const initialStreak: ReadingStreak = {
  currentStreak: 0,
  longestStreak: 0,
  lastReadDate: null,
  streakStartDate: null,
};

export const useProgressStore = create<ProgressState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
      chaptersCompleted: [],
      bookProgress: {},
      streak: initialStreak,
      dailyHistory: [],

      markChapterRead: (bookId: string, chapter: number, versesRead = 0) => {
        const today = getTodayString();
        const yesterday = getYesterdayString();
        const chapterKey = `${bookId}:${chapter}`;
        const timestamp = Date.now();

        set((state) => {
          // Add to completed chapters if not already there
          const newCompleted = state.chaptersCompleted.includes(chapterKey)
            ? state.chaptersCompleted
            : [...state.chaptersCompleted, chapterKey];

          // Update book progress
          const book = BIBLE_BOOKS.find(b => b.id === bookId);
          const existingBookProgress = state.bookProgress[bookId] || {
            bookId,
            chaptersRead: [],
            lastReadChapter: 0,
            lastReadTimestamp: 0,
            percentComplete: 0,
          };

          const newChaptersRead = existingBookProgress.chaptersRead.includes(chapter)
            ? existingBookProgress.chaptersRead
            : [...existingBookProgress.chaptersRead, chapter].sort((a, b) => a - b);

          const newBookProgress: BookProgress = {
            ...existingBookProgress,
            chaptersRead: newChaptersRead,
            lastReadChapter: chapter,
            lastReadTimestamp: timestamp,
            percentComplete: book ? Math.round((newChaptersRead.length / book.chapterCount) * 100) : 0,
          };

          // Update streak
          let newStreak = { ...state.streak };
          const { lastReadDate } = state.streak;

          if (lastReadDate !== today) {
            // First read of the day
            if (lastReadDate === yesterday || lastReadDate === null) {
              // Continuing streak or starting new one
              newStreak.currentStreak = lastReadDate === null ? 1 : state.streak.currentStreak + 1;
              if (lastReadDate === null) {
                newStreak.streakStartDate = today;
              }
            } else if (lastReadDate && !areConsecutiveDays(lastReadDate, today)) {
              // Streak broken - reset
              newStreak.currentStreak = 1;
              newStreak.streakStartDate = today;
            }

            newStreak.lastReadDate = today;
            newStreak.longestStreak = Math.max(newStreak.longestStreak, newStreak.currentStreak);
          }

          // Update daily history
          const newDailyHistory = [...state.dailyHistory];
          const todayIndex = newDailyHistory.findIndex(d => d.date === today);

          const chapterRead: ChapterRead = {
            bookId,
            chapter,
            timestamp,
            versesRead,
          };

          if (todayIndex >= 0) {
            // Add to existing day's reading
            const existingChapterIndex = newDailyHistory[todayIndex].chaptersRead
              .findIndex(c => c.bookId === bookId && c.chapter === chapter);

            if (existingChapterIndex < 0) {
              newDailyHistory[todayIndex] = {
                ...newDailyHistory[todayIndex],
                chaptersRead: [...newDailyHistory[todayIndex].chaptersRead, chapterRead],
                totalVerses: newDailyHistory[todayIndex].totalVerses + versesRead,
              };
            }
          } else {
            // Create new day entry
            newDailyHistory.push({
              date: today,
              chaptersRead: [chapterRead],
              totalVerses: versesRead,
            });
          }

          // Keep only last 60 days
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - 60);
          const cutoffString = cutoffDate.toISOString().split('T')[0];
          const filteredHistory = newDailyHistory.filter(d => d.date >= cutoffString);

          return {
            chaptersCompleted: newCompleted,
            bookProgress: {
              ...state.bookProgress,
              [bookId]: newBookProgress,
            },
            streak: newStreak,
            dailyHistory: filteredHistory,
          };
        });
      },

      getBookProgress: (bookId: string) => {
        return get().bookProgress[bookId] || null;
      },

      getTotalProgress: () => {
        const totalChapters = BIBLE_BOOKS.reduce((sum, book) => sum + book.chapterCount, 0);
        const chaptersRead = get().chaptersCompleted.length;
        return {
          chaptersRead,
          totalChapters,
          percent: Math.round((chaptersRead / totalChapters) * 100),
        };
      },

      getTestamentProgress: (testament: 'old' | 'new') => {
        const books = BIBLE_BOOKS.filter(b => b.testament === testament);
        const totalChapters = books.reduce((sum, book) => sum + book.chapterCount, 0);
        const chaptersRead = get().chaptersCompleted.filter(key => {
          const bookId = key.split(':')[0];
          return books.some(b => b.id === bookId);
        }).length;
        return {
          chaptersRead,
          totalChapters,
          percent: Math.round((chaptersRead / totalChapters) * 100),
        };
      },

      getTodayReading: () => {
        const today = getTodayString();
        return get().dailyHistory.find(d => d.date === today) || null;
      },

      getWeekHistory: () => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoString = weekAgo.toISOString().split('T')[0];
        return get().dailyHistory.filter(d => d.date >= weekAgoString);
      },

      resetProgress: () => {
        set({
          chaptersCompleted: [],
          bookProgress: {},
          streak: initialStreak,
          dailyHistory: [],
        });
      },
      }),
      {
        name: 'reading-progress-storage',
        version: 1,
      }
    )
  )
);
