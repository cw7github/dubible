import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '../../stores';
import { PINYIN_LEVELS, shouldShowPinyin } from '../../types';
import type { PinyinLevel, CharacterSet } from '../../types';

// Character set options
const CHARACTER_SETS: {
  value: CharacterSet;
  label: { chinese: string; pinyin: string; english: string };
  example: string;
}[] = [
  {
    value: 'traditional',
    label: { chinese: '繁體字', pinyin: 'fántǐzì', english: 'Traditional' },
    example: '神愛世人',
  },
  {
    value: 'simplified',
    label: { chinese: '简体字', pinyin: 'jiǎntǐzì', english: 'Simplified' },
    example: '神爱世人',
  },
];

interface SettingsScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

// Sample words for the live preview with varying HSK levels
const PREVIEW_WORDS = [
  { chinese: '的', pinyin: 'de', hskLevel: 1 },
  { chinese: '人', pinyin: 'rén', hskLevel: 1 },
  { chinese: '看見', pinyin: 'kànjiàn', hskLevel: 2 },
  { chinese: '因為', pinyin: 'yīnwèi', hskLevel: 2 },
  { chinese: '許多', pinyin: 'xǔduō', hskLevel: 3 },
  { chinese: '一切', pinyin: 'yīqiè', hskLevel: 3 },
  { chinese: '安慰', pinyin: 'ānwèi', hskLevel: 4 },
  { chinese: '溫柔', pinyin: 'wēnróu', hskLevel: 4 },
  { chinese: '虛心', pinyin: 'xūxīn', hskLevel: 5 },
  { chinese: '承受', pinyin: 'chéngshòu', hskLevel: 5 },
  { chinese: '哀慟', pinyin: 'āitòng', hskLevel: 6 },
  { chinese: '逼迫', pinyin: 'bīpò', hskLevel: 6 },
];

