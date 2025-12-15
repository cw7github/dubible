import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SegmentedWord, VerseReference } from '../../types';
import { useReadingStore, useSettingsStore } from '../../stores';
import { getBookById } from '../../data/bible';
import { useAudioPlayer, useFocusMode, useScrollDismiss } from '../../hooks';
import { InfiniteScroll } from './InfiniteScroll';
import { TranslationPanel, type PanelMode } from './TranslationPanel';
import { AudioPlayer } from './AudioPlayer';
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

  // Audio player hook
  const audioPlayer = useAudioPlayer({
    bookId: currentBookId,
    chapter: currentChapter,
    onVerseChange: () => {},
  });

  // Handle verse tap - show English translation
  const handleVerseTap = useCallback((verseRef: VerseReference) => {
    setSelectedVerseRef(verseRef);
    setSelectedWord(null);
    setSelectedWordVerseRef(null);
    setPanelMode('verse');
  }, []);

  // Handle word long-press - show word definition
  const handleWordLongPress = useCallback((word: SegmentedWord, verseRef: VerseReference) => {
    setSelectedWord(word);
    setSelectedWordVerseRef(verseRef);
    setPanelMode('word');
  }, []);

  // Close panel
  const handleClosePanel = useCallback(() => {
    setPanelMode(null);
    setSelectedVerseRef(null);
    setSelectedWord(null);
    setSelectedWordVerseRef(null);
  }, []);

  // Scroll-based panel dismissal with smooth fade
  const { opacity: panelOpacity } = useScrollDismiss({
    isVisible: panelMode !== null,
    onDismiss: handleClosePanel,
    scrollContainerRef: scrollRef,
    scrollThreshold: 50,
    dismissDelay: 400,
  });

  // Handle chapter change from infinite scroll
  const handleChapterChange = useCallback(
    (chapter: number) => {
      setDisplayChapter(chapter);
      // Update store position (for persistence)
      if (chapter !== currentChapter) {
        setCurrentPosition(currentBookId, chapter);
      }
    },
    [currentBookId, currentChapter, setCurrentPosition]
  );

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
        word={selectedWord}
        wordVerseRef={selectedWordVerseRef}
        onClose={handleClosePanel}
        scrollOpacity={panelOpacity}
      />

      {/* Reading content with infinite scroll */}
      <motion.main
        className={`
          flex-1 overflow-hidden
          ${fontClass} ${sizeClass} text-chinese
        `}
        style={{ color: 'var(--text-primary)' }}
        initial={false}
        animate={{
          paddingTop: isFocusMode ? '0px' : '56px',
          paddingBottom: isFocusMode ? '0px' : '60px',
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 35,
        }}
      >
        <div className="mx-auto h-full max-w-2xl px-6">
          <InfiniteScroll
            bookId={currentBookId}
            initialChapter={currentChapter}
            onChapterChange={handleChapterChange}
            onVerseTap={handleVerseTap}
            onWordLongPress={handleWordLongPress}
            showHsk={showHskIndicators}
            activeVerseNumber={
              audioPlayer.isPlaying ? audioPlayer.currentVerseNumber : null
            }
            highlightedWordIndex={
              audioPlayer.isPlaying ? audioPlayer.currentWordIndex : null
            }
            scrollRef={scrollRef}
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
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3">
          {/* Audio player */}
          <AudioPlayer
            isPlaying={audioPlayer.isPlaying}
            isAvailable={audioPlayer.isAvailable}
            currentTime={audioPlayer.currentTime}
            duration={audioPlayer.duration}
            playbackRate={audioPlayer.playbackRate}
            currentVerseNumber={audioPlayer.currentVerseNumber}
            onTogglePlay={audioPlayer.toggle}
            onSeek={audioPlayer.seek}
            onSetPlaybackRate={audioPlayer.setPlaybackRate}
          />

          {/* Vocabulary button */}
          <button
            className="touch-feedback flex items-center gap-2 rounded-full px-4 py-2 transition-colors"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
            }}
            onClick={() => setIsVocabOpen(true)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
            </svg>
            <span className="text-sm font-medium">Words</span>
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
