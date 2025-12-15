import { memo, useState, useMemo } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');

  const { words, getWordsDueForReview, getStats, removeWord } = useVocabularyStore();
  const { setCurrentPosition } = useReadingStore();

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
    // Navigate to the verse where this word was found
    setCurrentPosition(
      word.sourceVerse.bookId,
      word.sourceVerse.chapter,
      word.sourceVerse.verse
    );
    onClose();
  };

  if (showFlashcards) {
    return (
      <FlashcardReview
        words={wordsDueForReview.length > 0 ? wordsDueForReview : words.slice(0, 10)}
        onClose={() => setShowFlashcards(false)}
        onComplete={() => setShowFlashcards(false)}
      />
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50"
          style={{ backgroundColor: 'var(--bg-primary)' }}
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 400 }}
        >
          {/* Header */}
          <header
            className="sticky top-0 z-10 safe-area-top"
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <motion.button
                className="touch-feedback flex items-center gap-2 rounded-lg p-2"
                style={{ color: 'var(--text-tertiary)' }}
                onClick={onClose}
                whileTap={{ scale: 0.95 }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                  />
                </svg>
              </motion.button>

              <h1
                className="font-display text-base tracking-wide"
                style={{ color: 'var(--text-primary)', letterSpacing: '0.1em' }}
              >
                VOCABULARY
              </h1>

              <motion.button
                className="touch-feedback rounded-full px-4 py-1.5 font-body text-sm tracking-wide"
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
            </div>
          </header>

          {/* Stats */}
          <motion.div
            className="border-b px-6 py-5"
            style={{ borderColor: 'var(--border)' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className="font-display text-3xl"
                  style={{ color: 'var(--text-primary)', letterSpacing: '0.02em' }}
                >
                  {stats.totalWords}
                </span>
                <span
                  className="font-body text-sm italic"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  words saved
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="font-display text-xl"
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
                className="mt-3 rounded-xl px-4 py-3"
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
                    className="h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span
                    className="font-body text-sm"
                    style={{ color: 'var(--accent)' }}
                  >
                    {wordsDueForReview.length} words due for review
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
          <div className="h-full overflow-y-auto pb-20">
            {words.length === 0 ? (
              <motion.div
                className="px-6 py-16 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {/* Decorative flourish */}
                <div className="mx-auto mb-6 flex items-center justify-center gap-3">
                  <div
                    className="h-px w-10"
                    style={{ background: 'linear-gradient(90deg, transparent, var(--border))' }}
                  />
                  <div
                    className="h-1.5 w-1.5 rotate-45"
                    style={{ backgroundColor: 'var(--accent-light)', opacity: 0.5 }}
                  />
                  <div
                    className="h-px w-10"
                    style={{ background: 'linear-gradient(90deg, var(--border), transparent)' }}
                  />
                </div>

                <p
                  className="font-display text-lg"
                  style={{ color: 'var(--text-secondary)', letterSpacing: '0.05em' }}
                >
                  No saved words yet
                </p>
                <p
                  className="mt-3 font-body text-sm italic leading-relaxed"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Tap on any Chinese word while reading to save it
                </p>
              </motion.div>
            ) : filteredWords.length === 0 ? (
              <motion.div
                className="px-6 py-16 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p
                  className="font-body text-sm italic"
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
                    className="px-5 py-2.5 font-display text-xs tracking-widest uppercase"
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
      className="flex items-center justify-between px-5 py-4"
      style={{ backgroundColor: 'var(--bg-primary)' }}
      whileHover={{ backgroundColor: 'var(--bg-secondary)' }}
      transition={{ duration: 0.15 }}
    >
      <button
        className="touch-feedback flex-1 text-left"
        onClick={onClick}
      >
        <div className="flex items-baseline gap-3">
          <span
            className="font-chinese-serif text-[22px] leading-none"
            style={{ color: 'var(--text-primary)', letterSpacing: '0.05em' }}
          >
            {word.chinese}
          </span>
          <span
            className="font-body text-sm italic leading-none"
            style={{ color: 'var(--text-tertiary)', opacity: 0.8 }}
          >
            {word.pinyin}
          </span>
        </div>
        {word.definition && (
          <p
            className="mt-2 font-body text-[15px] leading-relaxed"
            style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}
          >
            {word.definition}
          </p>
        )}
        <div className="mt-2 flex items-center gap-3">
          <span
            className="font-body text-xs italic"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {book?.name.english} {word.sourceVerse.chapter}:{word.sourceVerse.verse}
          </span>
          {word.srsData.status === 'mastered' && (
            <span
              className="rounded-full px-2 py-0.5 font-body text-xs tracking-wide"
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
        className="touch-feedback ml-3 rounded-lg p-2.5"
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
          className="h-5 w-5"
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