export const SettingsScreen = memo(function SettingsScreen({
  isOpen,
  onClose,
}: SettingsScreenProps) {
  const { pinyinLevel, setPinyinLevel, characterSet, setCharacterSet } = useSettingsStore();

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
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'var(--overlay)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleBackdropClick}
          />

          {/* Panel */}
          <motion.div
            className="fixed top-0 right-0 bottom-0 z-50 w-96 max-w-[90vw] overflow-hidden shadow-elevated safe-area-top safe-area-bottom"
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderLeft: '1px solid var(--border-subtle)',
            }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <h2
                className="font-display text-base tracking-wide flex items-center gap-2"
                style={{ color: 'var(--text-primary)', letterSpacing: '0.1em' }}
              >
                <span className="inline-block w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--accent)', opacity: 0.6 }} />
                SETTINGS
              </h2>
              <motion.button
                className="touch-feedback rounded-lg p-2"
                style={{ color: 'var(--text-tertiary)' }}
                onClick={onClose}
                aria-label="Close settings"
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

            {/* Content */}
            <div className="h-full overflow-y-auto pb-20 px-5 py-6">
              {/* Pinyin Level Section */}
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {/* Section header with decorative flourish */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <h3
                      className="font-chinese-serif text-lg"
                      style={{ color: 'var(--text-primary)', letterSpacing: '0.08em' }}
                    >
                      <ruby>
                        拼音程度
                        <rt className="font-body text-[9px] italic" style={{ color: 'var(--text-tertiary)' }}>
                          pīnyīn chéngdù
                        </rt>
                      </ruby>
                    </h3>
                    <div
                      className="h-px flex-1"
                      style={{ background: 'linear-gradient(90deg, var(--border), transparent)' }}
                    />
                  </div>
                  <p
                    className="font-body text-sm italic"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Pinyin Display Level
                  </p>
                </div>

                {/* Level selector */}
                <div className="space-y-2 mb-8">
                  {PINYIN_LEVELS.map((level, index) => (
                    <PinyinLevelCard
                      key={level.value}
                      level={level}
                      isSelected={pinyinLevel === level.value}
                      onClick={() => setPinyinLevel(level.value)}
                      index={index}
                    />
                  ))}
                </div>

                {/* Live Preview */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className="font-display text-xs tracking-widest uppercase"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      Preview
                    </span>
                    <div
                      className="h-px flex-1"
                      style={{ background: 'linear-gradient(90deg, var(--border), transparent)' }}
                    />
                  </div>

                  <div
                    className="rounded-xl p-5"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <PreviewText pinyinLevel={pinyinLevel} />
                  </div>
                </motion.div>
              </motion.section>

              {/* Character Set Section */}
              <motion.section
                className="mt-10"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {/* Section header */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <h3
                      className="font-chinese-serif text-lg"
                      style={{ color: 'var(--text-primary)', letterSpacing: '0.08em' }}
                    >
                      <ruby>
                        字體
                        <rt className="font-body text-[9px] italic" style={{ color: 'var(--text-tertiary)' }}>
                          zìtǐ
                        </rt>
                      </ruby>
                    </h3>
                    <div
                      className="h-px flex-1"
                      style={{ background: 'linear-gradient(90deg, var(--border), transparent)' }}
                    />
                  </div>
                  <p
                    className="font-body text-sm italic"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Character Set
                  </p>
                </div>

                {/* Character set selector */}
                <div className="space-y-2">
                  {CHARACTER_SETS.map((set, index) => (
                    <CharacterSetCard
                      key={set.value}
                      set={set}
                      isSelected={characterSet === set.value}
                      onClick={() => setCharacterSet(set.value)}
                      index={index}
                    />
                  ))}
                </div>
              </motion.section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

interface PinyinLevelCardProps {
  level: typeof PINYIN_LEVELS[number];
  isSelected: boolean;
  onClick: () => void;
  index: number;
}

const PinyinLevelCard = memo(function PinyinLevelCard({
  level,
  isSelected,
  onClick,
  index,
}: PinyinLevelCardProps) {
  return (
    <motion.button
      className="touch-feedback w-full rounded-xl px-5 py-4 text-left transition-all duration-200"
      style={{
        backgroundColor: isSelected ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
        border: isSelected ? '2px solid var(--accent-light)' : '2px solid transparent',
        boxShadow: isSelected ? '0 2px 16px -4px var(--shadow-md), 0 0 0 1px var(--accent-light)' : 'none',
      }}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      whileHover={{ backgroundColor: isSelected ? 'var(--accent-subtle)' : 'var(--bg-tertiary)' }}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 + index * 0.03 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          {/* Selection indicator */}
          <div
            className="w-2.5 h-2.5 rounded-full transition-all duration-200"
            style={{
              backgroundColor: isSelected ? 'var(--accent)' : 'var(--border)',
              transform: isSelected ? 'scale(1.2)' : 'scale(1)',
              boxShadow: isSelected ? '0 0 8px var(--accent)' : 'none',
            }}
          />

          {/* Level info */}
          <div>
            <div className="flex items-baseline gap-2">
              <ruby
                className="font-chinese-serif text-base"
                style={{
                  color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                  letterSpacing: '0.05em',
                }}
              >
                {level.label.chinese}
                <rt
                  className="font-body text-[8px] italic"
                  style={{ color: 'var(--text-tertiary)', letterSpacing: '0' }}
                >
                  {level.label.pinyin}
                </rt>
              </ruby>
              <span
                className="font-body text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {level.label.english}
              </span>
            </div>
            <p
              className="mt-0.5 font-body text-xs italic"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {level.description}
            </p>
          </div>
        </div>

        {/* Checkmark for selected */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent)"
                strokeWidth={2}
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
});

interface PreviewTextProps {
  pinyinLevel: PinyinLevel;
}

const PreviewText = memo(function PreviewText({ pinyinLevel }: PreviewTextProps) {
  return (
    <div
      className="font-chinese-serif text-lg leading-relaxed"
      style={{ color: 'var(--text-primary)', letterSpacing: '0.02em' }}
    >
      {PREVIEW_WORDS.map((word, index) => {
        const showPinyin = shouldShowPinyin(pinyinLevel, word.hskLevel);
        return (
          <motion.span
            key={word.chinese}
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: index * 0.02 }}
          >
            <ruby className="inline">
              {word.chinese}
              <rt
                className="font-body text-[10px] italic transition-opacity duration-300"
                style={{
                  color: 'var(--text-pinyin)',
                  opacity: showPinyin ? 1 : 0,
                }}
              >
                {showPinyin ? word.pinyin : '\u00A0'}
              </rt>
            </ruby>
            {/* Add space between words for readability */}
            {index < PREVIEW_WORDS.length - 1 && (
              <span className="inline-block w-1" />
            )}
          </motion.span>
        );
      })}

      {/* HSK legend */}
      <div
        className="mt-4 pt-4 flex flex-wrap gap-3"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        {[1, 2, 3, 4, 5, 6].map((hsk) => {
          const showPinyin = shouldShowPinyin(pinyinLevel, hsk);
          return (
            <div
              key={hsk}
              className="flex items-center gap-1.5 transition-opacity duration-200"
              style={{ opacity: showPinyin ? 0.4 : 1 }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: showPinyin ? 'var(--text-tertiary)' : 'var(--accent)',
                }}
              />
              <span
                className="font-body text-xs"
                style={{ color: 'var(--text-tertiary)' }}
              >
                HSK {hsk}
              </span>
              <span
                className="font-body text-[10px]"
                style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}
              >
                {showPinyin ? 'shown' : 'hidden'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

interface CharacterSetCardProps {
  set: typeof CHARACTER_SETS[number];
  isSelected: boolean;
  onClick: () => void;
  index: number;
}

const CharacterSetCard = memo(function CharacterSetCard({
  set,
  isSelected,
  onClick,
  index,
}: CharacterSetCardProps) {
  return (
    <motion.button
      className="touch-feedback w-full rounded-xl px-5 py-4 text-left transition-all duration-200"
      style={{
        backgroundColor: isSelected ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
        border: isSelected ? '2px solid var(--accent-light)' : '2px solid transparent',
        boxShadow: isSelected ? '0 2px 16px -4px var(--shadow-md), 0 0 0 1px var(--accent-light)' : 'none',
      }}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      whileHover={{ backgroundColor: isSelected ? 'var(--accent-subtle)' : 'var(--bg-tertiary)' }}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 + index * 0.03 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          {/* Selection indicator */}
          <div
            className="w-2.5 h-2.5 rounded-full transition-all duration-200"
            style={{
              backgroundColor: isSelected ? 'var(--accent)' : 'var(--border)',
              transform: isSelected ? 'scale(1.2)' : 'scale(1)',
              boxShadow: isSelected ? '0 0 8px var(--accent)' : 'none',
            }}
          />

          {/* Character set info */}
          <div>
            <div className="flex items-baseline gap-2">
              <ruby
                className="font-chinese-serif text-base"
                style={{
                  color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                  letterSpacing: '0.05em',
                }}
              >
                {set.label.chinese}
                <rt
                  className="font-body text-[8px] italic"
                  style={{ color: 'var(--text-tertiary)', letterSpacing: '0' }}
                >
                  {set.label.pinyin}
                </rt>
              </ruby>
              <span
                className="font-body text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {set.label.english}
              </span>
            </div>
            <p
              className="mt-1 font-chinese-serif text-sm"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {set.example}
            </p>
          </div>
        </div>

        {/* Checkmark for selected */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent)"
                strokeWidth={2}
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
});
