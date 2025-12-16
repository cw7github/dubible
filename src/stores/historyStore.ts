import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PassageEntry {
  bookId: string;
  chapter: number;
  timestamp: number;
}

interface HistoryState {
  // History stack
  entries: PassageEntry[];
  // Current position in history (index into entries array)
  currentIndex: number;

  // Actions
  pushEntry: (bookId: string, chapter: number) => void;
  goBack: () => PassageEntry | null;
  goForward: () => PassageEntry | null;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      entries: [],
      currentIndex: -1,

      pushEntry: (bookId, chapter) => {
        const { entries, currentIndex } = get();

        // Check if this is the same as the current entry (prevent duplicates)
        if (currentIndex >= 0 && currentIndex < entries.length) {
          const currentEntry = entries[currentIndex];
          if (currentEntry.bookId === bookId && currentEntry.chapter === chapter) {
            return; // Don't add duplicate
          }
        }

        // Remove all forward history when pushing a new entry
        const newEntries = entries.slice(0, currentIndex + 1);

        // Add new entry
        newEntries.push({
          bookId,
          chapter,
          timestamp: Date.now(),
        });

        // Limit history to last 50 entries to prevent unbounded growth
        const limitedEntries = newEntries.slice(-50);

        set({
          entries: limitedEntries,
          currentIndex: limitedEntries.length - 1,
        });
      },

      goBack: () => {
        const { entries, currentIndex } = get();

        if (currentIndex > 0) {
          const newIndex = currentIndex - 1;
          set({ currentIndex: newIndex });
          return entries[newIndex];
        }

        return null;
      },

      goForward: () => {
        const { entries, currentIndex } = get();

        if (currentIndex < entries.length - 1) {
          const newIndex = currentIndex + 1;
          set({ currentIndex: newIndex });
          return entries[newIndex];
        }

        return null;
      },

      canGoBack: () => {
        const { currentIndex } = get();
        return currentIndex > 0;
      },

      canGoForward: () => {
        const { entries, currentIndex } = get();
        return currentIndex < entries.length - 1;
      },

      clearHistory: () => {
        set({
          entries: [],
          currentIndex: -1,
        });
      },
    }),
    {
      name: 'passage-history-storage',
      version: 1,
    }
  )
);
