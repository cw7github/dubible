import { useEffect, useLayoutEffect, useRef, useCallback, useState, forwardRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Chapter, SegmentedWord, VerseReference, PlanPassage } from '../../types';
import { getBookById, getPreviousBook, getNextBook } from '../../data/bible';
import { getChapter, prefetchAdjacentChapters } from '../../services/bibleCache';
import { useSettingsStore } from '../../stores';
import { VerseDisplay } from './VerseDisplay';
import { ChapterTransition } from './ChapterTransition';
import { DailyReadingMarker } from './DailyReadingMarker';
import { isPoetrySection } from '../../data/poeticBooks';
import { loadParagraphBreaks, isParagraphStart } from '../../data/paragraphBreaks';
import { findEndingPassage, getNextPassage } from '../../utils/readingPlanHelpers';
import { notifyGlobalScrollStart } from '../../hooks/useScrollGestureCoordination';

interface LoadedChapter {
  bookId: string;
  chapter: number;
  data: Chapter;
}

type Passage = { bookId: string; chapter: number };

type ScrollAdjustStrategy = 'maintain' | 'showPrependedEnd';

interface InfiniteScrollProps {
  bookId: string;
  initialChapter: number;
  initialScrollPosition?: number;
  initialVerse?: number | null;
  /** Notify parent when the visible passage changes (book + chapter). */
  onPassageChange: (bookId: string, chapter: number) => void;
  /** Notify parent when scroll position changes (for persistence) */
  onScrollPositionChange?: (scrollPosition: number) => void;
  /** Notify parent after successfully scrolling to a specific verse (so it can clear the target verse) */
  onVerseScrolled?: () => void;
  onWordTapAndHold: (word: SegmentedWord, verseRef: VerseReference) => void;
  onVerseDoubleTap: (verseRef: VerseReference) => void;
  showHsk: boolean;
  /** Optional bookId for active highlighting (prevents cross-book collisions). */
  activeBookId?: string | null;
  activeChapter?: number | null;
  activeVerseNumber?: number | null;
  highlightedWordIndex?: number | null;
  /** Currently selected word for persistent highlighting */
  selectedWord?: SegmentedWord | null;
  selectedWordVerseRef?: VerseReference | null;
  /** Daily reading passages (if following a reading plan) */
  dailyReadingPassages?: PlanPassage[];
  /** Callback when user navigates to next passage in plan */
  onNextPassage?: (passage: PlanPassage) => void;
  /** Callback when user completes the day's reading */
  onCompleteDay?: () => void;
}

interface ChapterBlockProps {
  loadedChapter: LoadedChapter;
  paragraphBreaksLoaded: boolean;
  onWordTapAndHold: (word: SegmentedWord, verseRef: VerseReference) => void;
  onVerseDoubleTap: (verseRef: VerseReference) => void;
  showHsk: boolean;
  activeBookId?: string | null;
  activeChapter?: number | null;
  activeVerseNumber?: number | null;
  highlightedWordIndex?: number | null;
  selectedWord?: SegmentedWord | null;
  selectedWordVerseRef?: VerseReference | null;
  dailyReadingPassages?: PlanPassage[];
  onNextPassage?: (passage: PlanPassage) => void;
  onCompleteDay?: () => void;
}

