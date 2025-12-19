import { memo, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReadingStore } from '../../stores';
import { getOldTestamentBooks, getNewTestamentBooks } from '../../data/bible';
import { splitPinyinSyllables } from '../../utils/pinyin';
import { useConvertedChinese } from '../../hooks';
import type { Book } from '../../types/bible';

// Book abbreviation mappings for search
const BOOK_ABBREVIATIONS: Record<string, string> = {
  // Old Testament
  'gen': 'genesis', 'ge': 'genesis',
  'ex': 'exodus', 'exo': 'exodus', 'exod': 'exodus',
  'lev': 'leviticus', 'le': 'leviticus',
  'num': 'numbers', 'nu': 'numbers', 'nm': 'numbers',
  'deut': 'deuteronomy', 'de': 'deuteronomy', 'dt': 'deuteronomy',
  'josh': 'joshua', 'jos': 'joshua',
  'judg': 'judges', 'jdg': 'judges', 'jg': 'judges',
  'ru': 'ruth', 'rut': 'ruth',
  '1sam': '1samuel', '1sa': '1samuel', '1 sam': '1samuel', '1 sa': '1samuel',
  '2sam': '2samuel', '2sa': '2samuel', '2 sam': '2samuel', '2 sa': '2samuel',
  '1ki': '1kings', '1kgs': '1kings', '1 ki': '1kings', '1 kings': '1kings',
  '2ki': '2kings', '2kgs': '2kings', '2 ki': '2kings', '2 kings': '2kings',
  '1chr': '1chronicles', '1ch': '1chronicles', '1 chr': '1chronicles', '1 chron': '1chronicles',
  '2chr': '2chronicles', '2ch': '2chronicles', '2 chr': '2chronicles', '2 chron': '2chronicles',
  'ezr': 'ezra', 'ez': 'ezra',
  'neh': 'nehemiah', 'ne': 'nehemiah',
  'est': 'esther', 'esth': 'esther',
  'job': 'job', 'jb': 'job',
  'ps': 'psalms', 'psa': 'psalms', 'psalm': 'psalms',
  'prov': 'proverbs', 'pr': 'proverbs', 'prv': 'proverbs',
  'ecc': 'ecclesiastes', 'eccl': 'ecclesiastes', 'ec': 'ecclesiastes',
  'song': 'songofsolomon', 'sos': 'songofsolomon', 'ss': 'songofsolomon', 'sol': 'songofsolomon',
  'isa': 'isaiah', 'is': 'isaiah',
  'jer': 'jeremiah', 'je': 'jeremiah',
  'lam': 'lamentations', 'la': 'lamentations',
  'ezek': 'ezekiel', 'eze': 'ezekiel', 'ezk': 'ezekiel',
  'dan': 'daniel', 'da': 'daniel', 'dn': 'daniel',
  'hos': 'hosea', 'ho': 'hosea',
  'joe': 'joel', 'jl': 'joel',
  'amos': 'amos', 'am': 'amos',
  'ob': 'obadiah', 'oba': 'obadiah', 'obad': 'obadiah',
  'jon': 'jonah', 'jnh': 'jonah',
  'mic': 'micah', 'mi': 'micah',
  'nah': 'nahum', 'na': 'nahum',
  'hab': 'habakkuk', 'hb': 'habakkuk',
  'zeph': 'zephaniah', 'zep': 'zephaniah', 'zp': 'zephaniah',
  'hag': 'haggai', 'hg': 'haggai',
  'zech': 'zechariah', 'zec': 'zechariah', 'zc': 'zechariah',
  'mal': 'malachi', 'ml': 'malachi',
  // New Testament
  'mat': 'matthew', 'matt': 'matthew', 'mt': 'matthew',
  'mk': 'mark', 'mr': 'mark',
  'lk': 'luke', 'lu': 'luke',
  'jn': 'john', 'jhn': 'john',
  'acts': 'acts', 'ac': 'acts',
  'rom': 'romans', 'ro': 'romans', 'rm': 'romans',
  '1cor': '1corinthians', '1co': '1corinthians', '1 cor': '1corinthians', '1 co': '1corinthians',
  '2cor': '2corinthians', '2co': '2corinthians', '2 cor': '2corinthians', '2 co': '2corinthians',
  'gal': 'galatians', 'ga': 'galatians',
  'eph': 'ephesians', 'ep': 'ephesians',
  'php': 'philippians', 'phil': 'philippians', 'pp': 'philippians',
  'col': 'colossians', 'co': 'colossians',
  '1th': '1thessalonians', '1thes': '1thessalonians', '1 thes': '1thessalonians', '1 th': '1thessalonians',
  '2th': '2thessalonians', '2thes': '2thessalonians', '2 thes': '2thessalonians', '2 th': '2thessalonians',
  '1tim': '1timothy', '1ti': '1timothy', '1 tim': '1timothy', '1 ti': '1timothy',
  '2tim': '2timothy', '2ti': '2timothy', '2 tim': '2timothy', '2 ti': '2timothy',
  'tit': 'titus', 'ti': 'titus',
  'phm': 'philemon', 'phlm': 'philemon',
  'heb': 'hebrews', 'he': 'hebrews',
  'jam': 'james', 'jas': 'james', 'jm': 'james',
  '1pet': '1peter', '1pe': '1peter', '1pt': '1peter', '1 pet': '1peter', '1 pe': '1peter',
  '2pet': '2peter', '2pe': '2peter', '2pt': '2peter', '2 pet': '2peter', '2 pe': '2peter',
  '1jn': '1john', '1jo': '1john', '1 jn': '1john', '1 john': '1john',
  '2jn': '2john', '2jo': '2john', '2 jn': '2john', '2 john': '2john',
  '3jn': '3john', '3jo': '3john', '3 jn': '3john', '3 john': '3john',
  'jude': 'jude', 'jud': 'jude',
  'rev': 'revelation', 're': 'revelation', 'rv': 'revelation',
};

