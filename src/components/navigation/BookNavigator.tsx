import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReadingStore } from '../../stores';
import { getOldTestamentBooks, getNewTestamentBooks } from '../../data/bible';
import type { Book } from '../../types';
import { OfflineDownload } from './OfflineDownload';

interface BookNavigatorProps {
  isOpen: boolean;
  onClose: () => void;
}

type Testament = 'old' | 'new';

export const BookNavigator = memo(function BookNavigator({
  isOpen,
  onClose,
}: BookNavigatorProps) {
  const { currentBookId, currentChapter, setCurrentPosition } = useReadingStore();
  const [activeTestament, setActiveTestament] = useState<Testament>('new');
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);

  const oldTestament = getOldTestamentBooks();
  const newTestament = getNewTestamentBooks();
  const books = activeTestament === 'old' ? oldTestament : newTestament;

  const handleBookClick = useCallback((bookId: string) => {
    setExpandedBookId(prev => prev === bookId ? null : bookId);
  }, []);

  const handleChapterSelect = useCallback((bookId: string, chapter: number) => {
    setCurrentPosition(bookId, chapter);
    onClose();
    // Reset for next open
    setTimeout(() => setExpandedBookId(null), 300);
  }, [setCurrentPosition, onClose]);

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
            className="fixed inset-0 z-45 glass"
            style={{ backgroundColor: 'var(--overlay)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleBackdropClick}
          />

          {/* Panel */}
          <motion.div
            className="fixed top-0 left-0 bottom-0 z-46 w-80 max-w-[85vw] overflow-hidden shadow-elevated safe-area-top safe-area-bottom"
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRight: '1px solid var(--border-subtle)',
            }}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
          >
            {/* Header with Testament Tabs */}
            <div
              className="px-5 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="font-display text-xs tracking-widest uppercase flex items-center gap-2"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <span className="inline-block w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--text-tertiary)', opacity: 0.5 }} />
                  Select Book
                </h2>
                <motion.button
                  className="touch-feedback rounded-lg p-1.5"
                  style={{ color: 'var(--text-tertiary)' }}
                  onClick={onClose}
                  aria-label="Close"
                  whileTap={{ scale: 0.92 }}
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
              </div>

              {/* Testament Tabs - Elegant pill style */}
              <div
                className="flex rounded-xl p-1"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <motion.button
                  className="flex-1 rounded-lg py-2.5 px-3 transition-colors relative"
                  style={{
                    backgroundColor: activeTestament === 'old' ? 'var(--bg-primary)' : 'transparent',
                    color: activeTestament === 'old' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  }}
                  onClick={() => setActiveTestament('old')}
                  whileTap={{ scale: 0.98 }}
                >
                  {activeTestament === 'old' && (
                    <motion.div
                      className="absolute inset-0 rounded-lg shadow-sm"
                      style={{ backgroundColor: 'var(--bg-primary)', boxShadow: '0 1px 3px var(--shadow)' }}
                      layoutId="tabIndicator"
                      transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                    />
                  )}
                  <span className="relative flex items-center justify-center gap-2">
                    <span className="font-chinese-serif text-base">舊約</span>
                    <span className="font-body text-[10px] opacity-50">39</span>
                  </span>
                </motion.button>
                <motion.button
                  className="flex-1 rounded-lg py-2.5 px-3 transition-colors relative"
                  style={{
                    backgroundColor: activeTestament === 'new' ? 'var(--bg-primary)' : 'transparent',
                    color: activeTestament === 'new' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  }}
                  onClick={() => setActiveTestament('new')}
                  whileTap={{ scale: 0.98 }}
                >
                  {activeTestament === 'new' && (
                    <motion.div
                      className="absolute inset-0 rounded-lg shadow-sm"
                      style={{ backgroundColor: 'var(--bg-primary)', boxShadow: '0 1px 3px var(--shadow)' }}
                      layoutId="tabIndicator"
                      transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                    />
                  )}
                  <span className="relative flex items-center justify-center gap-2">
                    <span className="font-chinese-serif text-base">新約</span>
                    <span className="font-body text-[10px] opacity-50">27</span>
                  </span>
                </motion.button>
              </div>
            </div>

            {/* Book List - Compact 2-column grid */}
            <div className="h-full overflow-y-auto pb-20 px-2 py-2">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={activeTestament}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="grid grid-cols-2 gap-1"
                >
                  {books.map((book, index) => (
                    <CompactBookItem
                      key={book.id}
                      book={book}
                      isActive={book.id === currentBookId}
                      isExpanded={book.id === expandedBookId}
                      currentChapter={book.id === currentBookId ? currentChapter : null}
                      onClick={() => handleBookClick(book.id)}
                      onChapterSelect={(chapter) => handleChapterSelect(book.id, chapter)}
                      delay={index * 0.01}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

interface CompactBookItemProps {
  book: Omit<Book, 'chapters'>;
  isActive: boolean;
  isExpanded: boolean;
  currentChapter: number | null;
  onClick: () => void;
  onChapterSelect: (chapter: number) => void;
  delay?: number;
}

const CompactBookItem = memo(function CompactBookItem({
  book,
  isActive,
  isExpanded,
  currentChapter,
  onClick,
  onChapterSelect,
  delay = 0,
}: CompactBookItemProps) {
  return (
    <motion.div
      className={`col-span-${isExpanded ? '2' : '1'}`}
      style={{ gridColumn: isExpanded ? 'span 2' : 'span 1' }}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, layout: { duration: 0.2 } }}
    >
      <motion.button
        className="touch-feedback w-full rounded-lg px-2.5 py-2 text-left transition-colors"
        style={{
          backgroundColor: isActive
            ? 'var(--accent-subtle)'
            : isExpanded
              ? 'var(--bg-secondary)'
              : 'transparent',
          color: isActive ? 'var(--accent)' : 'var(--text-primary)',
        }}
        onClick={onClick}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {isActive && (
              <motion.div
                className="h-1 w-1 rounded-full flex-shrink-0"
                style={{ backgroundColor: 'var(--accent)' }}
                layoutId="activeBookDot"
              />
            )}
            <span
              className="font-chinese-serif text-sm truncate"
              style={{ letterSpacing: '0.02em' }}
            >
              {book.name.chinese}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span
              className="font-body text-[10px] tabular-nums"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {book.chapterCount}
            </span>
            <motion.svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3 w-3"
              style={{ color: 'var(--text-tertiary)' }}
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </motion.svg>
          </div>
        </div>
        {/* English name - subtle */}
        <p
          className="font-body text-[9px] truncate mt-0.5"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {book.name.english}
        </p>
      </motion.button>

      {/* Expandable Chapter Grid */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Offline Download Button */}
            <div className="px-2 pt-2 pb-1">
              <OfflineDownload bookId={book.id} bookName={book.name.english} />
            </div>

            <div
              className="grid gap-1 px-1 py-2"
              style={{
                gridTemplateColumns: `repeat(${Math.min(book.chapterCount, 8)}, 1fr)`,
              }}
            >
              {Array.from({ length: book.chapterCount }, (_, i) => i + 1).map(
                (chapter) => {
                  const isCurrent = currentChapter === chapter;
                  return (
                    <motion.button
                      key={chapter}
                      className="touch-feedback aspect-square rounded-md font-display text-xs transition-colors"
                      style={{
                        backgroundColor: isCurrent
                          ? 'var(--accent)'
                          : 'var(--bg-primary)',
                        color: isCurrent ? 'white' : 'var(--text-secondary)',
                        border: isCurrent ? 'none' : '1px solid var(--border-subtle)',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onChapterSelect(chapter);
                      }}
                      whileTap={{ scale: 0.9 }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: chapter * 0.005 }}
                    >
                      {chapter}
                    </motion.button>
                  );
                }
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
