import { memo, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import type { Verse, SegmentedWord, VerseReference } from '../../types';
import { useBookmarkStore } from '../../stores';
import { ChineseWord } from './ChineseWord';

interface VerseDisplayProps {
  verse: Verse;
  bookId: string;
  chapter: number;
  onWordTap: (word: SegmentedWord, verseRef: VerseReference) => void; // Called when word is tapped (for word definition)
  onVerseLongPress: (verseRef: VerseReference) => void; // Called on long-press (for verse translation)
  isActive?: boolean;
  highlightedWordIndex?: number | null;
  showHsk?: boolean;
  /** If true, verse displays as block (poetry). If false, displays inline (prose paragraph) */
  isPoetry?: boolean;
}

export const VerseDisplay = memo(function VerseDisplay({
  verse,
  bookId,
  chapter,
  onWordTap,
  onVerseLongPress,
  isActive = false,
  highlightedWordIndex = null,
  showHsk = false,
  isPoetry = true,
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

  // Track if verse is in "pending" state (long press started but not yet triggered)
  const [isVersePending, setIsVersePending] = useState(false);

  // Called when a word is tapped (triggers word definition)
  const handleWordTap = useCallback(
    (word: SegmentedWord) => {
      onWordTap(word, verseRef);
    },
    [onWordTap, verseRef]
  );

  // Called when any word is long-pressed (triggers verse translation)
  const handleVerseLongPress = useCallback(() => {
    onVerseLongPress(verseRef);
    setIsVersePending(false); // Clear pending state when long press completes
  }, [onVerseLongPress, verseRef]);

  // Called when long press starts
  const handleLongPressStart = useCallback(() => {
    setIsVersePending(true);
  }, []);

  // Called when long press is cancelled
  const handleLongPressCancel = useCallback(() => {
    setIsVersePending(false);
  }, []);

  // Prose mode: inline span, Poetry mode: block div
  const Container = isPoetry ? 'div' : 'span';
  const containerClass = isPoetry
    ? `verse relative py-1 ${isActive ? 'verse-active' : ''}`
    : `verse-inline relative ${isActive ? 'verse-active' : ''}`;

  return (
    <Container
      className={containerClass}
      data-verse={verse.number}
    >
      {/* Verse number with bookmark indicator */}
      <span className={isPoetry ? 'verse-number' : 'verse-number-inline'}>
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
        <>
          {/* Render segmented words with pinyin */}
          {verse.words.map((word, index) => (
            <ChineseWord
              key={`${verse.number}-${index}-${word.chinese}`}
              word={word}
              onTap={handleWordTap}
              onLongPress={handleVerseLongPress}
              onLongPressStart={handleLongPressStart}
              onLongPressCancel={handleLongPressCancel}
              isHighlighted={highlightedWordIndex === index}
              isVersePending={isVersePending}
              showHsk={showHsk}
            />
          ))}

          {/* Append trailing punctuation if missing from words array */}
          {(() => {
            const lastChar = displayText.slice(-1);
            const lastWordText = verse.words[verse.words.length - 1]?.chinese || '';
            // Chinese fullwidth punctuation marks
            const isPunctuation = /[。，、！？；：「」『』（）《》〈〉【】〔〕]/.test(lastChar);
            const lastWordIsPunctuation = /[。，、！？；：「」『』（）《》〈〉【】〔〕]/.test(lastWordText);

            // If text ends with punctuation but last word doesn't, append it
            if (isPunctuation && !lastWordIsPunctuation) {
              return <span className="select-none">{lastChar}</span>;
            }
            return null;
          })()}
        </>
      ) : (
        // Fallback: render plain text if no segmentation
        <span className="font-chinese-serif text-chinese">{displayText}</span>
      )}
    </Container>
  );
});
