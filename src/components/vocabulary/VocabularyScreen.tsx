import { memo, useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVocabularyStore, useReadingStore } from '../../stores';
import { getBookById } from '../../data/bible';
import type { SavedWord } from '../../types';
import { FlashcardReview } from './FlashcardReview';

interface VocabularyScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VocabularyScreen = memo(function VocabularyScreen({
  isOpen,
  onClose,
}: VocabularyScreenProps) {
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [singleReviewWord, setSingleReviewWord] = useState<SavedWord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { words, getWordsDueForReview, getStats, removeWord } = useVocabularyStore();
  const { setCurrentPosition } = useReadingStore();

  // Prevent body scroll when open (but not when flashcards are showing, they handle their own lock)
  useEffect(() => {
    if (isOpen && !showFlashcards) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen, showFlashcards]);

  const stats = getStats();
  const wordsDueForReview = getWordsDueForReview();

  // Filter words by search query
  const filteredWords = useMemo(() => {
    if (!searchQuery.trim()) return words;
    const query = searchQuery.toLowerCase();
    return words.filter(
      (word) =>
        word.chinese.includes(query) ||
        word.pinyin.toLowerCase().includes(query) ||
        word.definition.toLowerCase().includes(query)
    );
  }, [words, searchQuery]);

  // Group words by date
  const groupedWords = useMemo(() => {
    const groups: { [key: string]: SavedWord[] } = {};
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 24 * 60 * 60 * 1000;
    const weekAgo = today - 7 * 24 * 60 * 60 * 1000;

    filteredWords.forEach((word) => {
      const wordDate = new Date(word.createdAt);
      const wordDay = new Date(
        wordDate.getFullYear(),
        wordDate.getMonth(),
        wordDate.getDate()
      ).getTime();

      let key: string;
      if (wordDay >= today) {
        key = 'Today';
      } else if (wordDay >= yesterday) {
        key = 'Yesterday';
      } else if (wordDay >= weekAgo) {
        key = 'This Week';
      } else {
        key = 'Earlier';
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(word);
    });

    return groups;
  }, [filteredWords]);

  const handleWordClick = (word: SavedWord) => {
    // Open flashcard review for this specific word
    setSingleReviewWord(word);
    setShowFlashcards(true);
  };

  const handleFlashcardNavigateToVerse = (bookId: string, chapter: number, verse: number) => {
    // Close flashcard review and vocabulary screen, then navigate
    setShowFlashcards(false);
    setSingleReviewWord(null);
    setCurrentPosition(bookId, chapter, verse);
    onClose();
  };

  const handleCloseFlashcards = () => {
    setShowFlashcards(false);
    setSingleReviewWord(null);
  };

  if (showFlashcards) {
    // If reviewing a single word, show just that word; otherwise show due words or first 10
    const reviewWords = singleReviewWord
      ? [singleReviewWord]
      : (wordsDueForReview.length > 0 ? wordsDueForReview : words.slice(0, 10));

    return (
      <FlashcardReview
        words={reviewWords}
        onClose={handleCloseFlashcards}
        onComplete={handleCloseFlashcards}
        onNavigateToVerse={handleFlashcardNavigateToVerse}
      />
    );
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-45"
            style={{ backgroundColor: 'var(--overlay)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={handleBackdropClick}
          />

          {/* Panel - Slides from left */}
          <motion.div
            className="fixed top-0 left-0 bottom-0 z-46 w-80 max-w-[85vw] overflow-hidden shadow-elevated safe-area-top safe-area-bottom"
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRight: '1px solid var(--border-subtle)',
            }}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 500 }}
          >
            {/* Compact Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-1 h-4 rounded-full"
                  style={{ backgroundColor: 'var(--accent)' }}
                />
                <span
                  className="font-display text-sm md:text-xs tracking-[0.2em] uppercase"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Vocabulary
                </span>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  className="touch-feedback rounded-full px-3 py-1 font-body text-xs tracking-wide"
                  style={{
                    backgroundColor: words.length > 0 ? 'var(--accent)' : 'var(--bg-secondary)',
                    color: words.length > 0 ? 'white' : 'var(--text-tertiary)',
                  }}
                  onClick={() => setShowFlashcards(true)}
                  disabled={words.length === 0}
                  whileTap={words.length > 0 ? { scale: 0.95 } : {}}
                >
                  Review
                </motion.button>
                <motion.button
                  className="touch-feedback rounded-lg p-1.5 -mr-1"
                  style={{ color: 'var(--text-tertiary)' }}
                  onClick={onClose}
                  whileTap={{ scale: 0.9 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </motion.button>
              </div>
            </div>

          {/* Stats - Compact */}
          <motion.div
            className="border-b px-4 py-3"
            style={{ borderColor: 'var(--border)' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="font-display text-2xl"
                  style={{ color: 'var(--text-primary)', letterSpacing: '0.02em' }}
                >
                  {stats.totalWords}
                </span>
                <span
                  className="font-body text-xs italic"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  saved
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="font-display text-lg"
                  style={{ color: 'var(--accent)', opacity: 0.9 }}
                >
                  {stats.masteredWords}
                </span>
                <span
                  className="font-body text-xs italic"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  mastered
                </span>
              </div>
            </div>

            {wordsDueForReview.length > 0 && (
              <motion.div
                className="mt-2 rounded-lg px-3 py-2"
                style={{ backgroundColor: 'var(--accent-subtle)' }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={1.5}
                    className="h-3.5 w-3.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span
                    className="font-body text-xs"
                    style={{ color: 'var(--accent)' }}
                  >
                    {wordsDueForReview.length} due for review
                  </span>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Search */}
          <motion.div
            className="px-4 py-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-2.5"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-5 w-5"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search saved words..."
                className="flex-1 bg-transparent font-body text-sm outline-none placeholder:italic"
                style={{ color: 'var(--text-primary)' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </motion.div>

          {/* Word list */}
          <div className="flex-1 overflow-y-auto pb-16">
            {words.length === 0 ? (
              <motion.div
                className="px-4 py-10 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {/* Decorative flourish */}
                <div className="mx-auto mb-4 flex items-center justify-center gap-2">
                  <div
                    className="h-px w-8"
                    style={{ background: 'linear-gradient(90deg, transparent, var(--border))' }}
                  />
                  <div
                    className="h-1 w-1 rotate-45"
                    style={{ backgroundColor: 'var(--accent-light)', opacity: 0.5 }}
                  />
                  <div
                    className="h-px w-8"
                    style={{ background: 'linear-gradient(90deg, var(--border), transparent)' }}
                  />
                </div>

                <p
                  className="font-display text-base"
                  style={{ color: 'var(--text-secondary)', letterSpacing: '0.05em' }}
                >
                  No saved words yet
                </p>
                <p
                  className="mt-2 font-body text-xs italic leading-relaxed"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Tap any Chinese word while reading to save it
                </p>
              </motion.div>
            ) : filteredWords.length === 0 ? (
              <motion.div
                className="px-4 py-10 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p
                  className="font-body text-xs italic"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  No words match "{searchQuery}"
                </p>
              </motion.div>
            ) : (
              Object.entries(groupedWords).map(([group, groupWords], groupIndex) => (
                <motion.div
                  key={group}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + groupIndex * 0.05 }}
                >
                  <h3
                    className="px-4 py-2 font-display text-[10px] tracking-widest uppercase"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {group}
                  </h3>
                  <div className="space-y-px" style={{ backgroundColor: 'var(--border-subtle)' }}>
                    {groupWords.map((word, wordIndex) => (
                      <WordItem
                        key={word.id}
                        word={word}
                        index={wordIndex}
                        onClick={() => handleWordClick(word)}
                        onDelete={() => removeWord(word.id)}
                      />
                    ))}
                  </div>
                </motion.div>
              ))
            )}
          </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

interface WordItemProps {
  word: SavedWord;
  index: number;
  onClick: () => void;
  onDelete: () => void;
}

const WordItem = memo(function WordItem({ word, onClick, onDelete }: WordItemProps) {
  const book = getBookById(word.sourceVerse.bookId);

  return (
    <motion.div
      className="flex items-center justify-between px-4 py-3"
      style={{ backgroundColor: 'var(--bg-primary)' }}
      whileHover={{ backgroundColor: 'var(--bg-secondary)' }}
      transition={{ duration: 0.15 }}
    >
      <button
        className="touch-feedback flex-1 text-left min-w-0"
        onClick={onClick}
      >
        <div className="flex items-baseline gap-2">
          <span
            className="font-chinese-serif text-lg leading-none"
            style={{ color: 'var(--text-primary)', letterSpacing: '0.05em' }}
          >
            {word.chinese}
          </span>
          <span
            className="font-body text-xs italic leading-none truncate"
            style={{ color: 'var(--text-tertiary)', opacity: 0.8 }}
          >
            {word.pinyin}
          </span>
        </div>
        {word.definition && (
          <p
            className="mt-1 font-body text-sm leading-snug line-clamp-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            {word.definition}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          <span
            className="font-body text-[10px] italic"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {book?.name.english} {word.sourceVerse.chapter}:{word.sourceVerse.verse}
          </span>
          {word.srsData.status === 'mastered' && (
            <span
              className="rounded-full px-1.5 py-0.5 font-body text-[10px] tracking-wide"
              style={{
                backgroundColor: 'var(--accent-subtle)',
                color: 'var(--accent)',
              }}
            >
              Mastered
            </span>
          )}
        </div>
      </button>

      <motion.button
        className="touch-feedback ml-2 rounded-lg p-2 flex-shrink-0"
        style={{ color: 'var(--text-tertiary)' }}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label="Delete word"
        whileTap={{ scale: 0.9 }}
        whileHover={{ color: 'var(--text-secondary)' }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-4 w-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
          />
        </svg>
      </motion.button>
    </motion.div>
  );
});
