import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import type { ReadingPlan, UserPlanProgress, PlanPassage } from '../types/progress';
import { useProgressStore } from './progressStore';

// Helper to get today's date string
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// Predefined reading plans
export const READING_PLANS: ReadingPlan[] = [
  {
    id: 'gospels-30',
    name: { chinese: '福音書30天', pinyin: 'fú yīn shū sān shí tiān', english: 'Gospels in 30 Days' },
    description: 'Read all four Gospels in one month. Perfect for beginners.',
    totalDays: 30,
    category: 'beginner',
    dailyReadings: generateGospelsPlan(),
  },
  {
    id: 'new-testament-90',
    name: { chinese: '新約90天', pinyin: 'xīn yuē jiǔ shí tiān', english: 'New Testament in 90 Days' },
    description: 'Complete the entire New Testament in 3 months.',
    totalDays: 90,
    category: 'standard',
    dailyReadings: generateNewTestamentPlan(),
  },
  {
    id: 'psalms-proverbs-30',
    name: { chinese: '詩篇箴言30天', pinyin: 'shī piān zhēn yán sān shí tiān', english: 'Psalms & Proverbs in 30 Days' },
    description: 'Wisdom literature for daily reflection.',
    totalDays: 30,
    category: 'beginner',
    dailyReadings: generatePsalmsProverbsPlan(),
  },
  {
    id: 'whole-bible-365',
    name: { chinese: '一年讀完聖經', pinyin: 'yī nián dú wán shèng jīng', english: 'Bible in One Year' },
    description: 'Read the complete Bible in 365 days.',
    totalDays: 365,
    category: 'intensive',
    dailyReadings: generateWholeBiblePlan(),
  },
  {
    id: 'blended-bible-365',
    name: { chinese: '混合讀經一年', pinyin: 'hùn hé dú jīng yī nián', english: 'Blended Bible in One Year' },
    description: 'Read OT, NT, and wisdom literature daily for a varied experience.',
    totalDays: 365,
    category: 'intensive',
    dailyReadings: generateBlendedBiblePlan(),
  },
];

// Generate Gospels reading plan (30 days)
function generateGospelsPlan() {
  const readings: ReadingPlan['dailyReadings'] = [];
  const gospels = [
    { bookId: 'matthew', chapters: 28 },
    { bookId: 'mark', chapters: 16 },
    { bookId: 'luke', chapters: 24 },
    { bookId: 'john', chapters: 21 },
  ];

  // Total chapters: 28+16+24+21 = 89 chapters across 30 days
  // Average ~3 chapters per day
  const totalChapters = gospels.reduce((sum, g) => sum + g.chapters, 0);
  const baseChaptersPerDay = Math.floor(totalChapters / 30);
  const extraDays = totalChapters % 30;

  let day = 1;
  let currentBookIdx = 0;
  let currentChapter = 1;

  while (day <= 30 && currentBookIdx < gospels.length) {
    // Some days get an extra chapter to distribute evenly
    const chaptersToday = day <= extraDays ? baseChaptersPerDay + 1 : baseChaptersPerDay;
    const passages: PlanPassage[] = [];
    let chaptersAdded = 0;

    while (chaptersAdded < chaptersToday && currentBookIdx < gospels.length) {
      const book = gospels[currentBookIdx];
      const remainingInBook = book.chapters - currentChapter + 1;
      const chaptersFromThisBook = Math.min(remainingInBook, chaptersToday - chaptersAdded);

      passages.push({
        bookId: book.bookId,
        startChapter: currentChapter,
        endChapter: currentChapter + chaptersFromThisBook - 1 === currentChapter
          ? undefined
          : currentChapter + chaptersFromThisBook - 1,
      });

      chaptersAdded += chaptersFromThisBook;
      currentChapter += chaptersFromThisBook;

      if (currentChapter > book.chapters) {
        currentBookIdx++;
        currentChapter = 1;
      }
    }

    if (passages.length > 0) {
      readings.push({
        day,
        passages,
        estimatedMinutes: chaptersAdded * 5,
      });
      day++;
    }
  }

  return readings;
}

