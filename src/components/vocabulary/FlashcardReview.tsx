import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVocabularyStore } from '../../stores';
import { getBookById } from '../../data/bible';
import type { SavedWord, ReviewResult } from '../../types';

interface FlashcardReviewProps {
  words: SavedWord[];
  onClose: () => void;
  onComplete: () => void;
}

export const FlashcardReview = memo(function FlashcardReview({
  words,
  onClose,
  onComplete,
}: FlashcardReviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);

  const { reviewWord } = useVocabularyStore();

  const currentWord = words[currentIndex];
  const progress = ((currentIndex + 1) / words.length) * 100;
  const remaining = words.length - currentIndex;

  const handleReveal = () => {
    setIsRevealed(true);
  };

  const handleReview = useCallback(
    (result: ReviewResult) => {
      if (!currentWord) return;

      setDirection(result === 'good' ? 'right' : 'left');

      // Review the word
      reviewWord(currentWord.id, result);

      // Move to next card after animation
      setTimeout(() => {
        if (currentIndex < words.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setIsRevealed(false);
          setDirection(null);
        } else {
          onComplete();
        }
      }, 200);
    },
    [currentWord, currentIndex, words.length, reviewWord, onComplete]
  );

  const book = currentWord ? getBookById(currentWord.sourceVerse.bookId) : null;

  if (!currentWord) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <motion.div
          className="text-center px-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Decorative flourish */}
          <motion.div
            className="mx-auto mb-6 flex items-center justify-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div
              className="h-px w-8"
              style={{ background: 'linear-gradient(90deg, transparent, var(--border))' }}
            />
            <div
              className="h-1.5 w-1.5 rotate-45"
              style={{ backgroundColor: 'var(--accent-light)', opacity: 0.6 }}
            />
            <div
              className="h-px w-8"
              style={{ background: 'linear-gradient(90deg, var(--border), transparent)' }}
            />
          </motion.div>

          <p
            className="font-display text-lg"
            style={{ color: 'var(--text-secondary)', letterSpacing: '0.05em' }}
          >
            No words to review
          </p>

          <motion.button
            className="touch-feedback mt-6 rounded-full px-6 py-2.5 font-body text-sm tracking-wide"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'white',
            }}
            onClick={onClose}
            whileTap={{ scale: 0.95 }}
          >
            Go Back
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: 'var(--bg-primary)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <header
        className="safe-area-top"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </motion.button>

          <h1
            className="font-display text-base tracking-wide"
            style={{ color: 'var(--text-primary)', letterSpacing: '0.1em' }}
          >
            REVIEW
          </h1>

          <span
            className="font-body text-sm italic"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {remaining} remaining
          </span>
        </div>

        {/* Progress bar - elegant thin line */}
        <div
          className="h-px"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <motion.div
            className="h-full"
            style={{
              backgroundColor: 'var(--accent)',
              boxShadow: '0 0 8px var(--accent-light)',
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </header>

      {/* Card area */}
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentWord.id}
            className="w-full max-w-sm"
            initial={{
              opacity: 0,
              scale: 0.95,
              x: direction === 'left' ? -50 : direction === 'right' ? 50 : 0,
            }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{
              opacity: 0,
              scale: 0.95,
              x: direction === 'left' ? -100 : direction === 'right' ? 100 : 0,
            }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {/* Flashcard */}
            <motion.div
              className="rounded-3xl px-10 py-12 shadow-elevated"
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border)',
                boxShadow: '0 8px 32px var(--shadow-elevated), 0 0 0 1px var(--border-subtle)',
              }}
              onClick={!isRevealed ? handleReveal : undefined}
              whileTap={!isRevealed ? { scale: 0.98 } : {}}
            >
              {/* Chinese word */}
              <div className="text-center">
                <motion.h2
                  className="font-chinese-serif text-6xl"
                  style={{
                    color: 'var(--text-primary)',
                    letterSpacing: '0.05em',
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {currentWord.chinese}
                </motion.h2>

                {/* Revealed content */}
                <AnimatePresence>
                  {isRevealed && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <p
                        className="mt-6 font-body text-[22px] italic"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {currentWord.pinyin}
                      </p>

                      {/* Decorative divider */}
                      <motion.div
                        className="mx-auto my-8 h-px w-20"
                        style={{
                          background:
                            'linear-gradient(90deg, transparent, var(--accent-light), transparent)',
                        }}
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.3 }}
                      />

                      <p
                        className="font-body text-xl leading-relaxed"
                        style={{ color: 'var(--text-primary)', lineHeight: '1.75' }}
                      >
                        {currentWord.definition}
                      </p>

                      {currentWord.partOfSpeech && (
                        <p
                          className="mt-3 font-body text-sm italic"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {currentWord.partOfSpeech}
                        </p>
                      )}

                      {/* Source verse */}
                      <motion.div
                        className="mt-6 rounded-xl px-4 py-3"
                        style={{ backgroundColor: 'var(--bg-secondary)' }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <p
                          className="font-body text-xs italic tracking-wide"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {book?.name.english} {currentWord.sourceVerse.chapter}:
                          {currentWord.sourceVerse.verse}
                        </p>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!isRevealed && (
                  <motion.p
                    className="mt-10 font-body text-sm tracking-wide"
                    style={{ color: 'var(--text-tertiary)' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    Tap to reveal
                  </motion.p>
                )}
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div
        className="safe-area-bottom"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <div className="flex gap-4 p-4">
          {isRevealed ? (
            <>
              <motion.button
                className="touch-feedback flex flex-1 flex-col items-center gap-2 rounded-2xl py-5"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                }}
                onClick={() => handleReview('again')}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth={1.5}
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
                <span className="font-body text-sm tracking-wide">Still Learning</span>
              </motion.button>

              <motion.button
                className="touch-feedback flex flex-1 flex-col items-center gap-2 rounded-2xl py-5"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'white',
                }}
                onClick={() => handleReview('good')}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-body text-sm tracking-wide">Know It</span>
              </motion.button>
            </>
          ) : (
            <motion.button
              className="touch-feedback flex-1 rounded-2xl py-5 text-center"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'white',
              }}
              onClick={handleReveal}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="font-display text-sm tracking-widest uppercase">
                Show Answer
              </span>
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
});
