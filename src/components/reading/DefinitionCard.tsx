/**
 * DefinitionCard - DEPRECATED: Not currently used in the codebase
 *
 * NOTE: This component has z-index conflicts (z-35, z-40) with the documented
 * z-index system. TranslationPanel and WordDetailPanel have replaced this functionality.
 * Consider removing this file or updating z-indexes to z-30/z-31 if re-enabled.
 */

import { memo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SegmentedWord, VerseReference } from '../../types';
import { useVocabularyStore } from '../../stores';
import { getBookById } from '../../data/bible';

interface DefinitionCardProps {
  word: SegmentedWord | null;
  verseRef: VerseReference | null;
  onClose: () => void;
}

export const DefinitionCard = memo(function DefinitionCard({
  word,
  verseRef,
  onClose,
}: DefinitionCardProps) {
  const { addWord, removeWord, isWordSaved, getWordByChars } = useVocabularyStore();

  const isSaved = word ? isWordSaved(word.chinese) : false;
  const savedWord = word ? getWordByChars(word.chinese) : undefined;

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (word) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [word, onClose]);

  const handleSaveToggle = useCallback(() => {
    if (!word || !verseRef) return;

    if (isSaved && savedWord) {
      removeWord(savedWord.id);
    } else {
      addWord(
        word.chinese,
        word.pinyin,
        word.definition || '',
        verseRef,
        word.partOfSpeech,
        word.hskLevel ?? undefined
      );
    }
  }, [word, verseRef, isSaved, savedWord, addWord, removeWord]);

  const book = verseRef ? getBookById(verseRef.bookId) : null;

  return (
    <AnimatePresence>
      {word && (
        <>
          {/* Invisible tap-away layer - CONFLICT: Uses z-35 instead of standard z-30 */}
          <div
            className="fixed inset-0 z-35"
            onClick={onClose}
            style={{ pointerEvents: 'auto' }}
          />

          {/* Top Definition Bar - CONFLICT: Uses z-40 instead of standard z-31 */}
          <motion.div
            className="fixed left-0 right-0 z-40"
            style={{ top: '56px' }} // Below the header
            initial={{ y: '-100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          >
            <div
              className="mx-auto max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="mx-2 rounded-b-xl shadow-lg"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  borderBottom: '1px solid var(--border-subtle)',
                  borderLeft: '1px solid var(--border-subtle)',
                  borderRight: '1px solid var(--border-subtle)',
                }}
              >
                {/* Main content row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Chinese word with pinyin */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <ruby
                      className="font-chinese-serif text-xl"
                      style={{
                        color: 'var(--text-primary)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {word.chinese}
                      <rt
                        className="font-body text-[10px] italic"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {word.pinyin}
                      </rt>
                    </ruby>

                    {/* HSK badge - compact */}
                    {word.hskLevel && (
                      <span
                        className="rounded px-1.5 py-0.5 text-[9px] font-medium tracking-wide"
                        style={{
                          backgroundColor: 'var(--accent-subtle)',
                          color: 'var(--accent)',
                        }}
                      >
                        {word.hskLevel}
                      </span>
                    )}
                  </div>

                  {/* Subtle divider */}
                  <div
                    className="h-6 w-px flex-shrink-0"
                    style={{ backgroundColor: 'var(--border)' }}
                  />

                  {/* Definition - truncated */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p
                      className="font-body text-sm leading-snug truncate"
                      style={{ color: 'var(--text-primary)' }}
                      title={word.definition || ''}
                    >
                      {word.partOfSpeech && (
                        <span
                          className="italic mr-1.5"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {word.partOfSpeech}
                        </span>
                      )}
                      {word.definition || 'No definition available'}
                    </p>
                    {/* Verse reference - small */}
                    {verseRef && book && (
                      <p
                        className="font-body text-[10px] mt-0.5 truncate"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {book.name.english} {verseRef.chapter}:{verseRef.verse}
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Save button */}
                    <motion.button
                      onClick={handleSaveToggle}
                      className="touch-feedback rounded-full p-2 transition-all duration-150"
                      style={{
                        backgroundColor: isSaved
                          ? 'var(--accent)'
                          : 'var(--bg-secondary)',
                        color: isSaved ? 'white' : 'var(--text-tertiary)',
                      }}
                      aria-label={isSaved ? 'Remove from vocabulary' : 'Save to vocabulary'}
                      whileTap={{ scale: 0.9 }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill={isSaved ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        strokeWidth={2}
                        className="h-4 w-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                        />
                      </svg>
                    </motion.button>

                    {/* Close button */}
                    <motion.button
                      onClick={onClose}
                      className="touch-feedback rounded-full p-2 transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                      aria-label="Close definition"
                      whileTap={{ scale: 0.9 }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4"
                      >
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