// Parse search query to extract book name, chapter, and verse
function parseSearchQuery(query: string): { bookQuery: string; chapter: number | null; verse: number | null } {
  const trimmed = query.trim().toLowerCase();

  // Match patterns like "john 3:16", "matt 28:14", "1 cor 2:5"
  const matchWithVerse = trimmed.match(/^(.+?)\s*(\d+)[:\s](\d+)$/);
  if (matchWithVerse) {
    return {
      bookQuery: matchWithVerse[1].trim(),
      chapter: parseInt(matchWithVerse[2], 10),
      verse: parseInt(matchWithVerse[3], 10),
    };
  }

  // Match patterns like "john 3", "1 cor 2", "mat 27", "acts20"
  const match = trimmed.match(/^(.+?)\s*(\d+)$/);
  if (match) {
    return {
      bookQuery: match[1].trim(),
      chapter: parseInt(match[2], 10),
      verse: null,
    };
  }

  return { bookQuery: trimmed, chapter: null, verse: null };
}

// Search books by query
function searchBooks(
  allBooks: Book[],
  query: string
): { book: Book; matchType: 'exact' | 'start' | 'contains' | 'abbrev' }[] {
  if (!query) return [];

  const normalizedQuery = query.toLowerCase().replace(/\s+/g, '');
  const results: { book: Book; matchType: 'exact' | 'start' | 'contains' | 'abbrev'; score: number }[] = [];

  // Check if query matches an abbreviation
  const abbrevMatch = BOOK_ABBREVIATIONS[query.toLowerCase()] ||
                      BOOK_ABBREVIATIONS[query.toLowerCase().replace(/\s+/g, '')];

  for (const book of allBooks) {
    const englishLower = book.name.english.toLowerCase();
    const englishNoSpace = englishLower.replace(/\s+/g, '');
    const idLower = book.id.toLowerCase();
    const pinyinLower = (book.name.pinyin || '').toLowerCase().replace(/\s+/g, '');
    const chineseName = book.name.chinese;

    // Check abbreviation match first (highest priority)
    if (abbrevMatch && idLower === abbrevMatch) {
      results.push({ book, matchType: 'abbrev', score: 100 });
      continue;
    }

    // Exact match on ID
    if (idLower === normalizedQuery) {
      results.push({ book, matchType: 'exact', score: 90 });
      continue;
    }

    // Exact match on English name
    if (englishNoSpace === normalizedQuery) {
      results.push({ book, matchType: 'exact', score: 85 });
      continue;
    }

    // Starts with query (English)
    if (englishLower.startsWith(query.toLowerCase()) || englishNoSpace.startsWith(normalizedQuery)) {
      results.push({ book, matchType: 'start', score: 70 });
      continue;
    }

    // Starts with query (ID)
    if (idLower.startsWith(normalizedQuery)) {
      results.push({ book, matchType: 'start', score: 65 });
      continue;
    }

    // Starts with query (Pinyin)
    if (pinyinLower.startsWith(normalizedQuery)) {
      results.push({ book, matchType: 'start', score: 60 });
      continue;
    }

    // Contains query (Chinese)
    if (chineseName.includes(query)) {
      results.push({ book, matchType: 'contains', score: 55 });
      continue;
    }

    // Contains query (English)
    if (englishLower.includes(query.toLowerCase())) {
      results.push({ book, matchType: 'contains', score: 50 });
      continue;
    }

    // Contains query (Pinyin)
    if (pinyinLower.includes(normalizedQuery)) {
      results.push({ book, matchType: 'contains', score: 45 });
      continue;
    }
  }

  // Sort by score (highest first) and return
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, 8) // Limit to 8 results
    .map(({ book, matchType }) => ({ book, matchType }));
}