const ChapterBlock = memo(function ChapterBlock({
  loadedChapter,
  paragraphBreaksLoaded,
  onWordTapAndHold,
  onVerseDoubleTap,
  showHsk,
  activeBookId,
  activeChapter,
  activeVerseNumber,
  highlightedWordIndex,
  selectedWord,
  selectedWordVerseRef,
  dailyReadingPassages,
  onNextPassage,
  onCompleteDay,
}: ChapterBlockProps) {
  const chapterBook = getBookById(loadedChapter.bookId);
  if (!chapterBook) return null;

  const isPoetry = isPoetrySection(loadedChapter.bookId, loadedChapter.chapter);
  const isChapterActive =
    (activeBookId == null || activeBookId === loadedChapter.bookId) &&
    activeChapter === loadedChapter.chapter;

  const totalVersesInChapter = loadedChapter.data.verses.length;

  return (
    <div
      data-chapter={loadedChapter.chapter}
      data-book-id={loadedChapter.bookId}
    >
      <ChapterTransition
        bookId={loadedChapter.bookId}
        bookName={chapterBook.name}
        chapter={loadedChapter.chapter}
        isFirstChapter={loadedChapter.chapter === 1}
      />

      <div className={isPoetry ? 'space-y-1 pb-2' : 'prose-verses pb-2'}>
        {loadedChapter.data.verses.map((verse) => {
          const startsParagraph =
            !isPoetry &&
            paragraphBreaksLoaded &&
            verse.number > 1 &&
            isParagraphStart(loadedChapter.bookId, loadedChapter.chapter, verse.number);

          const isActiveVerse = isChapterActive && activeVerseNumber === verse.number;

          // Check if this verse is the end of a daily reading passage
          // Check every verse because passages can end at specific verses (e.g., Romans 3:1-20)
          let endingPassageInfo: { passage: PlanPassage; index: number } | null = null;

          if (dailyReadingPassages) {
            endingPassageInfo = findEndingPassage(
              loadedChapter.bookId,
              loadedChapter.chapter,
              verse.number,
              totalVersesInChapter,
              dailyReadingPassages
            );
          }

          return (
            <span key={`${loadedChapter.bookId}-${loadedChapter.chapter}-${verse.number}`}>
              {startsParagraph && <span className="paragraph-break" />}
              <VerseDisplay
                verse={verse}
                bookId={loadedChapter.bookId}
                chapter={loadedChapter.chapter}
                onWordTapAndHold={onWordTapAndHold}
                onVerseDoubleTap={onVerseDoubleTap}
                showHsk={showHsk}
                isPoetry={isPoetry}
                isActive={isActiveVerse}
                highlightedWordIndex={isActiveVerse ? highlightedWordIndex : null}
                selectedWord={selectedWord}
                selectedWordVerseRef={selectedWordVerseRef}
              />

              {/* Show daily reading marker at end of passage */}
              {endingPassageInfo && dailyReadingPassages && (
                <DailyReadingMarker
                  isLastPassage={endingPassageInfo.index === dailyReadingPassages.length - 1}
                  onNextPassage={
                    onNextPassage && endingPassageInfo.index < dailyReadingPassages.length - 1
                      ? () => {
                          const nextPassageData = getNextPassage(
                            endingPassageInfo.index,
                            dailyReadingPassages
                          );
                          if (nextPassageData) {
                            onNextPassage(nextPassageData);
                          }
                        }
                      : undefined
                  }
                  onComplete={
                    endingPassageInfo.index === dailyReadingPassages.length - 1
                      ? onCompleteDay
                      : undefined
                  }
                  passageInfo={{
                    bookName: chapterBook.name.english,
                    chapter: loadedChapter.chapter,
                    passageRange: (() => {
                      const p = endingPassageInfo.passage;
                      if (p.endChapter && p.endChapter !== p.startChapter) {
                        return `${p.startChapter}-${p.endChapter}`;
                      } else if (p.startVerse !== undefined && p.endVerse !== undefined) {
                        return `${p.startChapter}:${p.startVerse}-${p.endVerse}`;
                      } else if (p.startVerse !== undefined) {
                        return `${p.startChapter}:${p.startVerse}+`;
                      }
                      return String(p.startChapter);
                    })(),
                  }}
                />
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}, (prev, next) => {
  if (prev.loadedChapter !== next.loadedChapter) return false;
  if (prev.paragraphBreaksLoaded !== next.paragraphBreaksLoaded) return false;
  if (prev.showHsk !== next.showHsk) return false;
  if (prev.onWordTapAndHold !== next.onWordTapAndHold) return false;
  if (prev.onVerseDoubleTap !== next.onVerseDoubleTap) return false;
  if (prev.dailyReadingPassages !== next.dailyReadingPassages) return false;
  if (prev.onNextPassage !== next.onNextPassage) return false;
  if (prev.onCompleteDay !== next.onCompleteDay) return false;
  if (prev.selectedWord !== next.selectedWord) return false;
  if (prev.selectedWordVerseRef !== next.selectedWordVerseRef) return false;

  const prevIsActiveChapter =
    (prev.activeBookId == null || prev.activeBookId === prev.loadedChapter.bookId) &&
    prev.activeChapter === prev.loadedChapter.chapter;
  const nextIsActiveChapter =
    (next.activeBookId == null || next.activeBookId === next.loadedChapter.bookId) &&
    next.activeChapter === next.loadedChapter.chapter;

  if (prevIsActiveChapter !== nextIsActiveChapter) return false;
  if (!prevIsActiveChapter && !nextIsActiveChapter) return true;

  return (
    prev.activeVerseNumber === next.activeVerseNumber &&
    prev.highlightedWordIndex === next.highlightedWordIndex
  );
});

export const InfiniteScroll = forwardRef<HTMLDivElement, InfiniteScrollProps>(function InfiniteScroll(
  {
    bookId,
    initialChapter,
    initialScrollPosition = 0,
    initialVerse = null,
    onPassageChange,
    onScrollPositionChange,
    onVerseScrolled,
    onWordTapAndHold,
    onVerseDoubleTap,
    showHsk,
    activeBookId,
    activeChapter,
    activeVerseNumber,
    highlightedWordIndex,
    selectedWord,
    selectedWordVerseRef,
    dailyReadingPassages,
    onNextPassage,
    onCompleteDay,
  }: InfiniteScrollProps,
  forwardedRef
) {
  const debugScrollRef = useRef<boolean>(
    import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('debugScroll')
  );

  const [loadedChapters, setLoadedChapters] = useState<LoadedChapter[]>([]);
  const [isLoadingTop, setIsLoadingTop] = useState(false);
  const [isLoadingBottom, setIsLoadingBottom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingPreprocessed, setIsLoadingPreprocessed] = useState(false);
  const [paragraphBreaksLoaded, setParagraphBreaksLoaded] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [visiblePassageKey, setVisiblePassageKey] = useState(() => `${bookId}-${initialChapter}`);

  // Get character set preference for cache fetching
  const characterSet = useSettingsStore((state) => state.characterSet);

  const internalRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const currentCharacterSetRef = useRef(characterSet);
  const lastNavigationTargetKeyRef = useRef<string | null>(null);
  const pendingPropSyncKeysRef = useRef<Set<string>>(new Set());
  const lastReportedPassageKeyRef = useRef<string | null>(null);
  const suppressTopLoadUntilRef = useRef<number>(0);
  const isLoadingTopRef = useRef(false);
  const visiblePassageRef = useRef<Passage>({ bookId, chapter: initialChapter });
  const lastBufferMaintainPassageKeyRef = useRef<string | null>(null);
  const bufferMaintainTokenRef = useRef(0);
  const pendingTopPruneAdjustRef = useRef<{
    scrollHeightBefore: number;
    scrollTopBefore: number;
  } | null>(null);
  const inFlightChapterLoadsRef = useRef<Map<string, Promise<LoadedChapter | null>>>(new Map());
  const preprocessedLoadingCountRef = useRef(0);
  const scrollDirectionRef = useRef<'up' | 'down'>('down');
  const lastScrollTopRef = useRef(0);
  const isUserScrollingRef = useRef(false);
  const scrollIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const maintainChapterBufferRef = useRef<(reason: 'passage' | 'idle') => void>(() => {});
  const scrollPositionSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Callback ref to handle both external and internal refs
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    // Set internal ref (always mutable)
    internalRef.current = node;

    // Set forwarded ref if provided
    if (forwardedRef) {
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else {
        forwardedRef.current = node;
      }
    }
  }, [forwardedRef]);

  // Refs to store latest callbacks for intersection observer (prevents observer recreation)
  const loadPreviousChapterRef = useRef<() => void>(() => {});
  const loadNextChapterRef = useRef<() => void>(() => {});

  // Debounce tracking to prevent rapid cascade loads
  const lastLoadTimeRef = useRef<number>(0);
  const LOAD_DEBOUNCE_MS = 50; // Minimum time between loads - very short for seamless experience

  // Track pending scroll adjustment after prepending content
  const pendingScrollAdjustRef = useRef<{
    scrollHeightBefore: number;
    scrollTopBefore: number;
    strategy: ScrollAdjustStrategy;
    releaseUpwardScrollLockAfterAdjust: boolean;
  } | null>(null);

  const book = getBookById(bookId);
  const totalChapters = book?.chapterCount || 1;

  // Render-buffer tuning.
  // `MIN_BUFFER_RADIUS` ensures seamless scrolling with at least 2 chapters before/after the visible one.
  // When we do need to load more, we load a little extra (`TARGET_BUFFER_RADIUS`) to reduce how often we
  // mount/unmount whole chapters (which can cause noticeable hitches).
  const MIN_BUFFER_RADIUS = 2;
  const TARGET_BUFFER_RADIUS = 3;
  const TARGET_RENDERED_CHAPTERS = 9;
  const MAX_RENDERED_CHAPTERS = 11;
  const HARD_MAX_RENDERED_CHAPTERS = 15;
  const SCROLL_IDLE_MS = 140;

  const toPassageKey = useCallback((passage: Passage) => `${passage.bookId}-${passage.chapter}`, []);

  const getPreviousPassage = useCallback((passage: Passage): Passage | null => {
    const currentBook = getBookById(passage.bookId);
    if (!currentBook) return null;
    if (passage.chapter > 1) return { bookId: passage.bookId, chapter: passage.chapter - 1 };
    const prevBook = getPreviousBook(passage.bookId);
    if (!prevBook || prevBook.chapterCount < 1) return null;
    return { bookId: prevBook.id, chapter: prevBook.chapterCount };
  }, []);

  const getNextPassage = useCallback((passage: Passage): Passage | null => {
    const currentBook = getBookById(passage.bookId);
    if (!currentBook) return null;
    if (passage.chapter < currentBook.chapterCount) return { bookId: passage.bookId, chapter: passage.chapter + 1 };
    const nextBook = getNextBook(passage.bookId);
    if (!nextBook || nextBook.chapterCount < 1) return null;
    return { bookId: nextBook.id, chapter: 1 };
  }, []);

  // Load a chapter with current character set (supports cross-book loading)
  const loadChapter = useCallback(
    async (
      targetBookId: string,
      chapterNum: number,
      options?: { showPreprocessedIndicator?: boolean }
    ): Promise<LoadedChapter | null> => {
      const targetBook = getBookById(targetBookId);
      if (!targetBook) return null;

      if (chapterNum < 1 || chapterNum > targetBook.chapterCount) return null;

      const showPreprocessedIndicator = options?.showPreprocessedIndicator ?? true;
      const inFlightKey = `${targetBookId}-${chapterNum}-${characterSet}`;

      const existing = inFlightChapterLoadsRef.current.get(inFlightKey);
      if (existing) return existing;

      const promise = (async () => {
        if (showPreprocessedIndicator) {
          preprocessedLoadingCountRef.current += 1;
          setIsLoadingPreprocessed(true);
        }

        try {
          // Pass characterSet to get pre-converted verses from cache
          const data = await getChapter(targetBookId, chapterNum, characterSet);
          if (!data) return null;

          return { bookId: targetBookId, chapter: chapterNum, data };
        } catch (err) {
          console.error('Failed to load chapter:', err);
          return null;
        } finally {
          if (showPreprocessedIndicator) {
            preprocessedLoadingCountRef.current = Math.max(0, preprocessedLoadingCountRef.current - 1);
            if (preprocessedLoadingCountRef.current === 0) {
              setIsLoadingPreprocessed(false);
            }
          }
        }
      })();

      inFlightChapterLoadsRef.current.set(inFlightKey, promise);
      try {
        return await promise;
      } finally {
        inFlightChapterLoadsRef.current.delete(inFlightKey);
      }
    },
    [characterSet]
  );

  // Load paragraph breaks data on mount
  useEffect(() => {
    loadParagraphBreaks().then(() => {
      setParagraphBreaksLoaded(true);
    });
  }, []);

  // Initial load
  useEffect(() => {
    const passageKey = `${bookId}-${initialChapter}`;
    const navigationKey = `${passageKey}-${reloadNonce}`;
    if (lastNavigationTargetKeyRef.current === navigationKey) return;
    lastNavigationTargetKeyRef.current = navigationKey;

    // If this prop update came from our own scroll-driven callback, do not reset/reload.
    if (pendingPropSyncKeysRef.current.has(passageKey)) {
      pendingPropSyncKeysRef.current.delete(passageKey);
      return;
    }

    const init = async () => {
      setError(null);
      setIsLoadingBottom(true);
      pendingScrollAdjustRef.current = null;
      pendingTopPruneAdjustRef.current = null;
      setLoadedChapters([]);

      const chapter = await loadChapter(bookId, initialChapter);
      if (chapter) {
        visiblePassageRef.current = { bookId, chapter: initialChapter };
        setVisiblePassageKey(passageKey);
        lastReportedPassageKeyRef.current = passageKey;

        setLoadedChapters([chapter]);
        // Prefetch adjacent chapters
        prefetchAdjacentChapters(bookId, initialChapter, totalChapters);

        // Cross-book prefetch: make boundary transitions feel instant.
        if (initialChapter === 1) {
          const prevBook = getPreviousBook(bookId);
          if (prevBook && prevBook.chapterCount > 0) {
            // Prefetch the exact chapter we'll need when scrolling up past chapter 1.
            void getChapter(prevBook.id, prevBook.chapterCount);
            // And its adjacent chapter for smoother continued scrolling.
            prefetchAdjacentChapters(prevBook.id, prevBook.chapterCount, prevBook.chapterCount);
          }
        } else if (initialChapter === totalChapters) {
          const nextBook = getNextBook(bookId);
          if (nextBook && nextBook.chapterCount > 0) {
            void getChapter(nextBook.id, 1);
            prefetchAdjacentChapters(nextBook.id, 1, nextBook.chapterCount);
          }
        }
      } else {
        setError('Failed to load chapter');
      }

      setIsLoadingBottom(false);
    };

    init();
  }, [bookId, initialChapter, loadChapter, reloadNonce, totalChapters]);

  // Restore scroll position after initial load
  const scrollRestoredRef = useRef(false);
  const verseScrolledRef = useRef(false);

  // Scroll to specific verse if provided
  useEffect(() => {
    if (loadedChapters.length === 0 || !internalRef.current) return;
    if (!initialVerse || initialVerse <= 0) return;
    if (verseScrolledRef.current) return;

    const tryScrollToVerse = (attempt: number) => {
      const container = internalRef.current;
      if (!container) return;

      // Find the correct chapter container first, then the verse within it
      // This prevents finding a verse from a different chapter when multiple chapters are loaded
      const chapterContainer = container.querySelector(`[data-chapter="${initialChapter}"][data-book-id="${bookId}"]`);
      const verseElement = chapterContainer?.querySelector(`[data-verse="${initialVerse}"]`) as HTMLElement;

      if (verseElement) {
        // Mark as scrolled only after successfully finding the verse
        verseScrolledRef.current = true;

        // Scroll the verse to the top of the viewport
        verseElement.scrollIntoView({ behavior: 'smooth', block: 'start' });

        if (debugScrollRef.current) {
          console.log('[InfiniteScroll] Scrolled to verse:', initialVerse, 'in chapter:', initialChapter, 'at top (attempt', attempt, ')');
        }

        // Notify parent that we've scrolled to the verse
        if (onVerseScrolled) {
          // Wait a bit for the smooth scroll to start before clearing
          setTimeout(() => {
            onVerseScrolled();
          }, 100);
        }
      } else if (attempt < 10) {
        // Retry up to 10 times with increasing delays (50ms, 100ms, 150ms, ...)
        // This handles cases where the DOM hasn't fully rendered yet
        setTimeout(() => tryScrollToVerse(attempt + 1), 50 * attempt);
      } else if (debugScrollRef.current) {
        console.warn('[InfiniteScroll] Could not find verse element after 10 attempts:', initialVerse, 'in chapter:', initialChapter);
      }
    };

    // Start trying after a short delay to let the DOM render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        tryScrollToVerse(1);
      });
    });
  }, [loadedChapters.length, initialVerse, initialChapter, bookId, onVerseScrolled]);

  useEffect(() => {
    if (loadedChapters.length === 0 || !internalRef.current) return;
    if (initialScrollPosition <= 0) return;
    if (scrollRestoredRef.current) return;
    // Don't restore scroll position if we're scrolling to a specific verse
    if (initialVerse && initialVerse > 0) return;

    // Mark as restored to prevent multiple restorations
    scrollRestoredRef.current = true;

    // Use requestAnimationFrame to ensure DOM is fully rendered
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const container = internalRef.current;
        if (!container) return;

        // Restore scroll position
        container.scrollTop = initialScrollPosition;

        if (debugScrollRef.current) {
          console.log('[InfiniteScroll] Restored scroll position:', initialScrollPosition);
        }
      });
    });
  }, [loadedChapters.length, initialScrollPosition, initialVerse]);

  // Reset scroll restoration flags when book/chapter/verse changes
  useEffect(() => {
    scrollRestoredRef.current = false;
    verseScrolledRef.current = false;
  }, [bookId, initialChapter, initialVerse]);

  // Reload chapters when character set changes (instant from pre-cached data)
  useEffect(() => {
    if (currentCharacterSetRef.current === characterSet) return;
    currentCharacterSetRef.current = characterSet;

    // Reload all currently loaded chapters with new character set
    setLoadedChapters((prevChapters) => {
      if (prevChapters.length === 0) return prevChapters;

      // Trigger async reload and update state when done
      Promise.all(
        prevChapters.map((c) => loadChapter(c.bookId, c.chapter))
      ).then((reloadedChapters) => {
        setLoadedChapters(
          reloadedChapters.filter((c): c is LoadedChapter => c !== null)
        );
      });

      // Return previous state for now, async update will replace it
      return prevChapters;
    });
  }, [characterSet, loadChapter]);

  // Load previous chapter (scrolling up) - supports cross-book loading
  const loadPreviousChapter = useCallback(async () => {
    // Debounce: prevent rapid cascade loads
    const now = Date.now();
    if (now - lastLoadTimeRef.current < LOAD_DEBOUNCE_MS) {
      return;
    }

    if (now < suppressTopLoadUntilRef.current) {
      return;
    }

    if (isLoadingTopRef.current || loadedChapters.length === 0) {
      return;
    }

    isLoadingTopRef.current = true;
    lastLoadTimeRef.current = now;
    setIsLoadingTop(true);

    const firstLoaded = loadedChapters[0];
    const firstChapter = firstLoaded.chapter;
    const firstBookId = firstLoaded.bookId;

    let prevChapter: LoadedChapter | null = null;

    try {
      if (firstChapter > 1) {
        // Load previous chapter in same book
        prevChapter = await loadChapter(firstBookId, firstChapter - 1);
        if (debugScrollRef.current) {
          console.log(`[InfiniteScroll] Loading previous chapter in ${firstBookId}: ${firstChapter - 1}`);
        }
      } else {
        // At chapter 1, try to load from previous book
        const prevBook = getPreviousBook(firstBookId);
        if (prevBook && prevBook.chapterCount > 0) {
          // Load the last chapter of the previous book
          if (debugScrollRef.current) {
            console.log(
              `[InfiniteScroll] Loading last chapter of previous book: ${prevBook.id} chapter ${prevBook.chapterCount}`
            );
          }
          prevChapter = await loadChapter(prevBook.id, prevBook.chapterCount);
        }
      }

      if (prevChapter) {
        // Save current scroll position for adjustment after render
        const container = internalRef.current;
        if (!container) {
          return;
        }

        // Store measurements for useLayoutEffect to adjust after render
        pendingScrollAdjustRef.current = {
          scrollHeightBefore: container.scrollHeight,
          scrollTopBefore: container.scrollTop,
          strategy: 'showPrependedEnd',
          releaseUpwardScrollLockAfterAdjust: false,
        };

        // Update state - the useLayoutEffect will handle scroll adjustment
        setLoadedChapters((prev) => [prevChapter!, ...prev]);

        // Prefetch adjacent to the newly loaded chapter
        const targetBook = getBookById(prevChapter.bookId);
        if (targetBook) {
          prefetchAdjacentChapters(prevChapter.bookId, prevChapter.chapter, targetBook.chapterCount);
        }
      }
    } finally {
      isLoadingTopRef.current = false;
      setIsLoadingTop(false);
    }
  }, [loadedChapters, loadChapter]);

  // Load next chapter (scrolling down) - supports cross-book loading
  const loadNextChapter = useCallback(async () => {
    // Debounce: prevent rapid cascade loads
    const now = Date.now();
    if (now - lastLoadTimeRef.current < LOAD_DEBOUNCE_MS) return;

    if (isLoadingBottom || loadedChapters.length === 0) return;
    lastLoadTimeRef.current = now;

    const lastLoaded = loadedChapters[loadedChapters.length - 1];
    const lastChapter = lastLoaded.chapter;
    const lastBookId = lastLoaded.bookId;

    setIsLoadingBottom(true);

    let nextChapter: LoadedChapter | null = null;

    const currentBook = getBookById(lastBookId);
    if (!currentBook) {
      setIsLoadingBottom(false);
      return;
    }

    if (lastChapter < currentBook.chapterCount) {
      // Load next chapter in same book
      nextChapter = await loadChapter(lastBookId, lastChapter + 1);
    } else {
      // At last chapter, try to load from next book
      const nextBook = getNextBook(lastBookId);
      if (nextBook && nextBook.chapterCount > 0) {
        // Load the first chapter of the next book
        nextChapter = await loadChapter(nextBook.id, 1);
      }
    }

    if (nextChapter) {
      setLoadedChapters((prev) => [...prev, nextChapter!]);

      // Prefetch adjacent to the newly loaded chapter
      const targetBook = getBookById(nextChapter.bookId);
      if (targetBook) {
        prefetchAdjacentChapters(nextChapter.bookId, nextChapter.chapter, targetBook.chapterCount);
      }
    }

    setIsLoadingBottom(false);
  }, [isLoadingBottom, loadedChapters, loadChapter]);

  // Keep callback refs updated with latest versions
  useEffect(() => {
    loadPreviousChapterRef.current = loadPreviousChapter;
    loadNextChapterRef.current = loadNextChapter;
  }, [loadPreviousChapter, loadNextChapter]);

  const maintainChapterBuffer = useCallback(
    async (token: number, reason: 'passage' | 'idle') => {
      if (token !== bufferMaintainTokenRef.current) return;
      if (loadedChapters.length === 0) return;
      if (pendingScrollAdjustRef.current) return;
      if (pendingTopPruneAdjustRef.current) return;

      const center = visiblePassageRef.current;
      const centerKey = toPassageKey(center);
      const centerIndex = loadedChapters.findIndex(
        (c) => toPassageKey({ bookId: c.bookId, chapter: c.chapter }) === centerKey
      );
      if (centerIndex < 0) return;

      const chaptersBefore = centerIndex;
      const chaptersAfter = loadedChapters.length - centerIndex - 1;

      // 1) Ensure we have enough previous chapters buffered.
      if (chaptersBefore < MIN_BUFFER_RADIUS) {
        const toLoadCount = Math.max(0, TARGET_BUFFER_RADIUS - chaptersBefore);
        const toPrepend: Passage[] = [];
        let cursor: Passage | null = {
          bookId: loadedChapters[0].bookId,
          chapter: loadedChapters[0].chapter,
        };

        for (let i = 0; i < toLoadCount; i += 1) {
          const previousPassage: Passage | null = cursor ? getPreviousPassage(cursor) : null;
          if (!previousPassage) break;
          toPrepend.unshift(previousPassage);
          cursor = previousPassage;
        }

        if (toPrepend.length > 0) {
          const loaded = (
            await Promise.all(
              toPrepend.map((p) =>
                loadChapter(p.bookId, p.chapter, { showPreprocessedIndicator: false })
              )
            )
          ).filter((c): c is LoadedChapter => c !== null);

          if (token !== bufferMaintainTokenRef.current) return;
          if (loaded.length === 0) return;

          const container = internalRef.current;
          if (container) {
            pendingScrollAdjustRef.current = {
              scrollHeightBefore: container.scrollHeight,
              scrollTopBefore: container.scrollTop,
              strategy: 'maintain',
              releaseUpwardScrollLockAfterAdjust: false,
            };
          }

          setLoadedChapters((prev) => {
            const existing = new Set(prev.map((c) => toPassageKey({ bookId: c.bookId, chapter: c.chapter })));
            const unique = loaded.filter((c) => !existing.has(toPassageKey({ bookId: c.bookId, chapter: c.chapter })));
            return unique.length > 0 ? [...unique, ...prev] : prev;
          });
          return;
        }
      }

      // 2) Ensure we have enough next chapters buffered.
      if (chaptersAfter < MIN_BUFFER_RADIUS) {
        const toLoadCount = Math.max(0, TARGET_BUFFER_RADIUS - chaptersAfter);
        const toAppend: Passage[] = [];
        let cursor: Passage | null = {
          bookId: loadedChapters[loadedChapters.length - 1].bookId,
          chapter: loadedChapters[loadedChapters.length - 1].chapter,
        };

        for (let i = 0; i < toLoadCount; i += 1) {
          const nextPassage: Passage | null = cursor ? getNextPassage(cursor) : null;
          if (!nextPassage) break;
          toAppend.push(nextPassage);
          cursor = nextPassage;
        }

        if (toAppend.length > 0) {
          const loaded = (
            await Promise.all(
              toAppend.map((p) =>
                loadChapter(p.bookId, p.chapter, { showPreprocessedIndicator: false })
              )
            )
          ).filter((c): c is LoadedChapter => c !== null);

          if (token !== bufferMaintainTokenRef.current) return;
          if (loaded.length === 0) return;

          setLoadedChapters((prev) => {
            const existing = new Set(prev.map((c) => toPassageKey({ bookId: c.bookId, chapter: c.chapter })));
            const unique = loaded.filter((c) => !existing.has(toPassageKey({ bookId: c.bookId, chapter: c.chapter })));
            return unique.length > 0 ? [...prev, ...unique] : prev;
          });
          return;
        }
      }

      // 3) Prune (with hysteresis) so we don't mount/unmount on every chapter transition.
      const hardPrune = loadedChapters.length > HARD_MAX_RENDERED_CHAPTERS;
      const shouldPrune =
        hardPrune ||
        (loadedChapters.length > MAX_RENDERED_CHAPTERS &&
          (reason === 'idle' || !isUserScrollingRef.current));
      if (!shouldPrune) return;

      const targetLength = hardPrune ? MAX_RENDERED_CHAPTERS : TARGET_RENDERED_CHAPTERS;
      const overage = loadedChapters.length - targetLength;
      if (overage <= 0) return;

      const removableFromTop = Math.max(0, centerIndex - MIN_BUFFER_RADIUS);
      const removableFromBottom = Math.max(0, (loadedChapters.length - centerIndex - 1) - MIN_BUFFER_RADIUS);
      const direction = scrollDirectionRef.current;

      // When scrolling up, prune from the bottom immediately (no scrollTop adjustment needed).
      if (direction === 'up') {
        const pruneBottomCount = Math.min(overage, removableFromBottom);
        if (pruneBottomCount > 0) {
          setLoadedChapters((prev) => prev.slice(0, Math.max(0, prev.length - pruneBottomCount)));
          return;
        }
      }

      // When scrolling down, prune from the top (keeps ahead content stable). Prefer to do this only
      // when scroll is idle, unless we've exceeded the hard max.
      const canPruneTop = hardPrune || reason === 'idle' || !isUserScrollingRef.current;
      if (!canPruneTop) return;

      const pruneTopCount = Math.min(overage, removableFromTop);
      if (pruneTopCount > 0) {
        const container = internalRef.current;
        if (container) {
          pendingTopPruneAdjustRef.current = {
            scrollHeightBefore: container.scrollHeight,
            scrollTopBefore: container.scrollTop,
          };
        }
        setLoadedChapters((prev) => prev.slice(pruneTopCount));
        return;
      }

      // Fallback: if we can't prune from the preferred side, prune from the other side.
      const pruneBottomCount = Math.min(overage, removableFromBottom);
      if (pruneBottomCount > 0) {
        setLoadedChapters((prev) => prev.slice(0, Math.max(0, prev.length - pruneBottomCount)));
      }
    },
    [
      HARD_MAX_RENDERED_CHAPTERS,
      MAX_RENDERED_CHAPTERS,
      MIN_BUFFER_RADIUS,
      TARGET_BUFFER_RADIUS,
      TARGET_RENDERED_CHAPTERS,
      getNextPassage,
      getPreviousPassage,
      loadChapter,
      loadedChapters,
      toPassageKey,
    ]
  );

  useEffect(() => {
    maintainChapterBufferRef.current = (reason) => {
      const token = bufferMaintainTokenRef.current;
      void maintainChapterBuffer(token, reason);
    };
  }, [maintainChapterBuffer]);

  // Maintain a buffered render window around the visible passage.
  // We keep at least `MIN_BUFFER_RADIUS` chapters on each side, and only prune on idle (or when
  // the window grows too large) to avoid visible hitches when the user crosses chapter boundaries.
  useEffect(() => {
    if (loadedChapters.length === 0) return;

    if (lastBufferMaintainPassageKeyRef.current !== visiblePassageKey) {
      lastBufferMaintainPassageKeyRef.current = visiblePassageKey;
      bufferMaintainTokenRef.current += 1;
    }

    const token = bufferMaintainTokenRef.current;
    void maintainChapterBuffer(token, 'passage');
  }, [visiblePassageKey, loadedChapters, maintainChapterBuffer]);

  // Adjust scroll position after prepending content (runs synchronously after DOM update)
  useLayoutEffect(() => {
    const pending = pendingScrollAdjustRef.current;
    if (!pending) return;

    const container = internalRef.current;
    if (!container) {
      pendingScrollAdjustRef.current = null;
      return;
    }

    // Measure the new scroll height after React rendered the prepended content
    const scrollHeightAfter = container.scrollHeight;
    const heightDifference = scrollHeightAfter - pending.scrollHeightBefore;

    if (debugScrollRef.current) {
      console.log('[InfiniteScroll] Scroll adjustment:', {
        strategy: pending.strategy,
        scrollTopBefore: pending.scrollTopBefore,
        scrollHeightBefore: pending.scrollHeightBefore,
        scrollHeightAfter,
        heightDifference,
      });
    }

    // Safety check: heightDifference should be positive (prepended content adds height)
    if (heightDifference <= 0) {
      console.error('[InfiniteScroll] ERROR: heightDifference is not positive!', heightDifference);
      pendingScrollAdjustRef.current = null;
      return;
    }

    // Prevent immediate cascade loads when we intentionally reposition near the top boundary.
    if (pending.strategy === 'showPrependedEnd') {
      suppressTopLoadUntilRef.current = Date.now() + 500;
    }

    const originalScrollBehavior = container.style.scrollBehavior;
    container.style.scrollBehavior = 'auto';

    if (pending.strategy === 'showPrependedEnd') {
      // User triggered a top-edge load: position at the END of the prepended content
      // with a small offset to show the junction point.
      const JUNCTION_OFFSET = 200; // Show ~200px from the end of prepended chapter
      // Ensure we don't land exactly at the top edge (which can re-trigger top loaders).
      const MIN_SCROLL_TOP = 2;
      const newScrollTop = Math.max(MIN_SCROLL_TOP, heightDifference - JUNCTION_OFFSET);
      if (debugScrollRef.current) {
        console.log('[InfiniteScroll] Setting scroll to END of prepended chapter:', newScrollTop);
        console.log('[InfiniteScroll] Current scrollTop BEFORE setting:', container.scrollTop);
      }
      container.scrollTop = newScrollTop;
      if (debugScrollRef.current) {
        console.log('[InfiniteScroll] Current scrollTop AFTER setting:', container.scrollTop);
      }
    } else {
      // User was mid-scroll - maintain their current visual position
      // This keeps the user seeing what they were seeing, with new content above
      const newScrollTop = pending.scrollTopBefore + heightDifference;
      if (debugScrollRef.current) {
        console.log('[InfiniteScroll] Maintaining current position:', newScrollTop);
      }
      container.scrollTop = newScrollTop;
    }

    // Restore smooth scrolling after the scroll position is stable.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.style.scrollBehavior = originalScrollBehavior;
      });
    });

    // Clear the pending adjustment
    pendingScrollAdjustRef.current = null;
  }, [loadedChapters]);

  // Adjust scroll position after pruning content from the top (keep viewport stable).
  useLayoutEffect(() => {
    const pending = pendingTopPruneAdjustRef.current;
    if (!pending) return;

    const container = internalRef.current;
    if (!container) {
      pendingTopPruneAdjustRef.current = null;
      return;
    }

    const scrollHeightAfter = container.scrollHeight;
    const removedHeight = pending.scrollHeightBefore - scrollHeightAfter;
    if (removedHeight <= 0) {
      pendingTopPruneAdjustRef.current = null;
      return;
    }

    const originalScrollBehavior = container.style.scrollBehavior;
    container.style.scrollBehavior = 'auto';
    container.scrollTop = Math.max(0, pending.scrollTopBefore - removedHeight);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.style.scrollBehavior = originalScrollBehavior;
      });
    });

    pendingTopPruneAdjustRef.current = null;
  }, [loadedChapters]);

  // Intersection Observer for infinite scroll (uses refs to avoid recreation)
  useEffect(() => {
    const container = internalRef.current;
    const topSentinel = topSentinelRef.current;
    const bottomSentinel = bottomSentinelRef.current;

    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (entry.target === topSentinel) {
              const now = Date.now();
              // Only trigger top loads when the user is actually at the top edge.
              // This avoids cascade-loads when we intentionally reposition the
              // viewport near a chapter junction (e.g., cross-book transitions).
              if (container.scrollTop > 1) return;
              if (pendingScrollAdjustRef.current) return;
              if (pendingTopPruneAdjustRef.current) return;
              if (now < suppressTopLoadUntilRef.current) return;
              if (debugScrollRef.current) {
                console.log('[InfiniteScroll] Top sentinel intersecting - loading previous chapter');
              }
              loadPreviousChapterRef.current();
            } else if (entry.target === bottomSentinel) {
              if (debugScrollRef.current) {
                console.log('[InfiniteScroll] Bottom sentinel intersecting - loading next chapter');
              }
              loadNextChapterRef.current();
            }
          }
        });
      },
      {
        root: container, // Use the scroll container as root, not viewport
        rootMargin: '200px',
        threshold: 0
      }
    );

    if (topSentinel) observer.observe(topSentinel);
    if (bottomSentinel) observer.observe(bottomSentinel);

    return () => observer.disconnect();
  }, []); // Empty deps - observer only created once

  // Fallback: detect "overscroll" at the top (wheel/touch) to load previous when
  // the top sentinel is already intersecting (e.g., content not tall enough or
  // the observer fired before initial chapters loaded).
  // PERFORMANCE: All listeners are now PASSIVE to avoid blocking scroll
  useEffect(() => {
    const container = internalRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Can't use preventDefault with passive listener
      // Instead, rely on IntersectionObserver to trigger loads
      if (e.deltaY >= 0) return;
      if (container.scrollTop > 0) return;

      const now = Date.now();
      if (pendingScrollAdjustRef.current) return;
      if (pendingTopPruneAdjustRef.current) return;
      if (now < suppressTopLoadUntilRef.current) return;
      if (isLoadingTopRef.current) return;

      // Trigger load without preventDefault (passive listener)
      loadPreviousChapterRef.current();
    };

    let touchStartY: number | null = null;
    let touchStartScrollTop: number | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      touchStartY = e.touches[0].clientY;
      touchStartScrollTop = container.scrollTop;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartY === null || touchStartScrollTop === null || e.touches.length === 0) return;
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - touchStartY;

      // deltaY > 0 means the user is pulling DOWN, which corresponds to
      // scrolling UP. Only trigger when already at the top.
      // PERFORMANCE: Can't preventDefault with passive listener - rely on overscroll-behavior CSS
      if (deltaY > 20 && touchStartScrollTop <= 0 && container.scrollTop <= 0) {
        const now = Date.now();
        if (pendingScrollAdjustRef.current) return;
        if (pendingTopPruneAdjustRef.current) return;
        if (now < suppressTopLoadUntilRef.current) return;
        if (isLoadingTopRef.current) return;

        loadPreviousChapterRef.current();
        // Avoid rapid re-triggers during the same gesture.
        touchStartY = currentY;
        touchStartScrollTop = container.scrollTop;
      }
    };

    const handleTouchEnd = () => {
      touchStartY = null;
      touchStartScrollTop = null;
    };

    // CRITICAL PERFORMANCE FIX: All listeners are now PASSIVE
    // This allows the browser to scroll immediately without waiting for JavaScript
    container.addEventListener('wheel', handleWheel, { passive: true });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  // Track visible chapter for header update (now tracks both book and chapter)
  // PERFORMANCE: Optimized to reduce expensive DOM queries
  useEffect(() => {
    const container = internalRef.current;
    if (!container) return;

    lastScrollTopRef.current = container.scrollTop;

    // Cache chapter elements to avoid querySelectorAll on every scroll
    let cachedChapterElements: Element[] | null = null;
    let cacheInvalidationTimer: ReturnType<typeof setTimeout> | null = null;

    const invalidateCache = () => {
      cachedChapterElements = null;
      if (cacheInvalidationTimer) {
        clearTimeout(cacheInvalidationTimer);
        cacheInvalidationTimer = null;
      }
    };

    const updateVisiblePassage = () => {
      scrollRafRef.current = null;

      // PERFORMANCE: Use cached elements or query if cache is stale
      if (!cachedChapterElements) {
        cachedChapterElements = Array.from(container.querySelectorAll('[data-chapter]'));
        // Invalidate cache after 2 seconds (when new chapters might be loaded)
        cacheInvalidationTimer = setTimeout(invalidateCache, 2000);
      }

      const containerRect = container.getBoundingClientRect();
      const centerY = containerRect.top + containerRect.height / 3;

      // PERFORMANCE: Early exit if no chapters loaded
      if (cachedChapterElements.length === 0) return;

      // PERFORMANCE: Binary search or quick scan instead of checking all elements
      // For now, use optimized loop with early exit
      for (const el of cachedChapterElements) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= centerY && rect.bottom >= centerY) {
          const chapter = parseInt(el.getAttribute('data-chapter') || '1', 10);
          const chapterBookId = el.getAttribute('data-book-id') || bookId;
          const passageKey = `${chapterBookId}-${chapter}`;

          if (lastReportedPassageKeyRef.current !== passageKey) {
            lastReportedPassageKeyRef.current = passageKey;
            visiblePassageRef.current = { bookId: chapterBookId, chapter };
            setVisiblePassageKey(passageKey);

            // Mark this update so when the parent reflects it back via props,
            // we don't treat it as a navigation event and reset the scroll state.
            pendingPropSyncKeysRef.current.add(passageKey);
            if (pendingPropSyncKeysRef.current.size > 50) {
              pendingPropSyncKeysRef.current.clear();
              pendingPropSyncKeysRef.current.add(passageKey);
            }

            onPassageChange(chapterBookId, chapter);

            // Invalidate cache since we changed chapters
            invalidateCache();
          }
          break;
        }
      }
    };

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const lastScrollTop = lastScrollTopRef.current;
      if (scrollTop !== lastScrollTop) {
        scrollDirectionRef.current = scrollTop > lastScrollTop ? 'down' : 'up';
        lastScrollTopRef.current = scrollTop;
      }

      isUserScrollingRef.current = true;
      if (scrollIdleTimerRef.current) {
        clearTimeout(scrollIdleTimerRef.current);
      }
      scrollIdleTimerRef.current = setTimeout(() => {
        isUserScrollingRef.current = false;
        maintainChapterBufferRef.current('idle');
      }, SCROLL_IDLE_MS);

      // Notify gesture hooks that scroll is happening
      // This allows hold/tap gestures to cancel immediately
      notifyGlobalScrollStart();

      // Save scroll position with debouncing (500ms after scroll stops)
      if (onScrollPositionChange) {
        if (scrollPositionSaveTimerRef.current) {
          clearTimeout(scrollPositionSaveTimerRef.current);
        }
        scrollPositionSaveTimerRef.current = setTimeout(() => {
          onScrollPositionChange(scrollTop);
          if (debugScrollRef.current) {
            console.log('[InfiniteScroll] Saved scroll position:', scrollTop);
          }
        }, 500);
      }

      // PERFORMANCE: Only schedule RAF if not already scheduled
      if (scrollRafRef.current != null) return;
      scrollRafRef.current = requestAnimationFrame(updateVisiblePassage);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollIdleTimerRef.current) {
        clearTimeout(scrollIdleTimerRef.current);
        scrollIdleTimerRef.current = null;
      }
      if (scrollPositionSaveTimerRef.current) {
        clearTimeout(scrollPositionSaveTimerRef.current);
        scrollPositionSaveTimerRef.current = null;
      }
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
      if (cacheInvalidationTimer) {
        clearTimeout(cacheInvalidationTimer);
      }
      isUserScrollingRef.current = false;
      cachedChapterElements = null;
    };
  }, [SCROLL_IDLE_MS, onPassageChange, onScrollPositionChange, bookId]);

  if (!book) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p style={{ color: 'var(--text-secondary)' }}>Book not found</p>
      </div>
    );
  }

  const showTopLoader = isLoadingTop;

  return (
    <div
      ref={setContainerRef}
      className="relative h-full overflow-y-auto"
      data-scroll-container="true"
      style={{
        // Removed scroll-smooth to avoid conflicts with manual scroll adjustments
        overscrollBehaviorY: 'contain',
        paddingBottom: '24px', // Small padding for comfortable scrolling to end
        // Performance: Enable GPU acceleration and optimize scrolling
        WebkitOverflowScrolling: 'touch',
        transform: 'translateZ(0)', // Force GPU layer
        // Performance: Isolate repaints within scroll container
        contain: 'layout style paint',
      }}
    >
      {/* Preprocessed data loading indicator - subtle overlay */}
      <AnimatePresence>
        {isLoadingPreprocessed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
          >
            <div
              className="flex items-center gap-2 rounded-full px-4 py-2 shadow-lg backdrop-blur-sm"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border)',
                borderWidth: '1px',
              }}
            >
              <LoadingSpinner size="small" />
              <span
                className="text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                Loading...
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top loading indicator (overlay to avoid layout shifts) */}
      <AnimatePresence>
        {showTopLoader && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="pointer-events-none absolute left-0 right-0 top-0 z-40 flex items-center justify-center pt-2"
          >
            <div
              className="rounded-full px-4 py-2 shadow-lg backdrop-blur-sm"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border)',
                borderWidth: '1px',
              }}
            >
              <LoadingSpinner size="small" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top sentinel for loading previous */}
      <div ref={topSentinelRef} className="h-1" />

      {/* Error state */}
      {error && loadedChapters.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <p style={{ color: 'var(--text-secondary)' }} className="mb-4">
            {error}
          </p>
          <button
            onClick={() => {
              setError(null);
              lastNavigationTargetKeyRef.current = null;
              pendingPropSyncKeysRef.current.clear();
              pendingScrollAdjustRef.current = null;
              pendingTopPruneAdjustRef.current = null;
              suppressTopLoadUntilRef.current = 0;
              setReloadNonce((prev) => prev + 1);
            }}
            className="rounded-lg px-4 py-2 text-sm"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'white',
            }}
          >
            Try Again
          </button>
        </motion.div>
      )}

      {/* Chapters */}
      {loadedChapters.map((loadedChapter) => (
        <ChapterBlock
          key={`${loadedChapter.bookId}-${loadedChapter.chapter}`}
          loadedChapter={loadedChapter}
          paragraphBreaksLoaded={paragraphBreaksLoaded}
          onWordTapAndHold={onWordTapAndHold}
          onVerseDoubleTap={onVerseDoubleTap}
          showHsk={showHsk}
          activeBookId={activeBookId}
          activeChapter={activeChapter}
          activeVerseNumber={activeVerseNumber}
          highlightedWordIndex={highlightedWordIndex}
          selectedWord={selectedWord}
          selectedWordVerseRef={selectedWordVerseRef}
          dailyReadingPassages={dailyReadingPassages}
          onNextPassage={onNextPassage}
          onCompleteDay={onCompleteDay}
        />
      ))}

      {/* Bottom sentinel for loading next */}
      <div ref={bottomSentinelRef} className="h-1" />

      {/* Bottom loading indicator */}
      <AnimatePresence>
        {isLoadingBottom && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-center py-8"
          >
            <LoadingSpinner />
          </motion.div>
        )}
      </AnimatePresence>

      {/* End of Bible indicator - only show at the very end of Revelation */}
      {loadedChapters.length > 0 && (() => {
        const lastLoaded = loadedChapters[loadedChapters.length - 1];
        const lastBook = getBookById(lastLoaded.bookId);
        const isLastChapterOfBook = lastBook && lastLoaded.chapter >= lastBook.chapterCount;
        const hasNextBook = lastBook && getNextBook(lastBook.id);

        // Only show end indicator if at the last chapter of a book AND there's no next book
        return isLastChapterOfBook && !hasNextBook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-12 text-center"
          >
            <div
              className="mx-auto mb-4 h-px w-16"
              style={{
                background:
                  'linear-gradient(90deg, transparent, var(--border), transparent)',
              }}
            />
            <p
              className="font-display text-xs tracking-[0.3em] uppercase"
              style={{ color: 'var(--text-tertiary)' }}
            >
              End of the Bible
            </p>
          </motion.div>
        );
      })()}
    </div>
  );
});

// Elegant loading spinner
function LoadingSpinner({ size = 'default' }: { size?: 'small' | 'default' }) {
  const dimension = size === 'small' ? 'h-4 w-4' : 'h-8 w-8';

  return (
    <motion.div
      className={`relative ${dimension}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
    >
      <svg viewBox="0 0 32 32" className="h-full w-full">
        <circle
          cx="16"
          cy="16"
          r="12"
          fill="none"
          stroke="var(--border)"
          strokeWidth="2"
        />
        <motion.circle
          cx="16"
          cy="16"
          r="12"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="75"
          strokeDashoffset="60"
        />
      </svg>
    </motion.div>
  );
}
