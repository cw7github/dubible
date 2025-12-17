import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { SegmentedWord, VerseReference, CrossReference, PlanPassage } from '../../types';
import { useReadingStore, useSettingsStore, useProgressStore, useReadingPlansStore } from '../../stores';
import { getBookById } from '../../data/bible';
import { getCrossReferences } from '../../services/preprocessedLoader';
import { useScrollDismiss, usePassageHistory, useTwoFingerSwipe } from '../../hooks';
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

  // Popup immunity - prevents gestures from triggering immediately after panel dismissal
  const [gesturesDisabled, setGesturesDisabled] = useState(false);
  const gestureImmunityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track when the panel was opened (used to guard against phantom scroll-dismiss events)
  const panelOpenTimestampRef = useRef<number>(0);

  // Track when direct navigation happened (to prevent scroll from overriding display chapter)
  const directNavTimestampRef = useRef<number>(0);

  const {
    currentBookId,
    currentChapter,
    currentVerse,
    scrollPosition,
    setCurrentPosition,
    setScrollPosition,
  } = useReadingStore();

  const { showHskIndicators, fontFamily, textSize } = useSettingsStore();
  const { markChapterRead } = useProgressStore();
  const { getCurrentDayReading, markDayComplete } = useReadingPlansStore();

  // Get current day's reading passages (if following a plan)
  const currentDayReading = getCurrentDayReading();
  const dailyReadingPassages = currentDayReading?.passages;

  // Get current book info
  const currentBook = useMemo(() => getBookById(currentBookId), [currentBookId]);

  // Scroll ref for panel dismissal and infinite scroll
  const scrollRef = useRef<HTMLDivElement>(null);

  // Handle word tap-and-hold - show word definition
  const handleWordTapAndHold = useCallback((word: SegmentedWord, verseRef: VerseReference) => {
    // Don't trigger if gestures are disabled (immunity period)
    if (gesturesDisabled) return;

    // iOS PWA Fix: Check if we're already showing this exact word
    // This prevents duplicate triggers from touch event quirks
    const isAlreadyShowing =
      panelMode === 'word' &&
      selectedWord?.chinese === word.chinese &&
      selectedWord?.pinyin === word.pinyin &&
      selectedWordVerseRef?.bookId === verseRef.bookId &&
      selectedWordVerseRef?.chapter === verseRef.chapter &&
      selectedWordVerseRef?.verse === verseRef.verse;

    if (isAlreadyShowing) {
      // Already showing this word's definition, ignore duplicate trigger
      return;
    }

    setSelectedWord(word);
    setSelectedWordVerseRef(verseRef);
    setPanelMode('word');

    // Record when panel was opened
    panelOpenTimestampRef.current = Date.now();
  }, [gesturesDisabled, panelMode, selectedWord, selectedWordVerseRef]);

  // Handle verse double-tap - show English translation
  const handleVerseDoubleTap = useCallback(async (verseRef: VerseReference) => {
    // Don't trigger if gestures are disabled (immunity period)
    if (gesturesDisabled) return;

    setSelectedVerseRef(verseRef);
    setSelectedWord(null);
    setSelectedWordVerseRef(null);
    setPanelMode('verse');

    // Record when panel was opened
    panelOpenTimestampRef.current = Date.now();

    // Load cross-references for this verse
    const refs = await getCrossReferences(verseRef.bookId, verseRef.chapter, verseRef.verse);
    setCrossReferences(refs);
  }, [gesturesDisabled]);

  // Close panel
  const handleClosePanel = useCallback(() => {
    setPanelMode(null);
    setSelectedVerseRef(null);
    setSelectedWord(null);
    setSelectedWordVerseRef(null);
    setCrossReferences([]);
  }, []);

  // Close panel with immunity - prevents immediate re-trigger of gestures
  const handleClosePanelWithImmunity = useCallback(() => {
    // Clear any existing immunity timer
    if (gestureImmunityTimerRef.current) {
      clearTimeout(gestureImmunityTimerRef.current);
    }

    // Close the panel
    handleClosePanel();

    // Enable gesture immunity for a brief period
    setGesturesDisabled(true);

    // Re-enable gestures after immunity period (400ms - longer than hold threshold)
    gestureImmunityTimerRef.current = setTimeout(() => {
      setGesturesDisabled(false);
      gestureImmunityTimerRef.current = null;
    }, 400);
  }, [handleClosePanel]);

  // Scroll-based dismissal with immunity for PWA mode
  // In iOS PWA, phantom scroll events can fire when the panel first appears
  const handleScrollDismiss = useCallback(() => {
    const timeSinceOpen = Date.now() - panelOpenTimestampRef.current;
    if (timeSinceOpen < 800) {
      // Block scroll dismissal for 800ms after panel opens
      // This prevents phantom scroll events in iOS PWA mode from dismissing the card
      return;
    }
    handleClosePanel();
  }, [handleClosePanel]);

  // Scroll-based panel dismissal - TEMPORARILY DISABLED FOR PWA DEBUGGING
  // If the card stays visible in PWA mode with this disabled, scroll dismiss is the cause
  const { opacity: panelOpacity } = useScrollDismiss({
    isVisible: false,  // DISABLED - testing if scroll dismiss causes PWA issue
    onDismiss: handleScrollDismiss,
    scrollContainerRef: scrollRef,
    scrollThreshold: 15,
    dismissDelay: 150,
  });

  // Handle chapter change from infinite scroll
  const handlePassageChange = useCallback(
    (newBookId: string, newChapter: number) => {
      // Don't let scroll override displayChapter within 500ms of direct navigation
      // This prevents the header from flickering when navigating via search/book selector
      const timeSinceDirectNav = Date.now() - directNavTimestampRef.current;
      if (timeSinceDirectNav > 500) {
        setDisplayChapter(newChapter);
      }
      if (newBookId !== currentBookId || newChapter !== currentChapter) {
        // Clear the verse when changing chapters (we only want to scroll to verse once)
        setCurrentPosition(newBookId, newChapter);
      }
      // Mark chapter as read for progress tracking
      markChapterRead(newBookId, newChapter);
    },
    [currentBookId, currentChapter, setCurrentPosition, markChapterRead]
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

  // Handle navigation to next passage in reading plan
  const handleNextPassage = useCallback(
    (passage: PlanPassage) => {
      setCurrentPosition(passage.bookId, passage.startChapter);
      setDisplayChapter(passage.startChapter);
    },
    [setCurrentPosition]
  );

  // Handle completing the day's reading
  const handleCompleteDay = useCallback(() => {
    if (currentDayReading) {
      markDayComplete(currentDayReading.day);
    }
  }, [currentDayReading, markDayComplete]);

  // Clear the target verse after scrolling to it
  const handleVerseScrolled = useCallback(() => {
    // Clear the verse so it doesn't keep scrolling to it
    if (currentVerse !== null) {
      setCurrentPosition(currentBookId, currentChapter);
    }
  }, [currentBookId, currentChapter, currentVerse, setCurrentPosition]);

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

  // Sync displayChapter when currentChapter changes externally (e.g., from search or book selector)
  useEffect(() => {
    setDisplayChapter(currentChapter);
    // Mark this as a direct navigation to prevent scroll from overriding
    directNavTimestampRef.current = Date.now();
  }, [currentBookId, currentChapter]);

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

  // Cleanup immunity timer on unmount
  useEffect(() => {
    return () => {
      if (gestureImmunityTimerRef.current) {
        clearTimeout(gestureImmunityTimerRef.current);
      }
    };
  }, []);

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
      {/* Header - always visible */}
      <Header
        bookName={currentBook.name}
        chapter={displayChapter || currentChapter}
        onMenuClick={() => setIsNavOpen(true)}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onVocabClick={() => setIsVocabOpen(true)}
      />

      {/* Book Navigator */}
      <BookNavigator
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
      />

      {/* Backdrop overlay - dismisses panel when tapping outside */}
      {panelMode !== null && (
        <div
          className="fixed inset-0 z-30"
          style={{
            top: '56px', // Below header
            backgroundColor: 'transparent',
          }}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            handleClosePanelWithImmunity();
          }}
          onTouchStart={(e) => {
            // Fallback for older iOS versions without Pointer Events.
            if ('PointerEvent' in window) return;
            e.preventDefault();
            handleClosePanelWithImmunity();
          }}
        />
      )}

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
      <main
        className={`
          flex-1 overflow-hidden
          ${fontClass} ${sizeClass} text-chinese
        `}
        style={{
          color: 'var(--text-primary)',
          paddingTop: 'calc(56px + env(safe-area-inset-top, 0px))',
        }}
      >
        <div className="mx-auto h-full max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl px-4 sm:px-6 lg:px-8">
          <InfiniteScroll
            ref={scrollRef}
            bookId={currentBookId}
            initialChapter={currentChapter}
            initialScrollPosition={scrollPosition}
            initialVerse={currentVerse}
            onPassageChange={handlePassageChange}
            onScrollPositionChange={setScrollPosition}
            onVerseScrolled={handleVerseScrolled}
            onWordTapAndHold={handleWordTapAndHold}
            onVerseDoubleTap={handleVerseDoubleTap}
            showHsk={showHskIndicators}
            activeBookId={panelMode === 'verse' && selectedVerseRef ? selectedVerseRef.bookId : null}
            activeChapter={panelMode === 'verse' && selectedVerseRef ? selectedVerseRef.chapter : null}
            activeVerseNumber={panelMode === 'verse' && selectedVerseRef ? selectedVerseRef.verse : null}
            highlightedWordIndex={null}
            selectedWord={selectedWord}
            selectedWordVerseRef={selectedWordVerseRef}
            dailyReadingPassages={dailyReadingPassages}
            onNextPassage={handleNextPassage}
            onCompleteDay={handleCompleteDay}
          />
        </div>
      </main>

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