// Compact Chinese text with tiny pinyin
const CompactChinese = memo(function CompactChinese({
  chinese,
  pinyin,
}: {
  chinese: string;
  pinyin: string;
}) {
  const convertedChinese = useConvertedChinese(chinese);
  const chars = [...convertedChinese];
  const syllables = splitPinyinSyllables(pinyin, chars.length);

  return (
    <span className="inline-flex">
      {chars.map((char, idx) => (
        <span key={idx} className="flex flex-col items-center">
          <span
            className="text-[7px] md:text-[9px] leading-none font-body"
            style={{ color: 'var(--text-tertiary)', opacity: 0.6 }}
          >
            {syllables[idx] || ''}
          </span>
          <span className="font-chinese-serif text-[14px] md:text-[18px] leading-tight">{char}</span>
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const expandedBookRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Memoize book arrays to prevent useEffect re-runs on every render
  const oldTestament = useMemo(() => getOldTestamentBooks(), []);
  const newTestament = useMemo(() => getNewTestamentBooks(), []);
  const allBooks = useMemo(() => [...oldTestament, ...newTestament], [oldTestament, newTestament]);
  const books = activeTestament === 'old' ? oldTestament : newTestament;

  // Parse search query and get results
  const { bookQuery, chapter: searchChapter, verse: searchVerse } = useMemo(
    () => parseSearchQuery(searchQuery),
    [searchQuery]
  );
  const searchResults = useMemo(
    () => searchBooks(allBooks, bookQuery),
    [allBooks, bookQuery]
  );
  const isSearching = searchQuery.trim().length > 0;

  // Auto-expand current book when panel opens, reset search
  useEffect(() => {
    if (isOpen && currentBookId) {
      const isOT = oldTestament.some(b => b.id === currentBookId);
      setActiveTestament(isOT ? 'old' : 'new');
      // Don't auto-expand - let user click to see chapters
      setExpandedBookId(null);
      // Reset search
      setSearchQuery('');
      setIsSearchFocused(false);
    }
  }, [isOpen, currentBookId, oldTestament]);

  // Handle search result click - navigate directly if chapter specified
  const handleSearchResultClick = useCallback((bookId: string, book: Book) => {
    if (searchChapter && searchChapter >= 1 && searchChapter <= book.chapterCount) {
      // Navigate directly to the specified chapter (and verse if provided)
      setCurrentPosition(bookId, searchChapter, searchVerse || undefined);
      onClose();
      setSearchQuery('');
    } else {
      // Just select the book at chapter 1 if no chapter or invalid chapter
      setCurrentPosition(bookId, 1);
      onClose();
      setSearchQuery('');
    }
  }, [searchChapter, searchVerse, setCurrentPosition, onClose]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  }, []);

  // Handle Enter key in search - navigate to first result
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchResults.length > 0) {
      e.preventDefault();
      const firstResult = searchResults[0].book;
      handleSearchResultClick(firstResult.id, firstResult);
    }
  }, [searchResults, handleSearchResultClick]);

  // Scroll expanded book into view with enough space to show chapters
  useEffect(() => {
    if (expandedBookRef.current && scrollContainerRef.current && expandedBookId) {
      // Wait for the chapter expansion animation to complete, then scroll
      setTimeout(() => {
        const bookElement = expandedBookRef.current;
        const containerElement = scrollContainerRef.current;

        if (!bookElement || !containerElement) return;

        // Get the book element's position relative to the container
        const bookRect = bookElement.getBoundingClientRect();
        const containerRect = containerElement.getBoundingClientRect();

        // Calculate positions relative to the scroll container
        const bookTop = bookRect.top - containerRect.top;
        const bookBottom = bookRect.bottom - containerRect.top;
        const containerHeight = containerRect.height;

        // Check if the expanded book (including chapters) extends below visible area
        // Use 85% threshold to ensure chapters are comfortably visible
        const needsScroll = bookBottom > containerHeight * 0.85;

        if (needsScroll) {
          // Scroll the book to the top of the container to reveal all chapters
          bookElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          });
        } else if (bookTop < 0) {
          // If the book is above the visible area, scroll it into view
          bookElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          });
        }
      }, 250); // Wait for the 200ms expansion animation to mostly complete
    }
  }, [expandedBookId]);

  const handleBookClick = useCallback((bookId: string) => {
    setExpandedBookId(prev => prev === bookId ? null : bookId);
  }, []);

  const handleChapterSelect = useCallback((bookId: string, chapter: number) => {
    setCurrentPosition(bookId, chapter);
    onClose();
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
            className="fixed inset-0 z-45"
            style={{ backgroundColor: 'var(--overlay)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleBackdropClick}
          />

          {/* Panel - drops down from top */}
          <motion.div
            className="fixed top-0 left-0 right-0 z-46 overflow-hidden safe-area-top"
            style={{
              height: '75vh',
              maxHeight: '700px',
              backgroundColor: 'var(--bg-primary)',
              borderBottomLeftRadius: '16px',
              borderBottomRightRadius: '16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }}
            initial={{ y: '-100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0.8 }}
            transition={{
              type: 'spring',
              damping: 28,
              stiffness: 300,
              opacity: { duration: 0.15 }
            }}
          >
            {/* Header */}
            <motion.div
              className="px-4 pt-3 pb-2"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-2">
                <h2
                  className="font-display text-[10px] tracking-[0.2em] uppercase"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Select Passage
                </h2>
                <motion.button
                  className="touch-feedback rounded-full p-1"
                  style={{ color: 'var(--text-tertiary)' }}
                  onClick={onClose}
                  aria-label="Close"
                  whileTap={{ scale: 0.9 }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="h-4 w-4"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>

              {/* Search Bar */}
              <motion.div
                className="relative mb-2"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.2 }}
              >
                <div
                  className="relative flex items-center rounded-lg transition-all duration-200"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    boxShadow: isSearchFocused ? '0 0 0 2px var(--accent-subtle)' : 'none',
                  }}
                >
                  {/* Search icon */}
                  <div className="pl-3 pr-1" style={{ color: 'var(--text-tertiary)' }}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    placeholder="Search books..."
                    className="flex-1 bg-transparent py-2 pr-2 text-sm font-body outline-none"
                    style={{
                      color: 'var(--text-primary)',
                    }}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                  />
                  {/* Clear button */}
                  <AnimatePresence>
                    {searchQuery && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                        className="touch-feedback p-2 rounded-md mr-1"
                        style={{ color: 'var(--text-tertiary)' }}
                        onClick={clearSearch}
                        aria-label="Clear search"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-4 h-4"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Testament Tabs - Hidden when searching */}
              <AnimatePresence>
                {!isSearching && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="flex rounded-md p-0.5"
                      style={{ backgroundColor: 'var(--bg-secondary)' }}
                    >
                      {(['old', 'new'] as const).map((testament) => (
                        <motion.button
                          key={testament}
                          className="flex-1 rounded py-1.5 px-2 transition-colors relative"
                          style={{
                            backgroundColor: activeTestament === testament ? 'var(--bg-primary)' : 'transparent',
                            color: activeTestament === testament ? 'var(--text-primary)' : 'var(--text-tertiary)',
                          }}
                          onClick={() => {
                            setActiveTestament(testament);
                            setExpandedBookId(null);
                          }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {activeTestament === testament && (
                            <motion.div
                              className="absolute inset-0 rounded"
                              style={{
                                backgroundColor: 'var(--bg-primary)',
                                boxShadow: '0 1px 2px var(--shadow)'
                              }}
                              layoutId="testamentTab"
                              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                            />
                          )}
                          <span className="relative inline-flex items-center gap-1.5">
                            <span className="inline-flex">
                              {testament === 'old' ? (
                                <>
                                  <span className="flex flex-col items-center">
                                    <span className="text-[7px] leading-none font-body" style={{ opacity: 0.6 }}>Jiù</span>
                                    <span className="font-chinese-serif text-[14px] leading-tight">舊</span>
                                  </span>
                                  <span className="flex flex-col items-center">
                                    <span className="text-[7px] leading-none font-body" style={{ opacity: 0.6 }}>Yuē</span>
                                    <span className="font-chinese-serif text-[14px] leading-tight">約</span>
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="flex flex-col items-center">
                                    <span className="text-[7px] leading-none font-body" style={{ opacity: 0.6 }}>Xīn</span>
                                    <span className="font-chinese-serif text-[14px] leading-tight">新</span>
                                  </span>
                                  <span className="flex flex-col items-center">
                                    <span className="text-[7px] leading-none font-body" style={{ opacity: 0.6 }}>Yuē</span>
                                    <span className="font-chinese-serif text-[14px] leading-tight">約</span>
                                  </span>
                                </>
                              )}
                            </span>
                            <span className="font-display text-xs tracking-wide">
                              {testament === 'old' ? 'OT' : 'NT'}
                            </span>
                          </span>
                        </motion.button>
                      ))}
                    </div>

                    {/* Swipe indicator dots */}
                    <div className="flex justify-center gap-1.5 mt-2">
                      {(['old', 'new'] as const).map((testament) => (
                        <motion.div
                          key={testament}
                          className="w-1.5 h-1.5 rounded-full transition-all"
                          style={{
                            backgroundColor: activeTestament === testament
                              ? 'var(--accent)'
                              : 'var(--border)',
                          }}
                          animate={{
                            scale: activeTestament === testament ? 1 : 0.8,
                            opacity: activeTestament === testament ? 1 : 0.5,
                          }}
                          transition={{ duration: 0.2 }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Books Grid / Search Results */}
            <motion.div
              ref={scrollContainerRef}
              className="overflow-y-auto px-3 py-2"
              style={{
                height: isSearching ? 'calc(100% - 110px)' : 'calc(100% - 158px)',
                touchAction: isSearching ? 'auto' : 'pan-y pinch-zoom',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.2 }}
              // Swipe gesture for testament switching (only when not searching)
              drag={!isSearching ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragEnd={(_e, info) => {
                if (isSearching) return;
                const swipeThreshold = 50;
                const velocity = info.velocity.x;
                const offset = info.offset.x;

                // Swipe left (negative) = go to NT, swipe right (positive) = go to OT
                if (offset < -swipeThreshold || velocity < -300) {
                  if (activeTestament === 'old') {
                    setActiveTestament('new');
                    setExpandedBookId(null);
                  }
                } else if (offset > swipeThreshold || velocity > 300) {
                  if (activeTestament === 'new') {
                    setActiveTestament('old');
                    setExpandedBookId(null);
                  }
                }
              }}
            >
              <AnimatePresence mode="wait">
                {/* Search Results */}
                {isSearching ? (
                  <motion.div
                    key="search-results"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-1"
                  >
                    {searchResults.length > 0 ? (
                      <>
                        {/* Results header */}
                        <div
                          className="px-1 pb-1 flex items-center justify-between"
                        >
                          <span
                            className="font-display text-[9px] tracking-[0.15em] uppercase"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {searchResults.length} Result{searchResults.length !== 1 ? 's' : ''}
                          </span>
                          {searchChapter && (
                            <span
                              className="font-display text-[11px] px-2 py-0.5 rounded-md"
                              style={{
                                backgroundColor: 'var(--accent-subtle)',
                                color: 'var(--accent)',
                                fontWeight: 500,
                                letterSpacing: '0.03em',
                              }}
                            >
                              {searchVerse ? `${searchChapter}:${searchVerse}` : `Ch. ${searchChapter}`}
                            </span>
                          )}
                        </div>

                        {/* Search result items */}
                        {searchResults.map(({ book }, index) => {
                          const validChapter = searchChapter && searchChapter >= 1 && searchChapter <= book.chapterCount;
                          const isOT = oldTestament.some(b => b.id === book.id);

                          return (
                            <motion.button
                              key={book.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.03, duration: 0.2 }}
                              className="touch-feedback w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center justify-between gap-2"
                              style={{
                                backgroundColor: 'var(--bg-secondary)',
                              }}
                              onClick={() => handleSearchResultClick(book.id, book)}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {/* Book indicator */}
                                <div
                                  className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center font-display text-[10px]"
                                  style={{
                                    backgroundColor: isOT ? 'var(--bg-tertiary)' : 'var(--accent-subtle)',
                                    color: isOT ? 'var(--text-secondary)' : 'var(--accent)',
                                  }}
                                >
                                  {isOT ? 'OT' : 'NT'}
                                </div>

                                {/* Book info */}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <CompactChinese
                                      chinese={book.name.chinese}
                                      pinyin={book.name.pinyin || ''}
                                    />
                                    {validChapter && (
                                      <span
                                        className="font-display text-base font-medium"
                                        style={{ color: 'var(--accent)' }}
                                      >
                                        {searchChapter}{searchVerse ? `:${searchVerse}` : ''}
                                      </span>
                                    )}
                                  </div>
                                  <p
                                    className="font-body text-[10px] truncate"
                                    style={{ color: 'var(--text-tertiary)' }}
                                  >
                                    {book.name.english}
                                    {validChapter ? ` ${searchChapter}${searchVerse ? `:${searchVerse}` : ''}` : ''}
                                    <span style={{ opacity: 0.6 }}> · {book.chapterCount} chapters</span>
                                  </p>
                                </div>
                              </div>

                              {/* Arrow */}
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="w-4 h-4 flex-shrink-0"
                                style={{ color: 'var(--text-tertiary)' }}
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </motion.button>
                          );
                        })}
                      </>
                    ) : (
                      /* No results */
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-8"
                      >
                        <div
                          className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: 'var(--bg-secondary)' }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.5}
                            className="w-6 h-6"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                            />
                          </svg>
                        </div>
                        <p
                          className="font-body text-sm"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          No books found
                        </p>
                        <p
                          className="font-body text-xs mt-1"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          Try "john 3", "mat 5", or "acts 20"
                        </p>
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  /* Normal Books Grid */
                  <motion.div
                    key={activeTestament}
                    initial={{ opacity: 0, x: activeTestament === 'old' ? -15 : 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: activeTestament === 'old' ? 15 : -15 }}
                    transition={{ duration: 0.15 }}
                    className="grid grid-cols-2 sm:grid-cols-3 gap-1.5"
                  >
                  {books.map((book, index) => {
                    const isExpanded = book.id === expandedBookId;
                    const isCurrent = book.id === currentBookId;

                    return (
                      <motion.div
                        key={book.id}
                        ref={isExpanded ? expandedBookRef : null}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.01, duration: 0.15 }}
                      >
                        {/* Book Button */}
                        <motion.button
                          className="touch-feedback w-full text-left px-3 md:px-3.5 py-2.5 md:py-3 rounded-lg transition-all relative"
                          style={{
                            backgroundColor: isExpanded
                              ? 'var(--accent-subtle)'
                              : isCurrent
                              ? 'var(--bg-tertiary)'
                              : 'var(--bg-secondary)',
                          }}
                          onClick={() => handleBookClick(book.id)}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {isCurrent && (
                                <div
                                  className="h-1 w-1 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: 'var(--accent)' }}
                                />
                              )}
                              <CompactChinese
                                chinese={book.name.chinese}
                                pinyin={book.name.pinyin || ''}
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span
                                className="font-display text-[11px] md:text-[13px]"
                                style={{ color: 'var(--text-tertiary)', letterSpacing: '0.02em' }}
                              >
                                {book.chapterCount}
                              </span>
                              <motion.svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="w-3 h-3 md:w-4 md:h-4"
                                style={{ color: 'var(--text-tertiary)' }}
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                                  clipRule="evenodd"
                                />
                              </motion.svg>
                            </div>
                          </div>
                          <p
                            className="font-body text-[10px] md:text-[12px] truncate mt-0.5"
                            style={{
                              color: 'var(--text-tertiary)',
                              marginLeft: isCurrent ? '10px' : '0',
                            }}
                          >
                            {book.name.english}
                          </p>
                        </motion.button>

                        {/* Expanded Chapters - Inline below book */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: 'easeInOut' }}
                              className="overflow-hidden"
                            >
                              <div
                                className="pt-2 pb-1 px-1"
                              >
                                {/* Chapter buttons - small inline flow */}
                                <div className="flex flex-wrap gap-1.5 md:gap-2">
                                  {Array.from({ length: book.chapterCount }, (_, i) => i + 1).map(
                                    (chapter) => {
                                      const isCurrentChapter = currentBookId === book.id && currentChapter === chapter;
                                      return (
                                        <motion.button
                                          key={chapter}
                                          className="touch-feedback rounded-md font-display text-[13px] md:text-[15px] transition-all min-w-[32px] md:min-w-[40px] h-[30px] md:h-[38px] px-1.5 md:px-2 flex items-center justify-center"
                                          style={{
                                            backgroundColor: isCurrentChapter
                                              ? 'var(--accent)'
                                              : 'var(--bg-primary)',
                                            color: isCurrentChapter ? 'white' : 'var(--text-secondary)',
                                            border: isCurrentChapter
                                              ? 'none'
                                              : '1px solid var(--border-subtle)',
                                            boxShadow: isCurrentChapter
                                              ? '0 2px 6px rgba(139, 90, 43, 0.25)'
                                              : 'none',
                                            fontWeight: isCurrentChapter ? 600 : 400,
                                            letterSpacing: '0.02em',
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleChapterSelect(book.id, chapter);
                                          }}
                                          whileTap={{ scale: 0.92 }}
                                        >
                                          {chapter}
                                        </motion.button>
                                      );
                                    }
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Bottom handle */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
              <div
                className="w-8 h-1 rounded-full"
                style={{ backgroundColor: 'var(--border)' }}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