// Generate New Testament reading plan (90 days)
function generateNewTestamentPlan() {
  const readings: ReadingPlan['dailyReadings'] = [];
  const ntBooks = [
    { bookId: 'matthew', chapters: 28 },
    { bookId: 'mark', chapters: 16 },
    { bookId: 'luke', chapters: 24 },
    { bookId: 'john', chapters: 21 },
    { bookId: 'acts', chapters: 28 },
    { bookId: 'romans', chapters: 16 },
    { bookId: '1corinthians', chapters: 16 },
    { bookId: '2corinthians', chapters: 13 },
    { bookId: 'galatians', chapters: 6 },
    { bookId: 'ephesians', chapters: 6 },
    { bookId: 'philippians', chapters: 4 },
    { bookId: 'colossians', chapters: 4 },
    { bookId: '1thessalonians', chapters: 5 },
    { bookId: '2thessalonians', chapters: 3 },
    { bookId: '1timothy', chapters: 6 },
    { bookId: '2timothy', chapters: 4 },
    { bookId: 'titus', chapters: 3 },
    { bookId: 'philemon', chapters: 1 },
    { bookId: 'hebrews', chapters: 13 },
    { bookId: 'james', chapters: 5 },
    { bookId: '1peter', chapters: 5 },
    { bookId: '2peter', chapters: 3 },
    { bookId: '1john', chapters: 5 },
    { bookId: '2john', chapters: 1 },
    { bookId: '3john', chapters: 1 },
    { bookId: 'jude', chapters: 1 },
    { bookId: 'revelation', chapters: 22 },
  ];

  // Total NT chapters: 260 across 90 days
  // Some days get 3 chapters, some get 2
  const totalChapters = ntBooks.reduce((sum, b) => sum + b.chapters, 0);
  const baseChaptersPerDay = Math.floor(totalChapters / 90);
  const extraDays = totalChapters % 90;

  let day = 1;
  let currentBookIdx = 0;
  let currentChapter = 1;

  while (day <= 90 && currentBookIdx < ntBooks.length) {
    // Distribute extra chapters across early days
    const chaptersToday = day <= extraDays ? baseChaptersPerDay + 1 : baseChaptersPerDay;
    const passages: PlanPassage[] = [];
    let chaptersAdded = 0;

    while (chaptersAdded < chaptersToday && currentBookIdx < ntBooks.length) {
      const book = ntBooks[currentBookIdx];
      const remainingInBook = book.chapters - currentChapter + 1;
      const chaptersFromThisBook = Math.min(remainingInBook, chaptersToday - chaptersAdded);

      passages.push({
        bookId: book.bookId,
        startChapter: currentChapter,
        endChapter: currentChapter + chaptersFromThisBook - 1 === currentChapter
          ? undefined
          : currentChapter + chaptersFromThisBook - 1,
      });

      chaptersAdded += chaptersFromThisBook;
      currentChapter += chaptersFromThisBook;

      if (currentChapter > book.chapters) {
        currentBookIdx++;
        currentChapter = 1;
      }
    }

    if (passages.length > 0) {
      readings.push({
        day,
        passages,
        estimatedMinutes: chaptersAdded * 5,
      });
      day++;
    }
  }

  return readings;
}

// Generate Psalms & Proverbs plan (30 days)
function generatePsalmsProverbsPlan() {
  const readings: ReadingPlan['dailyReadings'] = [];

  for (let day = 1; day <= 30; day++) {
    const passages: PlanPassage[] = [];

    // 5 Psalms per day (150 / 30 = 5)
    const psalmStart = (day - 1) * 5 + 1;
    const psalmEnd = Math.min(day * 5, 150);
    passages.push({
      bookId: 'psalms',
      startChapter: psalmStart,
      endChapter: psalmEnd === psalmStart ? undefined : psalmEnd,
    });

    // 1 Proverbs chapter per day (31 chapters, close to 30 days)
    if (day <= 31) {
      passages.push({
        bookId: 'proverbs',
        startChapter: day,
      });
    }

    readings.push({
      day,
      passages,
      estimatedMinutes: 10,
    });
  }

  return readings;
}

