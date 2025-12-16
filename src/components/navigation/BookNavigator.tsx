import { memo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { useReadingStore } from '../../stores';
import { getOldTestamentBooks, getNewTestamentBooks } from '../../data/bible';
import type { Book } from '../../types';
import { OfflineDownload } from './OfflineDownload';
import { splitPinyinSyllables } from '../../utils/pinyin';
import { useConvertedChinese } from '../../hooks';

// Helper component for displaying Chinese text with pinyin above each character
// Automatically converts based on character set setting (Traditional/Simplified)
const ChineseWithPinyin = memo(function ChineseWithPinyin({
  chinese,
  pinyin,
  className = '',
  pinyinClassName = '',
}: {
  chinese: string;
  pinyin: string;
  className?: string;
  pinyinClassName?: string;
}) {
  // Convert Chinese text based on user's character set preference
  const convertedChinese = useConvertedChinese(chinese);
  const chars = [...convertedChinese];
  const syllables = splitPinyinSyllables(pinyin, chars.length);

  return (
    <span className="inline-flex" style={{
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale'
    }}>
      {chars.map((char, idx) => (
        <span key={idx} className="flex flex-col items-center">
          <span
            className={`text-[9px] md:text-[8px] leading-tight ${pinyinClassName}`}
            style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}
          >
            {syllables[idx] || ''}
          </span>
          <span className={className}>{char}</span>
        </span>
      ))}
    </span>
  );
});

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

  // Track if we're in a horizontal swipe to prevent scroll interference
  const isSwipingRef = useRef(false);
  const swipeThreshold = 50; // Minimum horizontal distance to trigger

  const handlePanStart = useCallback(() => {
    isSwipingRef.current = false;
  }, []);

  const handlePan = useCallback((_: unknown, info: PanInfo) => {
    // If horizontal movement is significantly more than vertical, we're swiping
    if (Math.abs(info.offset.x) > Math.abs(info.offset.y) * 1.5 && Math.abs(info.offset.x) > 20) {
      isSwipingRef.current = true;
    }
  }, []);

  const handlePanEnd = useCallback((_: unknown, info: PanInfo) => {
    // Only trigger if horizontal movement exceeds threshold and is more than vertical
    if (Math.abs(info.offset.x) > swipeThreshold && Math.abs(info.offset.x) > Math.abs(info.offset.y)) {
      if (info.offset.x < 0 && activeTestament === 'old') {
        // Swiped left while on Old Testament → go to New Testament
        setActiveTestament('new');
      } else if (info.offset.x > 0 && activeTestament === 'new') {
        // Swiped right while on New Testament → go to Old Testament
        setActiveTestament('old');
      }
    }
    isSwipingRef.current = false;
  }, [activeTestament]);

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

          {/* Panel - wider on desktop */}
          <motion.div
            className="fixed top-0 left-0 bottom-0 z-46 w-80 max-w-[85vw] md:w-[420px] lg:w-[480px] md:max-w-[60vw] overflow-hidden shadow-elevated safe-area-top safe-area-bottom"
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRight: '1px solid var(--border-subtle)',
            }}
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 32,
              stiffness: 380,
              opacity: { duration: 0.2 }
            }}
          >
            {/* Header with Testament Tabs */}
            <motion.div
              className="px-5 py-4 md:px-6 md:py-5"
              style={{ borderBottom: '1px solid var(--border)' }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.3, ease: 'easeOut' }}
            >
              <div className="flex items-center justify-between mb-4 md:mb-5">
                <h2
                  className="font-display text-sm md:text-sm tracking-widest uppercase flex items-center gap-2"
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
                className="flex rounded-xl p-1 md:p-1.5"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <motion.button
                  className="flex-1 rounded-lg py-2.5 px-3 md:py-3 md:px-4 transition-colors relative"
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
                      transition={{ type: 'spring', damping: 30, stiffness: 500 }}
                    />
                  )}
                  <span className="relative flex items-center justify-center gap-2">
                    <ChineseWithPinyin
                      chinese="舊約"
                      pinyin="jiù yuē"
                      className="font-chinese-serif text-lg md:text-lg"
                      pinyinClassName="text-[10px] md:text-[10px]"
                    />
                    <span className="font-body text-xs md:text-xs opacity-50">(OT)</span>
                  </span>
                </motion.button>
                <motion.button
                  className="flex-1 rounded-lg py-2.5 px-3 md:py-3 md:px-4 transition-colors relative"
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
                      transition={{ type: 'spring', damping: 30, stiffness: 500 }}
                    />
                  )}
                  <span className="relative flex items-center justify-center gap-2">
                    <ChineseWithPinyin
                      chinese="新約"
                      pinyin="xīn yuē"
                      className="font-chinese-serif text-lg md:text-lg"
                      pinyinClassName="text-[10px] md:text-[10px]"
                    />
                    <span className="font-body text-xs md:text-xs opacity-50">(NT)</span>
                  </span>
                </motion.button>
              </div>
            </motion.div>

            {/* Book List - Compact 2-column grid with swipe support */}
            <motion.div
              className="h-full overflow-y-auto pb-48 px-2 py-2 md:px-3 md:py-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              onPanStart={handlePanStart}
              onPan={handlePan}
              onPanEnd={handlePanEnd}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTestament}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="grid grid-cols-2 gap-1 md:gap-1.5"
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
                      index={index}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            </motion.div>
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
  index: number;
}

