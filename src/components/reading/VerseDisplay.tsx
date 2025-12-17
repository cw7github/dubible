import { memo, useCallback } from 'react';
import type { Verse, SegmentedWord, VerseReference } from '../../types';
import { useBookmarkStore } from '../../stores';
import { useDoubleTap } from '../../hooks/useDoubleTap';
import { ChineseWord } from './ChineseWord';

interface VerseDisplayProps {
  verse: Verse;
  bookId: string;
  chapter: number;
  onWordTapAndHold: (word: SegmentedWord, verseRef: VerseReference) => void; // Called when word is tap-and-held (for word definition)
  onVerseDoubleTap: (verseRef: VerseReference) => void; // Called on double-tap (for verse translation)
  isActive?: boolean;
  highlightedWordIndex?: number | null;
  selectedWord?: SegmentedWord | null;
  selectedWordVerseRef?: VerseReference | null;
  showHsk?: boolean;
  /** If true, verse displays as block (poetry). If false, displays inline (prose paragraph) */
  isPoetry?: boolean;
}

export const VerseDisplay = memo(function VerseDisplay({
  verse,
  bookId,
  chapter,
  onWordTapAndHold,
  onVerseDoubleTap,
  isActive = false,
  highlightedWordIndex = null,
  selectedWord = null,
  selectedWordVerseRef = null,
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

  // Called when a word is tap-and-held (triggers word definition)
  const handleWordTapAndHold = useCallback(
    (word: SegmentedWord) => {
      onWordTapAndHold(word, verseRef);
    },
    [onWordTapAndHold, verseRef]
  );

  // Called when verse is double-tapped (triggers verse translation)
  const handleVerseDoubleTap = useCallback(() => {
    onVerseDoubleTap(verseRef);
  }, [onVerseDoubleTap, verseRef]);

  // Setup double-tap handlers for the verse container
  const doubleTapHandlers = useDoubleTap({
    onDoubleTap: handleVerseDoubleTap,
    delay: 300, // 300ms between taps
  });

  // Prose mode: inline span, Poetry mode: block div
  const Container = isPoetry ? 'div' : 'span';
  const containerClass = isPoetry
    ? `verse relative py-1 ${isActive ? 'verse-active' : ''}`
    : `verse-inline relative ${isActive ? 'verse-active' : ''}`;

  return (
    <Container
      className={containerClass}
      data-verse={verse.number}
      {...doubleTapHandlers}
    >
      {/* Section heading (from NET Bible) */}
      {verse.heading && (
        <div
          className="section-heading font-body text-sm md:text-xs tracking-wide mt-5 mb-2 first:mt-0"
          style={{ color: 'var(--text-secondary)' }}
        >
          {verse.heading}
        </div>
      )}

      {/* Verse number with bookmark indicator */}
      <span className={isPoetry ? 'verse-number' : 'verse-number-inline'}>
        {verse.number}
        {/* Bookmark indicator - visible if bookmarked */}
        {bookmarked && (
          <span
            className="inline-block ml-0.5"
            style={{ color: 'var(--accent)' }}
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
          </span>
        )}
      </span>

      {/* Verse content */}
      {verse.words ? (
        <>
          {/* Render segmented words with pinyin */}
          {verse.words.map((word, index) => {
            // Check if this word is the currently selected word (for persistent highlighting)
            const isSelected = selectedWord && selectedWordVerseRef &&
              selectedWordVerseRef.bookId === bookId &&
              selectedWordVerseRef.chapter === chapter &&
              selectedWordVerseRef.verse === verse.number &&
              selectedWord.chinese === word.chinese &&
              selectedWord.pinyin === word.pinyin;

            return (
              <ChineseWord
                key={`${verse.number}-${index}-${word.chinese}`}
                word={word}
                onTapAndHold={handleWordTapAndHold}
                isHighlighted={highlightedWordIndex === index}
                isSelected={isSelected || false}
                showHsk={showHsk}
              />
            );
          })}

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
