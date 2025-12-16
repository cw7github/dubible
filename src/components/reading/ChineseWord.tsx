import { memo, useCallback, useMemo, useEffect } from 'react';
import type { SegmentedWord } from '../../types';
import { shouldShowPinyin } from '../../types';
import { useVocabularyStore, useSettingsStore } from '../../stores';
import { useLongPress } from '../../hooks/useLongPress';
import { splitPinyinSyllables, splitChineseCharacters } from '../../utils/pinyin';

interface ChineseWordProps {
  word: SegmentedWord;
  onTap?: (word: SegmentedWord) => void; // Called on regular tap (for word definition)
  onLongPress?: () => void; // Called on long press (for verse translation)
  onLongPressStart?: () => void; // Called when long press starts
  onLongPressCancel?: () => void; // Called when long press is cancelled
  isHighlighted?: boolean;
  isVersePending?: boolean; // True when long press started but not yet triggered
  showHsk?: boolean;
}

export const ChineseWord = memo(function ChineseWord({
  word,
  onTap,
  onLongPress,
  onLongPressStart,
  onLongPressCancel,
  isHighlighted = false,
  isVersePending = false,
  showHsk = false,
}: ChineseWordProps) {
  const isWordSaved = useVocabularyStore((state) => state.isWordSaved);
  const pinyinLevel = useSettingsStore((state) => state.pinyinLevel);
  const isSaved = isWordSaved(word.chinese);

  // word.chinese is already in correct character set from cache (pre-converted)
  const displayText = word.chinese;

  // Determine if pinyin should be shown for this word based on settings, HSK/TOCFL level, and frequency
  const showPinyin = shouldShowPinyin(pinyinLevel, word.hskLevel, word.freq, word.tocflLevel);

  // Debug: Log when highlighting changes (only in development)
  useEffect(() => {
    if (isHighlighted && import.meta.env.DEV) {
      console.log(`[ChineseWord] Highlighted: "${displayText}"`);
    }
  }, [isHighlighted, displayText]);

  const handleLongPress = useCallback(() => {
    if (onLongPress) {
      onLongPress();
    }
  }, [onLongPress]);

  const handleTap = useCallback(() => {
    if (onTap) {
      onTap(word);
    }
  }, [onTap, word]);

  const longPressHandlers = useLongPress({
    onLongPress: handleLongPress,
    onTap: handleTap,
    onLongPressStart,
    onLongPressCancel,
    threshold: 400, // 400ms for long press
  });

  // Skip punctuation - render without interaction
  if (!word.pinyin && !word.definition) {
    return <span className="select-none">{displayText}</span>;
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTap();
    }
  };

  // Split multi-character words into character-pinyin pairs for proper alignment
  const charPinyinPairs = useMemo(() => {
    const chars = splitChineseCharacters(displayText);
    if (chars.length <= 1 || !word.pinyin) {
      return null; // Single char or no pinyin - use simple render
    }
    const syllables = splitPinyinSyllables(word.pinyin, chars.length);
    return chars.map((char, i) => ({
      char,
      pinyin: syllables[i] || '',
    }));
  }, [displayText, word.pinyin]);

  // Render character with centered pinyin above using flexbox
  return (
    <span
      className={`
        chinese-word
        ${isHighlighted ? 'word-highlight' : ''}
        ${isVersePending ? 'verse-pending' : ''}
        ${isSaved ? 'saved' : ''}
      `}
      data-hsk={showHsk && word.hskLevel ? word.hskLevel : undefined}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      {...longPressHandlers}
    >
      {charPinyinPairs ? (
        // Multi-character word: render each char with its pinyin aligned
        <span className="char-pinyin-pairs">
          {charPinyinPairs.map((pair, idx) => (
            <span key={idx} className="char-pinyin-unit">
              <span className="pinyin-text">
                {showPinyin ? pair.pinyin : '\u00A0'}
              </span>
              <span className="chinese-char">{pair.char}</span>
            </span>
          ))}
        </span>
      ) : (
        // Single character word: simple render
        <>
          <span className="pinyin-text">
            {showPinyin ? word.pinyin : '\u00A0'}
          </span>
          <span className="chinese-char">{displayText}</span>
        </>
      )}
    </span>
  );
});