// Generate whole Bible plan (365 days) - simplified
function generateWholeBiblePlan() {
  const readings: ReadingPlan['dailyReadings'] = [];
  const allBooks = [
    // Old Testament
    { bookId: 'genesis', chapters: 50 },
    { bookId: 'exodus', chapters: 40 },
    { bookId: 'leviticus', chapters: 27 },
    { bookId: 'numbers', chapters: 36 },
    { bookId: 'deuteronomy', chapters: 34 },
    { bookId: 'joshua', chapters: 24 },
    { bookId: 'judges', chapters: 21 },
    { bookId: 'ruth', chapters: 4 },
    { bookId: '1samuel', chapters: 31 },
    { bookId: '2samuel', chapters: 24 },
    { bookId: '1kings', chapters: 22 },
    { bookId: '2kings', chapters: 25 },
    { bookId: '1chronicles', chapters: 29 },
    { bookId: '2chronicles', chapters: 36 },
    { bookId: 'ezra', chapters: 10 },
    { bookId: 'nehemiah', chapters: 13 },
    { bookId: 'esther', chapters: 10 },
    { bookId: 'job', chapters: 42 },
    { bookId: 'psalms', chapters: 150 },
    { bookId: 'proverbs', chapters: 31 },
    { bookId: 'ecclesiastes', chapters: 12 },
    { bookId: 'songofsolomon', chapters: 8 },
    { bookId: 'isaiah', chapters: 66 },
    { bookId: 'jeremiah', chapters: 52 },
    { bookId: 'lamentations', chapters: 5 },
    { bookId: 'ezekiel', chapters: 48 },
    { bookId: 'daniel', chapters: 12 },
    { bookId: 'hosea', chapters: 14 },
    { bookId: 'joel', chapters: 3 },
    { bookId: 'amos', chapters: 9 },
    { bookId: 'obadiah', chapters: 1 },
    { bookId: 'jonah', chapters: 4 },
    { bookId: 'micah', chapters: 7 },
    { bookId: 'nahum', chapters: 3 },
    { bookId: 'habakkuk', chapters: 3 },
    { bookId: 'zephaniah', chapters: 3 },
    { bookId: 'haggai', chapters: 2 },
    { bookId: 'zechariah', chapters: 14 },
    { bookId: 'malachi', chapters: 4 },
    // New Testament
    { bookId: 'matthew', chapters: 28 },
    { bookId: 'mark', chapters: 16 },
    { bookId: 'luke', chapters: 24 },
    { bookId: 'john', chapters: 21 },
    { bookId: 'acts', chapters: 28 },
    { bookId: 'romans', chapters: 16 },
    { bookId: '1corinthians', chapters: 16 },
    { bookId: '2corinthians', chapters: 13 },
    { bookId: 'galatians', chapters: 6 },
    { bookId: 'ephesians', chapters: 6 },
    { bookId: 'philippians', chapters: 4 },
    { bookId: 'colossians', chapters: 4 },
    { bookId: '1thessalonians', chapters: 5 },
    { bookId: '2thessalonians', chapters: 3 },
    { bookId: '1timothy', chapters: 6 },
    { bookId: '2timothy', chapters: 4 },
    { bookId: 'titus', chapters: 3 },
    { bookId: 'philemon', chapters: 1 },
    { bookId: 'hebrews', chapters: 13 },
    { bookId: 'james', chapters: 5 },
    { bookId: '1peter', chapters: 5 },
    { bookId: '2peter', chapters: 3 },
    { bookId: '1john', chapters: 5 },
    { bookId: '2john', chapters: 1 },
    { bookId: '3john', chapters: 1 },
    { bookId: 'jude', chapters: 1 },
    { bookId: 'revelation', chapters: 22 },
  ];

  // Total Bible chapters: 1189 across 365 days
  // ~3-4 chapters per day with even distribution
  const totalChapters = allBooks.reduce((sum, b) => sum + b.chapters, 0);
  const baseChaptersPerDay = Math.floor(totalChapters / 365);
  const extraDays = totalChapters % 365;

  let day = 1;
  let currentBookIdx = 0;
  let currentChapter = 1;

  while (day <= 365 && currentBookIdx < allBooks.length) {
    // Distribute extra chapters across early days
    const chaptersToday = day <= extraDays ? baseChaptersPerDay + 1 : baseChaptersPerDay;
    const passages: PlanPassage[] = [];
    let chaptersAdded = 0;

    while (chaptersAdded < chaptersToday && currentBookIdx < allBooks.length) {
      const book = allBooks[currentBookIdx];
      const remainingInBook = book.chapters - currentChapter + 1;
      const chaptersFromThisBook = Math.min(remainingInBook, chaptersToday - chaptersAdded);

      passages.push({
        bookId: book.bookId,
        startChapter: currentChapter,
        endChapter: currentChapter + chaptersFromThisBook - 1 === currentChapter
          ? undefined
          : currentChapter + chaptersFromThisBook - 1,
      });

      chaptersAdded += chaptersFromThisBook;
      currentChapter += chaptersFromThisBook;

      if (currentChapter > book.chapters) {
        currentBookIdx++;
        currentChapter = 1;
      }
    }

    if (passages.length > 0) {
      readings.push({
        day,
        passages,
        estimatedMinutes: chaptersAdded * 5,
      });
      day++;
    }
  }

  return readings;
}

