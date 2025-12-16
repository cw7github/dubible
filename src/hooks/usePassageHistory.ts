import { useCallback, useRef, useEffect } from 'react';
import { useHistoryStore } from '../stores/historyStore';

interface UsePassageHistoryOptions {
  currentBookId: string;
  currentChapter: number;
  onNavigate: (bookId: string, chapter: number) => void;
}

interface UsePassageHistoryReturn {
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  trackCurrentPassage: () => void;
}

/**
 * Hook for managing passage viewing history with back/forward navigation
 */
export function usePassageHistory({
  currentBookId,
  currentChapter,
  onNavigate,
}: UsePassageHistoryOptions): UsePassageHistoryReturn {
  const {
    pushEntry,
    goBack: historyGoBack,
    goForward: historyGoForward,
    canGoBack: historyCanGoBack,
    canGoForward: historyCanGoForward,
  } = useHistoryStore();

  // Track if we're currently navigating via history (to prevent re-adding to history)
  const isNavigatingRef = useRef(false);
  const lastTrackedRef = useRef<{ bookId: string; chapter: number } | null>(null);

  // Track current passage in history
  const trackCurrentPassage = useCallback(() => {
    // Don't track if we're in the middle of a history navigation
    if (isNavigatingRef.current) {
      isNavigatingRef.current = false;
      return;
    }

    // Don't track if this is the same as what we just tracked
    if (
      lastTrackedRef.current &&
      lastTrackedRef.current.bookId === currentBookId &&
      lastTrackedRef.current.chapter === currentChapter
    ) {
      return;
    }

    pushEntry(currentBookId, currentChapter);
    lastTrackedRef.current = { bookId: currentBookId, chapter: currentChapter };
  }, [currentBookId, currentChapter, pushEntry]);

  // Go back in history
  const goBack = useCallback(() => {
    const previousEntry = historyGoBack();
    if (previousEntry) {
      isNavigatingRef.current = true;
      onNavigate(previousEntry.bookId, previousEntry.chapter);
    }
  }, [historyGoBack, onNavigate]);

  // Go forward in history
  const goForward = useCallback(() => {
    const nextEntry = historyGoForward();
    if (nextEntry) {
      isNavigatingRef.current = true;
      onNavigate(nextEntry.bookId, nextEntry.chapter);
    }
  }, [historyGoForward, onNavigate]);

  // Get current state
  const canGoBack = historyCanGoBack();
  const canGoForward = historyCanGoForward();

  // Track initial passage on mount
  useEffect(() => {
    trackCurrentPassage();
  }, []); // Only on mount

  return {
    goBack,
    goForward,
    canGoBack,
    canGoForward,
    trackCurrentPassage,
  };
}
