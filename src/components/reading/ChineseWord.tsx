import { memo, useCallback } from 'react';
import type { SegmentedWord } from '../../types';
import { shouldShowPinyin } from '../../types';
import { useVocabularyStore, useSettingsStore } from '../../stores';
import { useLongPress } from '../../hooks/useLongPress';

interface ChineseWordProps {
  word: SegmentedWord;
  onTap?: () => void; // Called on regular tap (for verse translation)
  onLongPress?: (word: SegmentedWord) => void; // Called on long press (for word definition)
  isHighlighted?: boolean;
  showHsk?: boolean;
}

export const ChineseWord = memo(function ChineseWord({
  word,
  onTap,
  onLongPress,
  isHighlighted = false,
  showHsk = false,
}: ChineseWordProps) {
  const isWordSaved = useVocabularyStore((state) => state.isWordSaved);
  const pinyinLevel = useSettingsStore((state) => state.pinyinLevel);
  const isSaved = isWordSaved(word.chinese);

  // word.chinese is already in correct character set from cache (pre-converted)
  const displayText = word.chinese;

  // Determine if pinyin should be shown for this word based on settings and HSK level
  const showPinyin = shouldShowPinyin(pinyinLevel, word.hskLevel);

  const handleLongPress = useCallback(() => {
    if (onLongPress) {
      onLongPress(word);
    }
  }, [onLongPress, word]);

  const handleTap = useCallback(() => {
    if (onTap) {
      onTap();
    }
  }, [onTap]);

  const longPressHandlers = useLongPress({
    onLongPress: handleLongPress,
    onTap: handleTap,
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

  // Render character with centered pinyin above using flexbox
  return (
    <span
      className={`
        chinese-word
        ${isHighlighted ? 'word-highlight' : ''}
        ${isSaved ? 'saved' : ''}
      `}
      data-hsk={showHsk && word.hskLevel ? word.hskLevel : undefined}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      {...longPressHandlers}
    >
      <span className="pinyin-text">
        {showPinyin ? word.pinyin : '\u00A0'}
      </span>
      <span className="chinese-char">{displayText}</span>
    </span>
  );
});
