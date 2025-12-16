import { memo, useCallback, useMemo, useEffect, useState } from 'react';
import type { SegmentedWord } from '../../types';
import { shouldShowPinyin } from '../../types';
import { useVocabularyStore, useSettingsStore } from '../../stores';
import { useHold } from '../../hooks/useHold';
import { splitPinyinSyllables, splitChineseCharacters } from '../../utils/pinyin';

interface ChineseWordProps {
  word: SegmentedWord;
  onTapAndHold?: (word: SegmentedWord) => void; // Called on hold (for word definition)
  onHoldStart?: () => void; // Called when hold starts
  onHoldCancel?: () => void; // Called when hold is cancelled
  isHighlighted?: boolean;
  isSelected?: boolean; // True when this word is selected and definition card is showing
  showHsk?: boolean;
}

export const ChineseWord = memo(function ChineseWord({
  word,
  onTapAndHold,
  onHoldStart,
  onHoldCancel,
  isHighlighted = false,
  isSelected = false,
  showHsk = false,
}: ChineseWordProps) {
  const isWordSaved = useVocabularyStore((state) => state.isWordSaved);
  const pinyinLevel = useSettingsStore((state) => state.pinyinLevel);
  const isSaved = isWordSaved(word.chinese);

  // Track hold progress for visual feedback (0-1)
  const [holdProgress, setHoldProgress] = useState(0);

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

  const handleHold = useCallback(() => {
    // iOS PWA Fix: Only trigger hold callback if this word is not already selected
    // This prevents issues where a touchend from the hold gesture might somehow
    // reach another word element and cause unexpected behavior
    if (isSelected) {
      // This word is already showing its definition, ignore the hold
      return;
    }
    if (onTapAndHold) {
      onTapAndHold(word);
    }
  }, [onTapAndHold, word, isSelected]);

  const handleHoldStart = useCallback(() => {
    setHoldProgress(0);
    if (onHoldStart) {
      onHoldStart();
    }
  }, [onHoldStart]);

  const handleHoldCancel = useCallback(() => {
    setHoldProgress(0);
    if (onHoldCancel) {
      onHoldCancel();
    }
  }, [onHoldCancel]);

  const handleHoldProgress = useCallback((progress: number) => {
    setHoldProgress(progress);
  }, []);

  const holdHandlers = useHold({
    onHold: handleHold,
    onHoldStart: handleHoldStart,
    onHoldCancel: handleHoldCancel,
    onHoldProgress: handleHoldProgress,
    threshold: 300, // 300ms for quick word lookups
    movementTolerance: 10,
  });

  // Skip punctuation - render without interaction
  if (!word.pinyin && !word.definition) {
    return <span className="select-none">{displayText}</span>;
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleHold();
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

  // Calculate visual feedback styles based on hold progress
  const holdProgressStyle = useMemo(() => {
    if (holdProgress === 0) return {};

    // Subtle scale and opacity changes during hold
    const scale = 1 + (holdProgress * 0.05); // Scale up to 1.05x
    const opacity = 1 - (holdProgress * 0.15); // Fade slightly to 0.85

    return {
      transform: `scale(${scale})`,
      opacity,
      transition: 'transform 0.016s linear, opacity 0.016s linear',
    };
  }, [holdProgress]);

  // Render character with centered pinyin above using flexbox
  return (
    <span
      className={`
        chinese-word
        ${isHighlighted ? 'word-highlight' : ''}
        ${isSelected ? 'word-selected' : ''}
        ${isSaved ? 'saved' : ''}
        ${holdProgress > 0 ? 'word-holding' : ''}
      `}
      data-hsk={showHsk && word.hskLevel ? word.hskLevel : undefined}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={holdProgressStyle}
      {...holdHandlers}
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