const CompactBookItem = memo(function CompactBookItem({
  book,
  isActive,
  isExpanded,
  currentChapter,
  onClick,
  onChapterSelect,
  index,
}: CompactBookItemProps) {
  return (
    <motion.div
      className={`col-span-${isExpanded ? '2' : '1'}`}
      style={{ gridColumn: isExpanded ? 'span 2' : 'span 1' }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        opacity: { delay: index * 0.02, duration: 0.25 },
        y: { delay: index * 0.02, duration: 0.3, ease: 'easeOut' }
      }}
    >
      <motion.button
        className="touch-feedback w-full rounded-lg px-2.5 py-2 md:px-3 md:py-2.5 text-left transition-colors"
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
          <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
            {isActive && (
              <motion.div
                className="h-1 w-1 md:h-1.5 md:w-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: 'var(--accent)' }}
                layoutId="activeBookDot"
              />
            )}
            <ChineseWithPinyin
              chinese={book.name.chinese}
              pinyin={book.name.pinyin || ''}
              className="font-chinese-serif text-base md:text-base"
              pinyinClassName="text-[8px] md:text-[8px]"
            />
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span
              className="font-body text-xs md:text-xs tabular-nums"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {book.chapterCount}
            </span>
            <motion.svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3 w-3 md:h-4 md:w-4"
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
          className="font-body text-[11px] md:text-[11px] truncate mt-0.5"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {book.name.english}
        </p>
      </motion.button>

      {/* Expandable Chapter Grid */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0.8 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0.8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{ transformOrigin: 'top' }}
          >
            {/* Offline Download Button */}
            <div className="px-2 pt-2 pb-1 md:px-3 md:pt-3">
              <OfflineDownload bookId={book.id} bookName={book.name.english} />
            </div>

            <div
              className="grid gap-1 md:gap-1.5 px-1 py-2 md:px-2 md:py-3"
              style={{
                gridTemplateColumns: `repeat(${Math.min(book.chapterCount, 8)}, 1fr)`,
              }}
            >
              {Array.from({ length: book.chapterCount }, (_, i) => i + 1).map(
                (chapter) => {
                  const isCurrent = currentChapter === chapter;
                  return (
                    <button
                      key={chapter}
                      className="touch-feedback aspect-square rounded-md font-display text-sm md:text-sm transition-colors active:scale-90"
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
                    >
                      {chapter}
                    </button>
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
