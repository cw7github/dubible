import { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Chapter, SegmentedWord, VerseReference } from '../../types';
import { getBookById } from '../../data/bible';
import { getChapter, prefetchAdjacentChapters } from '../../services/bibleCache';
import { useSettingsStore } from '../../stores';
import { VerseDisplay } from './VerseDisplay';
import { ChapterTransition } from './ChapterTransition';

interface LoadedChapter {
  bookId: string;
  chapter: number;
  data: Chapter;
}

interface InfiniteScrollProps {
  bookId: string;
  initialChapter: number;
  onChapterChange: (chapter: number) => void;
  onVerseTap: (verseRef: VerseReference) => void;
  onWordLongPress: (word: SegmentedWord, verseRef: VerseReference) => void;
  showHsk: boolean;
  activeVerseNumber?: number | null;
  highlightedWordIndex?: number | null;
  /** External ref for scroll container (for focus mode) */
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}

export function InfiniteScroll({
  bookId,
  initialChapter,
  onChapterChange,
  onVerseTap,
  onWordLongPress,
  showHsk,
  activeVerseNumber,
  highlightedWordIndex,
  scrollRef,
}: InfiniteScrollProps) {
  const [loadedChapters, setLoadedChapters] = useState<LoadedChapter[]>([]);
  const [isLoadingTop, setIsLoadingTop] = useState(false);
  const [isLoadingBottom, setIsLoadingBottom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingPreprocessed, setIsLoadingPreprocessed] = useState(false);

  // Get character set preference for cache fetching
  const characterSet = useSettingsStore((state) => state.characterSet);

  const internalRef = useRef<HTMLDivElement>(null);
  // Use external ref if provided, otherwise internal
  const containerRef = scrollRef || internalRef;
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  const currentBookRef = useRef(bookId);
  const currentCharacterSetRef = useRef(characterSet);

  const book = getBookById(bookId);
  const totalChapters = book?.chapterCount || 1;

  // Load a chapter with current character set
  const loadChapter = useCallback(
    async (chapterNum: number): Promise<LoadedChapter | null> => {
      if (chapterNum < 1 || chapterNum > totalChapters) return null;

      try {
        // Show loading indicator for preprocessed data
        setIsLoadingPreprocessed(true);

        // Pass characterSet to get pre-converted verses from cache
        const data = await getChapter(bookId, chapterNum, characterSet);

        setIsLoadingPreprocessed(false);

        if (!data) return null;

        return { bookId, chapter: chapterNum, data };
      } catch (err) {
        console.error('Failed to load chapter:', err);
        setIsLoadingPreprocessed(false);
        return null;
      }
    },
    [bookId, totalChapters, characterSet]
  );

  // Initial load
  useEffect(() => {
    if (currentBookRef.current !== bookId) {
      // Book changed, reset everything
      currentBookRef.current = bookId;
      setLoadedChapters([]);
      isInitialLoad.current = true;
    }

    if (!isInitialLoad.current) return;
    isInitialLoad.current = false;

    const init = async () => {
      setError(null);
      setIsLoadingBottom(true);

      const chapter = await loadChapter(initialChapter);
      if (chapter) {
        setLoadedChapters([chapter]);
        // Prefetch adjacent chapters
        prefetchAdjacentChapters(bookId, initialChapter, totalChapters);
      } else {
        setError('Failed to load chapter');
      }

      setIsLoadingBottom(false);
    };

    init();
  }, [bookId, initialChapter, loadChapter, totalChapters]);

  // Reload chapters when character set changes (instant from pre-cached data)
  useEffect(() => {
    if (currentCharacterSetRef.current === characterSet) return;
    currentCharacterSetRef.current = characterSet;

    // Reload all currently loaded chapters with new character set
    setLoadedChapters((prevChapters) => {
      if (prevChapters.length === 0) return prevChapters;

      // Trigger async reload and update state when done
      const chapterNumbers = prevChapters.map((c) => c.chapter);
      Promise.all(chapterNumbers.map((num) => loadChapter(num))).then(
        (reloadedChapters) => {
          setLoadedChapters(
            reloadedChapters.filter((c): c is LoadedChapter => c !== null)
          );
        }
      );

      // Return previous state for now, async update will replace it
      return prevChapters;
    });
  }, [characterSet, loadChapter]);

  // Load previous chapter (scrolling up)
  const loadPreviousChapter = useCallback(async () => {
    if (isLoadingTop || loadedChapters.length === 0) return;

    const firstChapter = loadedChapters[0].chapter;
    if (firstChapter <= 1) return;

    setIsLoadingTop(true);

    const prevChapter = await loadChapter(firstChapter - 1);
    if (prevChapter) {
      // Save current scroll position
      const container = containerRef.current;
      const scrollHeightBefore = container?.scrollHeight || 0;

      setLoadedChapters((prev) => [prevChapter, ...prev]);

      // Restore scroll position after DOM update
      requestAnimationFrame(() => {
        if (container) {
          const scrollHeightAfter = container.scrollHeight;
          container.scrollTop += scrollHeightAfter - scrollHeightBefore;
        }
      });

      // Prefetch next previous
      prefetchAdjacentChapters(bookId, firstChapter - 1, totalChapters);
    }

    setIsLoadingTop(false);
  }, [isLoadingTop, loadedChapters, loadChapter, bookId, totalChapters]);

  // Load next chapter (scrolling down)
  const loadNextChapter = useCallback(async () => {
    if (isLoadingBottom || loadedChapters.length === 0) return;

    const lastChapter = loadedChapters[loadedChapters.length - 1].chapter;
    if (lastChapter >= totalChapters) return;

    setIsLoadingBottom(true);

    const nextChapter = await loadChapter(lastChapter + 1);
    if (nextChapter) {
      setLoadedChapters((prev) => [...prev, nextChapter]);
      // Prefetch next
      prefetchAdjacentChapters(bookId, lastChapter + 1, totalChapters);
    }

    setIsLoadingBottom(false);
  }, [isLoadingBottom, loadedChapters, loadChapter, bookId, totalChapters]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const topSentinel = topSentinelRef.current;
    const bottomSentinel = bottomSentinelRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (entry.target === topSentinel) {
              loadPreviousChapter();
            } else if (entry.target === bottomSentinel) {
              loadNextChapter();
            }
          }
        });
      },
      { rootMargin: '200px', threshold: 0 }
    );

    if (topSentinel) observer.observe(topSentinel);
    if (bottomSentinel) observer.observe(bottomSentinel);

    return () => observer.disconnect();
  }, [loadPreviousChapter, loadNextChapter]);

  // Track visible chapter for header update
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const chapterElements = container.querySelectorAll('[data-chapter]');
      const containerRect = container.getBoundingClientRect();
      const centerY = containerRect.top + containerRect.height / 3;

      for (const el of chapterElements) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= centerY && rect.bottom >= centerY) {
          const chapter = parseInt(el.getAttribute('data-chapter') || '1', 10);
          onChapterChange(chapter);
          break;
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [onChapterChange]);

  if (!book) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p style={{ color: 'var(--text-secondary)' }}>Book not found</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto scroll-smooth"
      style={{ scrollBehavior: 'smooth' }}
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

      {/* Top loading indicator */}
      <AnimatePresence>
        {isLoadingTop && (
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
              isInitialLoad.current = true;
              setError(null);
              setLoadedChapters([]);
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
      {loadedChapters.map((loadedChapter, idx) => (
        <div
          key={`${loadedChapter.bookId}-${loadedChapter.chapter}`}
          data-chapter={loadedChapter.chapter}
        >
          {/* Chapter transition */}
          <ChapterTransition
            bookId={loadedChapter.bookId}
            bookName={book.name}
            chapter={loadedChapter.chapter}
            isFirstChapter={loadedChapter.chapter === 1}
          />

          {/* Verses */}
          <div className="space-y-1 pb-2">
            {loadedChapter.data.verses.map((verse) => (
              <VerseDisplay
                key={`${loadedChapter.bookId}-${loadedChapter.chapter}-${verse.number}`}
                verse={verse}
                bookId={loadedChapter.bookId}
                chapter={loadedChapter.chapter}
                onVerseTap={onVerseTap}
                onWordLongPress={onWordLongPress}
                showHsk={showHsk}
                isActive={
                  activeVerseNumber === verse.number &&
                  idx === loadedChapters.length - 1
                }
                highlightedWordIndex={
                  activeVerseNumber === verse.number &&
                  idx === loadedChapters.length - 1
                    ? highlightedWordIndex
                    : null
                }
              />
            ))}
          </div>
        </div>
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

      {/* End of book indicator */}
      {loadedChapters.length > 0 &&
        loadedChapters[loadedChapters.length - 1].chapter >= totalChapters && (
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
              End of {book.name.english}
            </p>
          </motion.div>
        )}
    </div>
  );
}

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
