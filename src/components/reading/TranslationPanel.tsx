// TranslationPanel - Shows English verse translation or word definition
// Appears below header as a refined floating panel

import { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SegmentedWord, VerseReference, CrossReference } from '../../types';
import { getBookById } from '../../data/bible';
import { getEnglishVerse, ENGLISH_TRANSLATION } from '../../data/english';
import { WordDetailPanel } from './WordDetailPanel';

export type PanelMode = 'verse' | 'word' | null;

interface TranslationPanelProps {
  mode: PanelMode;
  // For verse mode
  verseRef: VerseReference | null;
  crossReferences?: CrossReference[];
  // For word mode
  word: SegmentedWord | null;
  wordVerseRef: VerseReference | null;
  // Callbacks
  onClose: () => void;
  onNavigateToCrossRef?: (bookId: string, chapter: number, verse: number) => void;
  // Scroll-based fade control (optional)
  scrollOpacity?: number;
}

export const TranslationPanel = memo(function TranslationPanel({
  mode,
  verseRef,
  crossReferences,
  word,
  wordVerseRef,
  onClose,
  onNavigateToCrossRef,
  scrollOpacity = 1,
}: TranslationPanelProps) {
  const [englishText, setEnglishText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get English translation when verse mode is active (instant - bundled data)
  useEffect(() => {
    if (mode !== 'verse' || !verseRef) {
      setEnglishText(null);
      setError(null);
      return;
    }

    const text = getEnglishVerse(verseRef.bookId, verseRef.chapter, verseRef.verse);
    if (text) {
      setEnglishText(text);
      setError(null);
    } else {
      setEnglishText(null);
      setError('Translation not available');
    }
    setIsLoading(false);
  }, [mode, verseRef]);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (mode) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [mode, onClose]);

  const book = verseRef ? getBookById(verseRef.bookId) : null;

  return (
    <AnimatePresence mode="wait">
      {mode && (
        <>
          {/* Panel - no backdrop, scroll dismisses naturally */}
          <motion.div
            className="fixed left-0 right-0 z-31"
            style={{ top: '56px' }}
            initial={{ y: -20, opacity: 0 }}
            animate={{
              y: 0,
              opacity: scrollOpacity,
            }}
            exit={{ y: -20, opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 28,
              stiffness: 400,
              opacity: { duration: 0.2, ease: 'easeOut' }
            }}
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div
              className="mx-auto max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl px-3"
            >
              <div
                className="rounded-b-2xl shadow-panel overflow-hidden"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  borderBottom: '1px solid var(--border)',
                  borderLeft: '1px solid var(--border)',
                  borderRight: '1px solid var(--border)',
                }}
              >
                {/* Gold accent bar on left */}
                <div className="flex">
                  <div
                    className="w-1.5 flex-shrink-0"
                    style={{
                      background: 'linear-gradient(180deg, var(--accent), var(--accent-light))',
                    }}
                  />

                  <div className="flex-1 min-w-0">
                    <AnimatePresence mode="wait">
                      {mode === 'verse' && (
                        <motion.div
                          key="verse"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="px-5 py-4"
                        >
                          {/* Verse reference */}
                          {verseRef && book && (
                            <p
                              className="font-display text-[10px] tracking-widest uppercase mb-2 flex items-center gap-2"
                              style={{ color: 'var(--accent)' }}
                            >
                              <span className="inline-block w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
                              {book.name.english} {verseRef.chapter}:{verseRef.verse}
                            </p>
                          )}

                          {/* English translation */}
                          {isLoading ? (
                            <div className="flex items-center gap-2">
                              <motion.div
                                className="h-4 w-4 rounded-full border-2"
                                style={{
                                  borderColor: 'var(--border)',
                                  borderTopColor: 'var(--accent)',
                                }}
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              />
                              <span
                                className="font-body text-sm italic"
                                style={{ color: 'var(--text-tertiary)' }}
                              >
                                Loading...
                              </span>
                            </div>
                          ) : error ? (
                            <p
                              className="font-body text-sm italic"
                              style={{ color: 'var(--text-tertiary)' }}
                            >
                              {error}
                            </p>
                          ) : (
                            <p
                              className="font-body leading-relaxed"
                              style={{
                                color: 'var(--text-primary)',
                                lineHeight: '1.75',
                                fontSize: 'var(--english-base, 1rem)'
                              }}
                            >
                              {englishText}
                            </p>
                          )}

                          {/* Footer with attribution and cross-references */}
                          <div className="mt-3 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                            {/* Cross-references */}
                            {crossReferences && crossReferences.length > 0 && onNavigateToCrossRef && (
                              <div className="mb-2">
                                <p
                                  className="font-body text-[9px] uppercase tracking-widest mb-1.5"
                                  style={{ color: 'var(--text-tertiary)', opacity: 0.6 }}
                                >
                                  Cross-references
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {crossReferences.map((ref, index) => {
                                    const refBook = getBookById(ref.bookId);
                                    return (
                                      <motion.button
                                        key={index}
                                        onClick={() => onNavigateToCrossRef(ref.bookId, ref.chapter, ref.verseStart)}
                                        className="touch-feedback inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-body"
                                        style={{
                                          backgroundColor: 'var(--bg-secondary)',
                                          color: 'var(--accent)',
                                          border: '1px solid var(--border-subtle)',
                                        }}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 16 16"
                                          fill="currentColor"
                                          className="w-3 h-3 opacity-60"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M8.914 6.025a.75.75 0 0 1 1.06 0 3.5 3.5 0 0 1 0 4.95l-2 2a3.5 3.5 0 0 1-5.396-4.402.75.75 0 0 1 1.251.827 2 2 0 0 0 3.085 2.514l2-2a2 2 0 0 0 0-2.828.75.75 0 0 1 0-1.06Z"
                                            clipRule="evenodd"
                                          />
                                          <path
                                            fillRule="evenodd"
                                            d="M7.086 9.975a.75.75 0 0 1-1.06 0 3.5 3.5 0 0 1 0-4.95l2-2a3.5 3.5 0 0 1 5.396 4.402.75.75 0 0 1-1.251-.827 2 2 0 0 0-3.085-2.514l-2 2a2 2 0 0 0 0 2.828.75.75 0 0 1 0 1.06Z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                        <span>
                                          {refBook?.name.english || ref.bookAbbrev} {ref.chapter}:{ref.verseStart}
                                          {ref.verseEnd && ref.verseEnd !== ref.verseStart ? `–${ref.verseEnd}` : ''}
                                        </span>
                                      </motion.button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* BSB attribution */}
                            <p
                              className="font-body text-[9px] uppercase tracking-widest"
                              style={{ color: 'var(--text-tertiary)', opacity: 0.5 }}
                            >
                              {ENGLISH_TRANSLATION.abbreviation}
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {mode === 'word' && word && (
                        <WordDetailPanel
                          key="word"
                          word={word}
                          verseRef={wordVerseRef}
                          onClose={onClose}
                        />
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Close button */}
                  <motion.button
                    onClick={onClose}
                    className="touch-feedback p-3 flex-shrink-0 self-start"
                    style={{ color: 'var(--text-tertiary)' }}
                    whileTap={{ scale: 0.9 }}
                    aria-label="Close"
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
