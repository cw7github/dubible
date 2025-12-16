import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SegmentedWord, VerseReference, CrossReference } from '../../types';
import { useReadingStore, useSettingsStore } from '../../stores';
import { getBookById } from '../../data/bible';
import { getCrossReferences } from '../../services/preprocessedLoader';
import { useFocusMode, useScrollDismiss, usePassageHistory, useTwoFingerSwipe } from '../../hooks';
import { InfiniteScroll } from './InfiniteScroll';
import { TranslationPanel, type PanelMode } from './TranslationPanel';
import { Header } from '../navigation/Header';
import { BookNavigator } from '../navigation/BookNavigator';
import { VocabularyScreen } from '../vocabulary';
import { SettingsScreen } from '../settings';

export function ReadingScreen() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isVocabOpen, setIsVocabOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [displayChapter, setDisplayChapter] = useState<number | null>(null);

  // Translation panel state
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [selectedVerseRef, setSelectedVerseRef] = useState<VerseReference | null>(null);
  const [selectedWord, setSelectedWord] = useState<SegmentedWord | null>(null);
  const [selectedWordVerseRef, setSelectedWordVerseRef] = useState<VerseReference | null>(null);
  const [crossReferences, setCrossReferences] = useState<CrossReference[]>([]);

  const {
    currentBookId,
    currentChapter,
    setCurrentPosition,
  } = useReadingStore();

  const { showHskIndicators, fontFamily, textSize } = useSettingsStore();

  // Get current book info
  const currentBook = useMemo(() => getBookById(currentBookId), [currentBookId]);

  // Focus mode - hide UI when scrolling down for immersive reading
  const { isHidden: isFocusMode, scrollRef } = useFocusMode({
    forceVisible: panelMode !== null || isNavOpen || isVocabOpen || isSettingsOpen,
  });

  // Handle word tap - show word definition
  const handleWordTap = useCallback((word: SegmentedWord, verseRef: VerseReference) => {
    setSelectedWord(word);
    setSelectedWordVerseRef(verseRef);
    setPanelMode('word');
  }, []);

  // Handle verse long-press - show English translation
  const handleVerseLongPress = useCallback(async (verseRef: VerseReference) => {
    setSelectedVerseRef(verseRef);
    setSelectedWord(null);
    setSelectedWordVerseRef(null);
    setPanelMode('verse');

    // Load cross-references for this verse
    const refs = await getCrossReferences(verseRef.bookId, verseRef.chapter, verseRef.verse);
    setCrossReferences(refs);
  }, []);

  // Close panel
  const handleClosePanel = useCallback(() => {
    setPanelMode(null);
    setSelectedVerseRef(null);
    setSelectedWord(null);
    setSelectedWordVerseRef(null);
    setCrossReferences([]);
  }, []);

  // Scroll-based panel dismissal - instant and responsive
  const { opacity: panelOpacity } = useScrollDismiss({
    isVisible: panelMode !== null,
    onDismiss: handleClosePanel,
    scrollContainerRef: scrollRef,
    scrollThreshold: 15,  // Start fading after just 15px of scroll
    dismissDelay: 150,    // Quick dismiss once threshold passed
  });

  // Handle chapter change from infinite scroll
  const handlePassageChange = useCallback(
    (newBookId: string, newChapter: number) => {
      setDisplayChapter(newChapter);
      if (newBookId !== currentBookId || newChapter !== currentChapter) {
        setCurrentPosition(newBookId, newChapter);
      }
    },
    [currentBookId, currentChapter, setCurrentPosition]
  );

  // Navigate to a specific passage (used by history)
  const handleNavigateToPassage = useCallback(
    (bookId: string, chapter: number) => {
      setCurrentPosition(bookId, chapter);
      setDisplayChapter(chapter);
    },
    [setCurrentPosition]
  );

  // Navigate to a cross-reference
  const handleNavigateToCrossRef = useCallback(
    (bookId: string, chapter: number, _verse: number) => {
      handleClosePanel();
      handleNavigateToPassage(bookId, chapter);
      // Optionally scroll to the specific verse later
    },
    [handleClosePanel, handleNavigateToPassage]
  );

  // Passage history hook - track and navigate through viewing history
  const {
    goBack: navigateBack,
    goForward: navigateForward,
    canGoBack,
    canGoForward,
    trackCurrentPassage,
  } = usePassageHistory({
    currentBookId,
    currentChapter: displayChapter || currentChapter,
    onNavigate: handleNavigateToPassage,
  });

  // Track current passage in history when chapter changes
  // This happens when user navigates via infinite scroll or book navigator
  useEffect(() => {
    if (displayChapter !== null) {
      trackCurrentPassage();
    }
  }, [displayChapter, trackCurrentPassage]);

  // Two-finger swipe navigation
  useTwoFingerSwipe({
    onSwipeLeft: () => {
      if (canGoBack) {
        navigateBack();
      }
    },
    onSwipeRight: () => {
      if (canGoForward) {
        navigateForward();
      }
    },
    threshold: 80,
    enabled: true,
  });

  // Font class based on settings
  const fontClass = fontFamily === 'serif' ? 'font-chinese-serif' : 'font-chinese-sans';
  const sizeClass = `text-chinese-${textSize}`;

  if (!currentBook) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p style={{ color: 'var(--text-secondary)' }}>Book not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header - hides in focus mode */}
      <Header
        bookName={currentBook.name}
        chapter={displayChapter || currentChapter}
        onMenuClick={() => setIsNavOpen(true)}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onVocabClick={() => setIsVocabOpen(true)}
        isHidden={isFocusMode}
      />

      {/* Book Navigator */}
      <BookNavigator
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
      />

      {/* Translation Panel - appears below header */}
      <TranslationPanel
        mode={panelMode}
        verseRef={selectedVerseRef}
        crossReferences={crossReferences}
        word={selectedWord}
        wordVerseRef={selectedWordVerseRef}
        onClose={handleClosePanel}
        onNavigateToCrossRef={handleNavigateToCrossRef}
        scrollOpacity={panelOpacity}
      />

      {/* Reading content with infinite scroll */}
      <motion.main
        className={`
          flex-1 overflow-hidden
          ${fontClass} ${sizeClass} text-chinese
        `}
        style={{
          color: 'var(--text-primary)',
        }}
        initial={false}
        animate={{
          paddingTop: isFocusMode ? 'max(env(safe-area-inset-top, 0px), 8px)' : 'calc(56px + env(safe-area-inset-top, 0px))',
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 35,
        }}
      >
        <div className="mx-auto h-full max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl px-4 sm:px-6 lg:px-8">
          <InfiniteScroll
            ref={scrollRef}
            bookId={currentBookId}
            initialChapter={currentChapter}
            onPassageChange={handlePassageChange}
            onWordTap={handleWordTap}
            onVerseLongPress={handleVerseLongPress}
            showHsk={showHskIndicators}
            activeBookId={null}
            activeChapter={null}
            activeVerseNumber={null}
            highlightedWordIndex={null}
          />
        </div>
      </motion.main>

      {/* Bottom navigation bar - hides in focus mode */}
      <motion.nav
        className="fixed bottom-0 left-0 right-0 z-30 safe-area-bottom"
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderTop: '1px solid var(--border-subtle)',
        }}
        initial={false}
        animate={{
          y: isFocusMode ? 80 : 0,
          opacity: isFocusMode ? 0 : 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 35,
        }}
      >
        <div className="mx-auto flex max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl items-center justify-center px-4 sm:px-6 lg:px-8 py-3">
          {/* Book selector button - ergonomic thumb zone placement */}
          <button
            className="touch-feedback flex items-center gap-2 rounded-full px-4 py-2 transition-colors"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
            }}
            onClick={() => setIsNavOpen(true)}
            aria-label="Select book"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
            >
              {/* Book spines icon - library shelf aesthetic */}
              <line
                x1="3"
                y1="20"
                x2="21"
                y2="20"
                stroke="currentColor"
                strokeWidth="0.8"
                strokeLinecap="round"
                opacity="0.35"
              />
              <rect x="4.2" y="4.5" width="3.2" height="15.5" rx="0.4" fill="currentColor" opacity="0.8" />
              <rect x="8.7" y="6.5" width="3" height="13.5" rx="0.4" fill="currentColor" opacity="0.7" />
              <rect x="12.9" y="5.5" width="3.1" height="14.5" rx="0.4" fill="currentColor" opacity="0.75" />
              <rect x="17.6" y="7.5" width="3" height="12.5" rx="0.4" fill="currentColor" opacity="0.65" />
            </svg>
            <span className="text-sm font-medium">Books</span>
          </button>
        </div>
      </motion.nav>

      {/* Focus mode edge hints - subtle gradients when UI is hidden */}
      <AnimatePresence>
        {isFocusMode && (
          <>
            {/* Top edge hint */}
            <motion.div
              className="pointer-events-none fixed left-0 right-0 top-0 h-8 z-20"
              style={{
                background: 'linear-gradient(to bottom, var(--bg-primary), transparent)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
            {/* Bottom edge hint */}
            <motion.div
              className="pointer-events-none fixed left-0 right-0 bottom-0 h-8 z-20"
              style={{
                background: 'linear-gradient(to top, var(--bg-primary), transparent)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Vocabulary screen */}
      <VocabularyScreen
        isOpen={isVocabOpen}
        onClose={() => setIsVocabOpen(false)}
      />

      {/* Settings screen */}
      <SettingsScreen
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
