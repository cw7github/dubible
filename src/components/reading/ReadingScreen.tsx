import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { SegmentedWord, VerseReference, CrossReference, PlanPassage } from '../../types';
import { useReadingStore, useSettingsStore, useProgressStore, useReadingPlansStore } from '../../stores';
import { getBookById, getNextBook, getPreviousBook } from '../../data/bible';
import { getCrossReferences } from '../../services/preprocessedLoader';
import { useScrollDismiss, usePassageHistory, useTwoFingerSwipe, useAudioPlayer } from '../../hooks';
import { InfiniteScroll } from './InfiniteScroll';
import { TranslationPanel, type PanelMode } from './TranslationPanel';
import { AudioBar } from './AudioBar';
import { Header } from '../navigation/Header';
import { BookNavigator } from '../navigation/BookNavigator';
import { VocabularyScreen } from '../vocabulary';
import { SettingsScreen } from '../settings';

const AUTO_ADVANCE_DELAY = 2; // seconds before auto-advancing to next chapter

export function ReadingScreen() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isVocabOpen, setIsVocabOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [displayChapter, setDisplayChapter] = useState<number | null>(null);
  const [showAudioBar, setShowAudioBar] = useState(false);

  // Auto-advance state
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState(AUTO_ADVANCE_DELAY);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-scroll state
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const lastScrolledVerseRef = useRef<number | null>(null);
  const userScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const programmaticScrollRef = useRef(false);

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

  // Audio player
  const audioChapter = displayChapter || currentChapter;

  // Get current book info (needed for chapter navigation calculations)
  const currentBook = useMemo(() => getBookById(currentBookId), [currentBookId]);

  // Ref for the next chapter handler to avoid circular dependencies
  const handleNextChapterRef = useRef<(() => void) | null>(null);
  // Ref for audio player to avoid circular dependencies
  const audioPlayerRef = useRef<ReturnType<typeof useAudioPlayer> | null>(null);

  // Calculate if we can navigate to previous/next chapters
  const canGoPreviousChapter = useMemo(() => {
    if (audioChapter > 1) return true;
    // Check if there's a previous book
    const prevBook = getPreviousBook(currentBookId);
    return !!prevBook;
  }, [currentBookId, audioChapter]);

  const canGoNextChapter = useMemo(() => {
    if (currentBook && audioChapter < currentBook.chapterCount) return true;
    // Check if there's a next book
    const nextBook = getNextBook(currentBookId);
    return !!nextBook;
  }, [currentBookId, audioChapter, currentBook]);

  // Cancel auto-advance
  const handleCancelAutoAdvance = useCallback(() => {
    setIsAutoAdvancing(false);
    setAutoAdvanceCountdown(AUTO_ADVANCE_DELAY);
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Handle chapter end for auto-advance
  const handleChapterEnd = useCallback(() => {
    if (!showAudioBar || !canGoNextChapter) return;

    // Reset the hasEnded flag to allow the next chapter to play
    audioPlayerRef.current?.resetEnded();

    // Start auto-advance countdown
    setIsAutoAdvancing(true);
    setAutoAdvanceCountdown(AUTO_ADVANCE_DELAY);

    // Start countdown interval
    countdownIntervalRef.current = setInterval(() => {
      setAutoAdvanceCountdown(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Set timer to advance after delay
    autoAdvanceTimerRef.current = setTimeout(() => {
      // Call via ref to avoid stale closure
      handleNextChapterRef.current?.();
      setIsAutoAdvancing(false);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }, AUTO_ADVANCE_DELAY * 1000);
  }, [showAudioBar, canGoNextChapter]);

  const audioPlayer = useAudioPlayer({
    bookId: currentBookId,
    chapter: audioChapter,
    onChapterEnd: handleChapterEnd,
  });

  // Keep audioPlayerRef in sync
  useEffect(() => {
    audioPlayerRef.current = audioPlayer;
  }, [audioPlayer]);

  // Get current day's reading passages (if following a plan)
  const currentDayReading = getCurrentDayReading();
  const dailyReadingPassages = currentDayReading?.passages;

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
      // CRITICAL FIX: Don't update chapter state when audio is playing
      // This was causing the audio to stop/change when user scrolled to different chapters
      // Audio playback should be independent of scroll position - users should be able
      // to scroll freely while audio continues playing the same chapter
      if (showAudioBar && audioPlayer.isPlaying) {
        // When audio is playing, don't update any chapter state
        // This keeps the audio player locked to its current chapter
        // Still mark chapter as read for progress tracking
        markChapterRead(newBookId, newChapter);
        return;
      }

      // Normal scroll behavior when audio is NOT playing
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
    [currentBookId, currentChapter, setCurrentPosition, markChapterRead, showAudioBar, audioPlayer.isPlaying]
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

  // Navigate to previous chapter (for audio player)
  const handlePreviousChapter = useCallback(() => {
    // Cancel auto-advance if user manually navigates during countdown
    handleCancelAutoAdvance();

    if (audioChapter > 1) {
      // Same book, previous chapter
      setCurrentPosition(currentBookId, audioChapter - 1);
      setDisplayChapter(audioChapter - 1);
      directNavTimestampRef.current = Date.now();
      // Auto-play after a brief delay for the audio to load
      setTimeout(() => audioPlayer.play(), 300);
    } else {
      // Go to previous book, last chapter
      const prevBook = getPreviousBook(currentBookId);
      if (prevBook) {
        setCurrentPosition(prevBook.id, prevBook.chapterCount);
        setDisplayChapter(prevBook.chapterCount);
        directNavTimestampRef.current = Date.now();
        setTimeout(() => audioPlayer.play(), 300);
      }
    }
  }, [currentBookId, audioChapter, setCurrentPosition, audioPlayer, handleCancelAutoAdvance]);

  // Navigate to next chapter (for audio player)
  const handleNextChapter = useCallback(() => {
    // Cancel auto-advance countdown if it's running (user manually triggered or countdown completed)
    handleCancelAutoAdvance();

    if (currentBook && audioChapter < currentBook.chapterCount) {
      // Same book, next chapter
      setCurrentPosition(currentBookId, audioChapter + 1);
      setDisplayChapter(audioChapter + 1);
      directNavTimestampRef.current = Date.now();
      // Auto-play after a brief delay for the audio to load
      setTimeout(() => audioPlayer.play(), 300);
    } else {
      // Go to next book, first chapter
      const nextBook = getNextBook(currentBookId);
      if (nextBook) {
        setCurrentPosition(nextBook.id, 1);
        setDisplayChapter(1);
        directNavTimestampRef.current = Date.now();
        setTimeout(() => audioPlayer.play(), 300);
      }
    }
  }, [currentBookId, audioChapter, currentBook, setCurrentPosition, audioPlayer, handleCancelAutoAdvance]);

  // Keep the ref updated with the latest handler
  useEffect(() => {
    handleNextChapterRef.current = handleNextChapter;
  }, [handleNextChapter]);

  // Cleanup auto-advance timers on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

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

  // Auto-scroll to current verse during playback
  useEffect(() => {
    if (!showAudioBar || !audioPlayer.isPlaying || !autoScrollEnabled) {
      return;
    }

    const currentVerse = audioPlayer.currentVerseNumber;
    if (!currentVerse || currentVerse === lastScrolledVerseRef.current) {
      return;
    }

    // Find the verse element - MUST match book, chapter, AND verse to avoid scrolling to wrong chapter
    const verseElement = scrollRef.current?.querySelector(
      `[data-book="${currentBookId}"][data-chapter="${audioChapter}"][data-verse="${currentVerse}"]`
    );
    if (verseElement) {
      lastScrolledVerseRef.current = currentVerse;

      // Mark this as a programmatic scroll to avoid triggering user scroll detection
      programmaticScrollRef.current = true;

      // Smooth scroll to verse, positioning it in the center of the viewport
      // This shows both the previous verse (above) and current verse (centered),
      // allowing users to finish reading the previous verse while the current one plays
      verseElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });

      // Clear the flag after scrolling completes (smooth scroll takes ~500ms)
      setTimeout(() => {
        programmaticScrollRef.current = false;
      }, 600);
    }
  }, [showAudioBar, audioPlayer.isPlaying, audioPlayer.currentVerseNumber, autoScrollEnabled, currentBookId, audioChapter]);

  // Detect user scrolling and disable auto-scroll
  const handleUserScroll = useCallback(() => {
    // Ignore programmatic scrolls (auto-scroll itself)
    if (programmaticScrollRef.current) {
      return;
    }

    if (!showAudioBar || !audioPlayer.isPlaying || !autoScrollEnabled) {
      return;
    }

    // Clear any existing timeout
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }

    // Disable auto-scroll after a brief delay to avoid false positives
    userScrollTimeoutRef.current = setTimeout(() => {
      setAutoScrollEnabled(false);
    }, 150);
  }, [showAudioBar, audioPlayer.isPlaying, autoScrollEnabled]);

  // Attach scroll listener to detect user scrolling
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    scrollContainer.addEventListener('scroll', handleUserScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener('scroll', handleUserScroll);
    };
  }, [handleUserScroll]);

  // Toggle auto-scroll handler
  const handleResumeAutoScroll = useCallback(() => {
    // Clear any pending user scroll timeout to prevent it from disabling auto-scroll
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
      userScrollTimeoutRef.current = null;
    }

    setAutoScrollEnabled(prev => {
      const newState = !prev;

      // If enabling auto-scroll, immediately scroll to current verse
      if (newState && audioPlayer.currentVerseNumber) {
        lastScrolledVerseRef.current = null; // Reset to force immediate scroll

        // Mark as programmatic BEFORE scheduling the scroll
        programmaticScrollRef.current = true;

        // Scroll to current verse after a brief delay to ensure state is updated
        setTimeout(() => {
          const currentVerse = audioPlayer.currentVerseNumber;
          // MUST match book, chapter, AND verse to avoid scrolling to wrong chapter
          const verseElement = scrollRef.current?.querySelector(
            `[data-book="${currentBookId}"][data-chapter="${audioChapter}"][data-verse="${currentVerse}"]`
          );
          if (verseElement) {
            verseElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
            // Keep programmatic flag set longer to cover the entire scroll event window
            // Smooth scroll takes ~500ms, but scroll events can fire for another ~300ms after
            setTimeout(() => {
              programmaticScrollRef.current = false;
            }, 1000);
          } else {
            // If we can't find the element, clear the flag
            programmaticScrollRef.current = false;
          }
        }, 100);
      }

      return newState;
    });
  }, [audioPlayer.currentVerseNumber, currentBookId, audioChapter]);

  // Re-enable auto-scroll when audio bar is opened
  useEffect(() => {
    if (showAudioBar) {
      setAutoScrollEnabled(true);
      lastScrolledVerseRef.current = null;
    }
  }, [showAudioBar]);

  // Cleanup user scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
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
        onAudioClick={() => setShowAudioBar(!showAudioBar)}
        isAudioActive={showAudioBar && audioPlayer.isPlaying}
        isAudioAvailable={audioPlayer.isAvailable || audioPlayer.isLoading}
      />

      {/* Audio Bar */}
      <AnimatePresence>
        {showAudioBar && (
          <AudioBar
            isPlaying={audioPlayer.isPlaying}
            isAvailable={audioPlayer.isAvailable}
            isLoading={audioPlayer.isLoading}
            currentTime={audioPlayer.currentTime}
            duration={audioPlayer.duration}
            playbackRate={audioPlayer.playbackRate}
            currentVerseNumber={audioPlayer.currentVerseNumber}
            currentWord={audioPlayer.currentWord}
            currentPinyin={audioPlayer.currentPinyin}
            currentDefinition={audioPlayer.currentDefinition}
            isMusicPlaying={audioPlayer.isMusicPlaying}
            bookName={currentBook.name}
            chapter={audioChapter}
            totalChapters={currentBook.chapterCount}
            onTogglePlay={() => {
              // If user manually pauses during auto-advance countdown, cancel it
              if (audioPlayer.isPlaying && isAutoAdvancing) {
                handleCancelAutoAdvance();
              }
              audioPlayer.toggle();
            }}
            onSeek={audioPlayer.seek}
            onSetPlaybackRate={audioPlayer.setPlaybackRate}
            onClose={() => {
              audioPlayer.pause();
              handleCancelAutoAdvance();
              setShowAudioBar(false);
            }}
            onPreviousChapter={handlePreviousChapter}
            onNextChapter={handleNextChapter}
            canGoPrevious={canGoPreviousChapter}
            canGoNext={canGoNextChapter}
            isAutoAdvancing={isAutoAdvancing}
            autoAdvanceCountdown={autoAdvanceCountdown}
            onCancelAutoAdvance={handleCancelAutoAdvance}
            autoScrollEnabled={autoScrollEnabled}
            onResumeAutoScroll={handleResumeAutoScroll}
          />
        )}
      </AnimatePresence>

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
        onPlayFromVerse={(verseRef) => {
          console.log('[ReadingScreen] Play from verse requested:', verseRef);
          // CRITICAL: Always honor "play from here" by switching chapter if needed
          // User intent is clear: they want to hear THIS verse, not continue current playback

          // Check if we need to switch chapters
          if (verseRef.bookId !== currentBookId || verseRef.chapter !== audioChapter) {
            console.log('[ReadingScreen] Switching to different chapter:', {
              from: { bookId: currentBookId, chapter: audioChapter },
              to: { bookId: verseRef.bookId, chapter: verseRef.chapter },
            });
            // Switch to the verse's chapter first
            setCurrentPosition(verseRef.bookId, verseRef.chapter);
            setDisplayChapter(verseRef.chapter);
            setShowAudioBar(true);

            // Cancel any auto-advance countdown
            handleCancelAutoAdvance();

            // Wait for new audio to load, then seek and play
            // This delay ensures the audio player has loaded the new chapter's audio
            setTimeout(() => {
              console.log('[ReadingScreen] Seeking to verse after chapter switch:', verseRef.verse);
              audioPlayer.seekToVerse(verseRef.verse);
            }, 500);
          } else {
            console.log('[ReadingScreen] Same chapter, seeking immediately to verse:', verseRef.verse);
            // Same chapter - seek immediately and start playing
            setShowAudioBar(true);
            handleCancelAutoAdvance();
            audioPlayer.seekToVerse(verseRef.verse);
          }
        }}
        onPlayFromWord={(verseRef, wordIndex) => {
          // CRITICAL: Always honor "play from here" by switching chapter if needed
          // User intent is clear: they want to hear THIS word, not continue current playback

          // Check if we need to switch chapters
          if (verseRef.bookId !== currentBookId || verseRef.chapter !== audioChapter) {
            // Switch to the word's chapter first
            setCurrentPosition(verseRef.bookId, verseRef.chapter);
            setDisplayChapter(verseRef.chapter);
            setShowAudioBar(true);

            // Cancel any auto-advance countdown
            handleCancelAutoAdvance();

            // Wait for new audio to load, then seek and play
            // This delay ensures the audio player has loaded the new chapter's audio
            setTimeout(() => {
              audioPlayer.seekToWord(verseRef.verse, wordIndex);
            }, 500);
          } else {
            // Same chapter - seek immediately and start playing
            setShowAudioBar(true);
            handleCancelAutoAdvance();
            audioPlayer.seekToWord(verseRef.verse, wordIndex);
          }
        }}
        isAudioAvailable={audioPlayer.isAvailable}
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
          // Extra padding when audio bar is visible
          paddingTop: showAudioBar
            ? 'calc(56px + 88px + env(safe-area-inset-top, 0px))'
            : 'calc(56px + env(safe-area-inset-top, 0px))',
          transition: 'padding-top 0.3s ease',
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
            activeBookId={
              panelMode === 'verse' && selectedVerseRef
                ? selectedVerseRef.bookId
                : showAudioBar && audioPlayer.isPlaying
                  ? currentBookId
                  : null
            }
            activeChapter={
              panelMode === 'verse' && selectedVerseRef
                ? selectedVerseRef.chapter
                : showAudioBar && audioPlayer.isPlaying
                  ? audioChapter
                  : null
            }
            activeVerseNumber={
              panelMode === 'verse' && selectedVerseRef
                ? selectedVerseRef.verse
                : showAudioBar && audioPlayer.isPlaying
                  ? audioPlayer.currentVerseNumber
                  : null
            }
            highlightedWordIndex={showAudioBar && audioPlayer.isPlaying ? audioPlayer.currentWordIndex : null}
            selectedWord={selectedWord}
            selectedWordVerseRef={selectedWordVerseRef}
            dailyReadingPassages={dailyReadingPassages}
            onNextPassage={handleNextPassage}
            onCompleteDay={handleCompleteDay}
            isAudioBarVisible={showAudioBar}
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