// Generate blended Bible plan (365 days) - OT, NT, and Psalms/Proverbs mixed daily
function generateBlendedBiblePlan() {
  const readings: ReadingPlan['dailyReadings'] = [];

  // Old Testament books (excluding Psalms and Proverbs)
  const otBooks = [
    { bookId: 'genesis', chapters: 50 },
    { bookId: 'exodus', chapters: 40 },
    { bookId: 'leviticus', chapters: 27 },
    { bookId: 'numbers', chapters: 36 },
    { bookId: 'deuteronomy', chapters: 34 },
    { bookId: 'joshua', chapters: 24 },
    { bookId: 'judges', chapters: 21 },
    { bookId: 'ruth', chapters: 4 },
    { bookId: '1samuel', chapters: 31 },
    { bookId: '2samuel', chapters: 24 },
    { bookId: '1kings', chapters: 22 },
    { bookId: '2kings', chapters: 25 },
    { bookId: '1chronicles', chapters: 29 },
    { bookId: '2chronicles', chapters: 36 },
    { bookId: 'ezra', chapters: 10 },
    { bookId: 'nehemiah', chapters: 13 },
    { bookId: 'esther', chapters: 10 },
    { bookId: 'job', chapters: 42 },
    { bookId: 'ecclesiastes', chapters: 12 },
    { bookId: 'songofsolomon', chapters: 8 },
    { bookId: 'isaiah', chapters: 66 },
    { bookId: 'jeremiah', chapters: 52 },
    { bookId: 'lamentations', chapters: 5 },
    { bookId: 'ezekiel', chapters: 48 },
    { bookId: 'daniel', chapters: 12 },
    { bookId: 'hosea', chapters: 14 },
    { bookId: 'joel', chapters: 3 },
    { bookId: 'amos', chapters: 9 },
    { bookId: 'obadiah', chapters: 1 },
    { bookId: 'jonah', chapters: 4 },
    { bookId: 'micah', chapters: 7 },
    { bookId: 'nahum', chapters: 3 },
    { bookId: 'habakkuk', chapters: 3 },
    { bookId: 'zephaniah', chapters: 3 },
    { bookId: 'haggai', chapters: 2 },
    { bookId: 'zechariah', chapters: 14 },
    { bookId: 'malachi', chapters: 4 },
  ];

  // New Testament books
  const ntBooks = [
    { bookId: 'matthew', chapters: 28 },
    { bookId: 'mark', chapters: 16 },
    { bookId: 'luke', chapters: 24 },
    { bookId: 'john', chapters: 21 },
    { bookId: 'acts', chapters: 28 },
    { bookId: 'romans', chapters: 16 },
    { bookId: '1corinthians', chapters: 16 },
    { bookId: '2corinthians', chapters: 13 },
    { bookId: 'galatians', chapters: 6 },
    { bookId: 'ephesians', chapters: 6 },
    { bookId: 'philippians', chapters: 4 },
    { bookId: 'colossians', chapters: 4 },
    { bookId: '1thessalonians', chapters: 5 },
    { bookId: '2thessalonians', chapters: 3 },
    { bookId: '1timothy', chapters: 6 },
    { bookId: '2timothy', chapters: 4 },
    { bookId: 'titus', chapters: 3 },
    { bookId: 'philemon', chapters: 1 },
    { bookId: 'hebrews', chapters: 13 },
    { bookId: 'james', chapters: 5 },
    { bookId: '1peter', chapters: 5 },
    { bookId: '2peter', chapters: 3 },
    { bookId: '1john', chapters: 5 },
    { bookId: '2john', chapters: 1 },
    { bookId: '3john', chapters: 1 },
    { bookId: 'jude', chapters: 1 },
    { bookId: 'revelation', chapters: 22 },
  ];

  // Wisdom books (Psalms and Proverbs)
  const wisdomBooks = [
    { bookId: 'psalms', chapters: 150 },
    { bookId: 'proverbs', chapters: 31 },
  ];

  // Track progress through each section
  // OT: 748 chapters, NT: 260 chapters, Wisdom: 181 chapters
  let otBookIdx = 0;
  let otChapter = 1;
  let ntBookIdx = 0;
  let ntChapter = 1;
  let wisdomBookIdx = 0;
  let wisdomChapter = 1;

  // Generate 365 days of readings
  for (let day = 1; day <= 365; day++) {
    const passages: PlanPassage[] = [];
    let estimatedMinutes = 0;

    // OT passage: ~2 chapters per day (748 / 365 ≈ 2.05)
    // Read 3 chapters every 20 days to cover the extra chapters (18 extra days needed)
    if (otBookIdx < otBooks.length) {
      const otChaptersToday = day % 20 === 0 ? 3 : 2;
      let chaptersAdded = 0;

      while (chaptersAdded < otChaptersToday && otBookIdx < otBooks.length) {
        const book = otBooks[otBookIdx];
        const remainingInBook = book.chapters - otChapter + 1;
        const chaptersFromThisBook = Math.min(remainingInBook, otChaptersToday - chaptersAdded);

        passages.push({
          bookId: book.bookId,
          startChapter: otChapter,
          endChapter: otChapter + chaptersFromThisBook - 1 === otChapter
            ? undefined
            : otChapter + chaptersFromThisBook - 1,
        });

        chaptersAdded += chaptersFromThisBook;
        estimatedMinutes += chaptersFromThisBook * 5;
        otChapter += chaptersFromThisBook;

        if (otChapter > book.chapters) {
          otBookIdx++;
          otChapter = 1;
        }
      }
    }

    // NT passage: 1 chapter per day (260 chapters)
    // Spread across first 260 days
    if (day <= 260 && ntBookIdx < ntBooks.length) {
      const book = ntBooks[ntBookIdx];

      passages.push({
        bookId: book.bookId,
        startChapter: ntChapter,
      });

      estimatedMinutes += 5;
      ntChapter++;

      if (ntChapter > book.chapters) {
        ntBookIdx++;
        ntChapter = 1;
      }
    }

    // Wisdom passage: 1 chapter every other day (181 chapters)
    // Spread across first 362 days (every other day)
    if (day % 2 === 1 && day <= 362 && wisdomBookIdx < wisdomBooks.length) {
      const book = wisdomBooks[wisdomBookIdx];

      passages.push({
        bookId: book.bookId,
        startChapter: wisdomChapter,
      });

      estimatedMinutes += 5;
      wisdomChapter++;

      if (wisdomChapter > book.chapters) {
        wisdomBookIdx++;
        wisdomChapter = 1;
      }
    }

    // Always create a reading for each day, even if only OT remains at the end
    readings.push({
      day,
      passages,
      estimatedMinutes: estimatedMinutes > 0 ? estimatedMinutes : 10,
    });
  }

  return readings;
}

