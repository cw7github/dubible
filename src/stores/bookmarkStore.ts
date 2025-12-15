import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VerseReference } from '../types';

export interface Bookmark {
  id: string;
  verseRef: VerseReference;
  note?: string;
  createdAt: number;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function verseRefToKey(ref: VerseReference): string {
  return `${ref.bookId}-${ref.chapter}-${ref.verse}`;
}

interface BookmarkState {
  bookmarks: Bookmark[];

  // Actions
  addBookmark: (verseRef: VerseReference, note?: string) => void;
  removeBookmark: (verseRef: VerseReference) => void;
  toggleBookmark: (verseRef: VerseReference) => void;
  isBookmarked: (verseRef: VerseReference) => boolean;
  getBookmark: (verseRef: VerseReference) => Bookmark | undefined;
  updateNote: (verseRef: VerseReference, note: string) => void;
  getBookmarksByBook: (bookId: string) => Bookmark[];
  clearAllBookmarks: () => void;
}

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set, get) => ({
      bookmarks: [],

      addBookmark: (verseRef, note) => {
        // Don't add duplicates
        if (get().isBookmarked(verseRef)) {
          return;
        }

        const newBookmark: Bookmark = {
          id: generateId(),
          verseRef,
          note,
          createdAt: Date.now(),
        };

        set((state) => ({
          bookmarks: [newBookmark, ...state.bookmarks],
        }));
      },

      removeBookmark: (verseRef) => {
        const key = verseRefToKey(verseRef);
        set((state) => ({
          bookmarks: state.bookmarks.filter(
            (b) => verseRefToKey(b.verseRef) !== key
          ),
        }));
      },

      toggleBookmark: (verseRef) => {
        if (get().isBookmarked(verseRef)) {
          get().removeBookmark(verseRef);
        } else {
          get().addBookmark(verseRef);
        }
      },

      isBookmarked: (verseRef) => {
        const key = verseRefToKey(verseRef);
        return get().bookmarks.some((b) => verseRefToKey(b.verseRef) === key);
      },

      getBookmark: (verseRef) => {
        const key = verseRefToKey(verseRef);
        return get().bookmarks.find((b) => verseRefToKey(b.verseRef) === key);
      },

      updateNote: (verseRef, note) => {
        const key = verseRefToKey(verseRef);
        set((state) => ({
          bookmarks: state.bookmarks.map((b) =>
            verseRefToKey(b.verseRef) === key ? { ...b, note } : b
          ),
        }));
      },

      getBookmarksByBook: (bookId) => {
        return get().bookmarks.filter((b) => b.verseRef.bookId === bookId);
      },

      clearAllBookmarks: () => set({ bookmarks: [] }),
    }),
    {
      name: 'bilingual-bible-bookmarks',
    }
  )
);
