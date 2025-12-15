import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { Verse, SegmentedWord, VerseReference } from '../../types';
import { useBookmarkStore } from '../../stores';
import { ChineseWord } from './ChineseWord';

interface VerseDisplayProps {
  verse: Verse;
  bookId: string;
  chapter: number;
  onVerseTap: (verseRef: VerseReference) => void; // Called when verse is tapped (for translation)
  onWordLongPress: (word: SegmentedWord, verseRef: VerseReference) => void; // Called on word long-press
  isActive?: boolean;
  highlightedWordIndex?: number | null;
  showHsk?: boolean;
}

export const VerseDisplay = memo(function VerseDisplay({
  verse,
  bookId,
  chapter,
  onVerseTap,
  onWordLongPress,
  isActive = false,
  highlightedWordIndex = null,
  showHsk = false,
}: VerseDisplayProps) {
  const verseRef: VerseReference = {
    bookId,
    chapter,
    verse: verse.number,
  };

  const { isBookmarked } = useBookmarkStore();
  const bookmarked = isBookmarked(verseRef);

  // verse.text is already in correct character set from cache (pre-converted)
  const displayText = verse.text || '';

  // Called when any word is tapped (triggers verse translation)
  const handleVerseTap = useCallback(() => {
    onVerseTap(verseRef);
  }, [onVerseTap, verseRef]);

  // Called when a word is long-pressed (triggers word definition)
  const handleWordLongPress = useCallback(
    (word: SegmentedWord) => {
      onWordLongPress(word, verseRef);
    },
    [onWordLongPress, verseRef]
  );

  return (
    <div
      className={`verse relative py-1 ${isActive ? 'verse-active' : ''}`}
      data-verse={verse.number}
    >
      {/* Verse number with bookmark indicator */}
      <span className="verse-number">
        {verse.number}
        {/* Bookmark indicator - visible if bookmarked */}
        {bookmarked && (
          <motion.span
            className="inline-block ml-0.5"
            style={{ color: 'var(--accent)' }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-2.5 w-2.5 inline"
            >
              <path
                fillRule="evenodd"
                d="M10 2c-1.716 0-3.408.106-5.07.31C3.806 2.45 3 3.414 3 4.517V17.25a.75.75 0 001.075.676L10 15.082l5.925 2.844A.75.75 0 0017 17.25V4.517c0-1.103-.806-2.068-1.93-2.207A41.403 41.403 0 0010 2z"
                clipRule="evenodd"
              />
            </svg>
          </motion.span>
        )}
      </span>

      {/* Verse content */}
      {verse.words ? (
        // Render segmented words with pinyin
        verse.words.map((word, index) => (
          <ChineseWord
            key={`${verse.number}-${index}-${word.chinese}`}
            word={word}
            onTap={handleVerseTap}
            onLongPress={handleWordLongPress}
            isHighlighted={highlightedWordIndex === index}
            showHsk={showHsk}
          />
        ))
      ) : (
        // Fallback: render plain text if no segmentation
        <span className="font-chinese-serif text-chinese">{displayText}</span>
      )}
    </div>
  );
});
