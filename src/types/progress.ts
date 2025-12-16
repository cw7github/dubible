// Reading progress and streak tracking types

export interface DailyReading {
  date: string; // YYYY-MM-DD format
  chaptersRead: ChapterRead[];
  totalVerses: number;
  minutesSpent?: number;
}

export interface ChapterRead {
  bookId: string;
  chapter: number;
  timestamp: number;
  versesRead: number;
}

export interface ReadingStreak {
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string | null; // YYYY-MM-DD
  streakStartDate: string | null;
}

export interface ReadingProgress {
  // Chapters completed (fully scrolled through)
  chaptersCompleted: Set<string>; // "bookId:chapter" format
  // Per-book progress
  bookProgress: Map<string, BookProgress>;
  // Overall stats
  totalChaptersRead: number;
  totalVersesRead: number;
  // Streak data
  streak: ReadingStreak;
  // Daily history (last 30 days)
  dailyHistory: DailyReading[];
}

export interface BookProgress {
  bookId: string;
  chaptersRead: number[];
  lastReadChapter: number;
  lastReadTimestamp: number;
  percentComplete: number;
}

// Reading plan types
export interface ReadingPlan {
  id: string;
  name: {
    chinese: string;
    pinyin: string;
    english: string;
  };
  description: string;
  totalDays: number;
  dailyReadings: DailyPlanReading[];
  category: 'beginner' | 'standard' | 'intensive';
}

export interface DailyPlanReading {
  day: number;
  passages: PlanPassage[];
  estimatedMinutes: number;
}

export interface PlanPassage {
  bookId: string;
  startChapter: number;
  endChapter?: number;
  startVerse?: number;
  endVerse?: number;
}

export interface UserPlanProgress {
  planId: string;
  startDate: string; // YYYY-MM-DD
  currentDay: number;
  completedDays: number[];
  isActive: boolean;
  isPaused: boolean;
  pausedDate?: string;
}