interface ReadingPlansState {
  // Active plan progress
  activePlan: UserPlanProgress | null;

  // Completed plans history
  completedPlans: string[];

  // Actions
  startPlan: (planId: string) => void;
  markDayComplete: (day: number) => void;
  goToDay: (day: number) => void;
  goToNextDay: () => void;
  goToPreviousDay: () => void;
  pausePlan: () => void;
  resumePlan: () => void;
  abandonPlan: () => void;
  getCurrentDayReading: () => { day: number; passages: PlanPassage[]; isComplete: boolean } | null;
  getDayReading: (day: number) => { day: number; passages: PlanPassage[]; isComplete: boolean } | null;
  getPlanProgress: () => { completed: number; total: number; percent: number } | null;
}

export const useReadingPlansStore = create<ReadingPlansState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
      activePlan: null,
      completedPlans: [],

      startPlan: (planId: string) => {
        const today = getTodayString();
        set({
          activePlan: {
            planId,
            startDate: today,
            currentDay: 1,
            completedDays: [],
            isActive: true,
            isPaused: false,
          },
        });
      },

      markDayComplete: (day: number) => {
        const state = get();
        if (!state.activePlan) return;

        const plan = READING_PLANS.find(p => p.id === state.activePlan!.planId);
        const isFirstTimeCompleting = !state.activePlan.completedDays.includes(day);

        // Update streak in progressStore when completing a day for the first time
        // This ensures the streak increments even if user marks complete from Plans panel
        if (isFirstTimeCompleting && plan) {
          const todayReading = plan.dailyReadings.find(r => r.day === day);
          if (todayReading && todayReading.passages.length > 0) {
            const firstPassage = todayReading.passages[0];
            useProgressStore.getState().markChapterRead(
              firstPassage.bookId,
              firstPassage.startChapter,
              0
            );
          }
        }

        set((currentState) => {
          if (!currentState.activePlan) return currentState;

          const newCompletedDays = currentState.activePlan.completedDays.includes(day)
            ? currentState.activePlan.completedDays
            : [...currentState.activePlan.completedDays, day].sort((a, b) => a - b);

          // Check if plan is complete
          const isComplete = plan && newCompletedDays.length >= plan.totalDays;

          if (isComplete) {
            return {
              activePlan: null,
              completedPlans: [...currentState.completedPlans, currentState.activePlan.planId],
            };
          }

          return {
            activePlan: {
              ...currentState.activePlan,
              completedDays: newCompletedDays,
              // Automatically advance to next day if completing current day
              currentDay: currentState.activePlan.currentDay === day
                ? Math.min(day + 1, plan?.totalDays || day + 1)
                : currentState.activePlan.currentDay,
            },
          };
        });
      },

      goToDay: (day: number) => {
        set((state) => {
          if (!state.activePlan) return state;

          const plan = READING_PLANS.find(p => p.id === state.activePlan!.planId);
          if (!plan) return state;

          // Clamp day to valid range
          const validDay = Math.max(1, Math.min(day, plan.totalDays));

          return {
            activePlan: {
              ...state.activePlan,
              currentDay: validDay,
            },
          };
        });
      },

      goToNextDay: () => {
        const state = get();
        if (!state.activePlan) return;

        const plan = READING_PLANS.find(p => p.id === state.activePlan!.planId);
        if (!plan) return;

        const nextDay = Math.min(state.activePlan.currentDay + 1, plan.totalDays);
        if (nextDay !== state.activePlan.currentDay) {
          set({
            activePlan: {
              ...state.activePlan,
              currentDay: nextDay,
            },
          });
        }
      },

      goToPreviousDay: () => {
        const state = get();
        if (!state.activePlan) return;

        const prevDay = Math.max(state.activePlan.currentDay - 1, 1);
        if (prevDay !== state.activePlan.currentDay) {
          set({
            activePlan: {
              ...state.activePlan,
              currentDay: prevDay,
            },
          });
        }
      },

      pausePlan: () => {
        set((state) => {
          if (!state.activePlan) return state;
          return {
            activePlan: {
              ...state.activePlan,
              isPaused: true,
              pausedDate: getTodayString(),
            },
          };
        });
      },

      resumePlan: () => {
        set((state) => {
          if (!state.activePlan) return state;

          // Resume from where we paused - no day adjustment needed
          return {
            activePlan: {
              ...state.activePlan,
              isPaused: false,
              pausedDate: undefined,
            },
          };
        });
      },

      abandonPlan: () => {
        set({ activePlan: null });
      },

      getCurrentDayReading: () => {
        const { activePlan } = get();
        if (!activePlan || activePlan.isPaused) return null;

        const plan = READING_PLANS.find(p => p.id === activePlan.planId);
        if (!plan) return null;

        // Use currentDay from state - users can advance at their own pace
        const effectiveDay = Math.min(activePlan.currentDay, plan.totalDays);

        const todayReading = plan.dailyReadings.find(r => r.day === effectiveDay);
        if (!todayReading) return null;

        return {
          day: effectiveDay,
          passages: todayReading.passages,
          isComplete: activePlan.completedDays.includes(effectiveDay),
        };
      },

      getDayReading: (day: number) => {
        const { activePlan } = get();
        if (!activePlan) return null;

        const plan = READING_PLANS.find(p => p.id === activePlan.planId);
        if (!plan) return null;

        // Clamp to valid range
        const validDay = Math.max(1, Math.min(day, plan.totalDays));

        const dayReading = plan.dailyReadings.find(r => r.day === validDay);
        if (!dayReading) return null;

        return {
          day: validDay,
          passages: dayReading.passages,
          isComplete: activePlan.completedDays.includes(validDay),
        };
      },

      getPlanProgress: () => {
        const { activePlan } = get();
        if (!activePlan) return null;

        const plan = READING_PLANS.find(p => p.id === activePlan.planId);
        if (!plan) return null;

        return {
          completed: activePlan.completedDays.length,
          total: plan.totalDays,
          percent: Math.round((activePlan.completedDays.length / plan.totalDays) * 100),
        };
      },
      }),
      {
        name: 'reading-plans-storage',
        version: 1,
      }
    )
  )
);
