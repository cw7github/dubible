import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore, useAuthStore } from '../../stores';
import { PINYIN_LEVELS, shouldShowPinyin } from '../../types';
import type { PinyinLevel, CharacterSet, TextSize } from '../../types';
import { LoginScreen, ProfileScreen } from '../auth';
import { splitPinyinSyllables, splitChineseCharacters } from '../../utils/pinyin';

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

// Bible translation options
const CHINESE_TRANSLATIONS: {
  value: string;
  label: { chinese: string; pinyin: string; english: string };
  abbrev: string;
}[] = [
  {
    value: 'cnv',
    label: { chinese: '新譯本', pinyin: 'xīnyìběn', english: 'Chinese New Version' },
    abbrev: 'CNV',
  },
];

const ENGLISH_TRANSLATIONS: {
  value: string;
  label: string;
  abbrev: string;
  description: string;
}[] = [
  {
    value: 'bsb',
    label: 'Berean Standard Bible',
    abbrev: 'BSB',
    description: 'Literal translation with clear language',
  },
];

interface SettingsScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

// Sample words for the live preview with varying HSK/TOCFL levels and frequencies
const PREVIEW_WORDS = [
  { chinese: '的', pinyin: 'de', hskLevel: 1, tocflLevel: 1, freq: 'common' as const },
  { chinese: '人', pinyin: 'rén', hskLevel: 1, tocflLevel: 1, freq: 'common' as const },
  { chinese: '看見', pinyin: 'kànjiàn', hskLevel: 2, tocflLevel: 1, freq: 'common' as const },
  { chinese: '因為', pinyin: 'yīnwèi', hskLevel: 2, tocflLevel: 1, freq: 'common' as const },
  { chinese: '許多', pinyin: 'xǔduō', hskLevel: 3, tocflLevel: 2, freq: 'uncommon' as const },
  { chinese: '一切', pinyin: 'yīqiè', hskLevel: 3, tocflLevel: 2, freq: 'uncommon' as const },
  { chinese: '安慰', pinyin: 'ānwèi', hskLevel: 4, tocflLevel: 4, freq: 'uncommon' as const },
  { chinese: '溫柔', pinyin: 'wēnróu', hskLevel: 4, tocflLevel: 5, freq: 'uncommon' as const },
  { chinese: '虛心', pinyin: 'xūxīn', hskLevel: 5, tocflLevel: 6, freq: 'rare' as const },
  { chinese: '承受', pinyin: 'chéngshòu', hskLevel: 5, tocflLevel: 5, freq: 'rare' as const },
  { chinese: '哀慟', pinyin: 'āitòng', hskLevel: 6, freq: 'rare' as const },
  { chinese: '逼迫', pinyin: 'bīpò', hskLevel: 6, tocflLevel: 6, freq: 'rare' as const },
  { chinese: '耶穌', pinyin: 'Yēsū', freq: 'biblical' as const },
  { chinese: '救恩', pinyin: 'jiùēn', tocflLevel: 6, freq: 'biblical' as const },
];

export const SettingsScreen = memo(function SettingsScreen({
  isOpen,
  onClose,
}: SettingsScreenProps) {
  const {
    pinyinLevel,
    setPinyinLevel,
    textSize,
    setTextSize,
    characterSet,
    setCharacterSet,
  } = useSettingsStore();
  const { user, isAuthenticated, isFirebaseAvailable } = useAuthStore();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
            className="fixed top-0 right-0 bottom-0 z-46 w-96 max-w-[90vw] overflow-hidden shadow-elevated safe-area-top safe-area-bottom"
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
              {/* Account Section */}
              {isFirebaseAvailable && (
                <motion.section
                  className="mb-10"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                >
                  {/* Section header */}
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <h3
                        className="font-chinese-serif text-lg"
                        style={{ color: 'var(--text-primary)', letterSpacing: '0.08em' }}
                      >
                        <ruby>
                          賬戶
                          <rt className="font-body text-[9px] italic" style={{ color: 'var(--text-tertiary)' }}>
                            zhànghù
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
                      Account
                    </p>
                  </div>

                  {/* Account card */}
                  {isAuthenticated && user ? (
                    <motion.button
                      className="touch-feedback w-full rounded-xl px-5 py-4 text-left transition-all duration-200"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '2px solid var(--border-subtle)',
                      }}
                      onClick={() => setIsProfileOpen(true)}
                      whileTap={{ scale: 0.98 }}
                      whileHover={{ backgroundColor: 'var(--bg-tertiary)' }}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName || 'User'}
                            className="h-12 w-12 rounded-full"
                            style={{ border: '2px solid var(--border-subtle)' }}
                          />
                        ) : (
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-full"
                            style={{ backgroundColor: 'var(--bg-accent)' }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="h-6 w-6"
                              style={{ color: 'var(--text-accent)' }}
                            >
                              <path
                                fillRule="evenodd"
                                d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}

                        {/* User info */}
                        <div className="flex-1">
                          <p
                            className="text-base font-medium"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {user.displayName || 'User'}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {user.email}
                          </p>
                        </div>

                        {/* Arrow icon */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          className="h-5 w-5"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8.25 4.5l7.5 7.5-7.5 7.5"
                          />
                        </svg>
                      </div>
                    </motion.button>
                  ) : (
                    <motion.button
                      className="touch-feedback w-full rounded-xl px-5 py-4 text-left transition-all duration-200"
                      style={{
                        backgroundColor: 'var(--accent-subtle)',
                        border: '2px solid var(--accent-light)',
                      }}
                      onClick={() => setIsLoginOpen(true)}
                      whileTap={{ scale: 0.98 }}
                      whileHover={{ backgroundColor: 'var(--bg-accent)' }}
                    >
                      <div className="flex items-center gap-3">
                        {/* Sign in icon */}
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-full"
                          style={{ backgroundColor: 'var(--accent)' }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-6 w-6"
                            style={{ color: 'white' }}
                          >
                            <path
                              fillRule="evenodd"
                              d="M7.5 3.75A1.5 1.5 0 006 5.25v13.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V15a.75.75 0 011.5 0v3.75a3 3 0 01-3 3h-6a3 3 0 01-3-3V5.25a3 3 0 013-3h6a3 3 0 013 3V9A.75.75 0 0115 9V5.25a1.5 1.5 0 00-1.5-1.5h-6zm10.72 4.72a.75.75 0 011.06 0l3 3a.75.75 0 010 1.06l-3 3a.75.75 0 11-1.06-1.06l1.72-1.72H9a.75.75 0 010-1.5h10.94l-1.72-1.72a.75.75 0 010-1.06z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>

                        {/* Text */}
                        <div className="flex-1">
                          <p
                            className="text-base font-medium"
                            style={{ color: 'var(--accent)' }}
                          >
                            Sign in to sync your data
                          </p>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Sync vocabulary, bookmarks, and progress
                          </p>
                        </div>

                        {/* Arrow icon */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          className="h-5 w-5"
                          style={{ color: 'var(--accent)' }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8.25 4.5l7.5 7.5-7.5 7.5"
                          />
                        </svg>
                      </div>
                    </motion.button>
                  )}
                </motion.section>
              )}

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

              {/* Text Size Section */}
              <motion.section
                className="mt-10"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.23 }}
              >
                {/* Section header */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <h3
                      className="font-chinese-serif text-lg"
                      style={{ color: 'var(--text-primary)', letterSpacing: '0.08em' }}
                    >
                      <ruby>
                        文字大小
                        <rt className="font-body text-[9px] italic" style={{ color: 'var(--text-tertiary)' }}>
                          wénzì dàxiǎo
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
                    Text Size
                  </p>
                </div>

                {/* Text size control */}
                <TextSizeControl
                  selectedSize={textSize}
                  onSizeChange={setTextSize}
                />
              </motion.section>

              {/* Bible Translation Section */}
              <motion.section
                className="mt-10"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                {/* Section header */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <h3
                      className="font-chinese-serif text-lg"
                      style={{ color: 'var(--text-primary)', letterSpacing: '0.08em' }}
                    >
                      <ruby>
                        聖經譯本
                        <rt className="font-body text-[9px] italic" style={{ color: 'var(--text-tertiary)' }}>
                          shèngjīng yìběn
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
                    Bible Translations
                  </p>
                </div>

                {/* Translation Display Panel */}
                <motion.div
                  className="rounded-2xl p-6 relative overflow-hidden"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1.5px solid var(--border)',
                    boxShadow: '0 2px 12px -3px rgba(0, 0, 0, 0.08)',
                  }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                >
                  {/* Decorative accent line */}
                  <div
                    className="absolute top-0 left-0 right-0 h-0.5"
                    style={{
                      background: 'linear-gradient(90deg, var(--accent), transparent 60%)',
                      opacity: 0.4,
                    }}
                  />

                  {/* Chinese Translation */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <span
                        className="font-display text-[10px] tracking-[0.15em] uppercase font-medium"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        Chinese
                      </span>
                      <div
                        className="h-px flex-1"
                        style={{ background: 'linear-gradient(90deg, var(--border-subtle), transparent)' }}
                      />
                    </div>

                    <TranslationInfoDisplay
                      translation={CHINESE_TRANSLATIONS[0]}
                      index={0}
                    />
                  </div>

                  {/* Divider */}
                  <div
                    className="h-px my-6"
                    style={{
                      background: 'linear-gradient(90deg, transparent, var(--border), transparent)',
                    }}
                  />

                  {/* English Translation */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span
                        className="font-display text-[10px] tracking-[0.15em] uppercase font-medium"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        English
                      </span>
                      <div
                        className="h-px flex-1"
                        style={{ background: 'linear-gradient(90deg, var(--border-subtle), transparent)' }}
                      />
                    </div>

                    <EnglishTranslationInfoDisplay
                      translation={ENGLISH_TRANSLATIONS[0]}
                      index={1}
                    />
                  </div>

                  {/* Footer note */}
                  <motion.div
                    className="mt-6 pt-5 flex items-start gap-3"
                    style={{
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.4 }}
                  >
                    {/* Subtle icon */}
                    <div
                      className="flex-shrink-0 mt-0.5"
                      style={{ opacity: 0.5 }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 2a.75.75 0 01.75.75v.258a33.186 33.186 0 016.668.83.75.75 0 01-.336 1.461 31.28 31.28 0 00-1.103-.232l1.702 7.545a.75.75 0 01-.387.832A4.981 4.981 0 0115 14c-.825 0-1.606-.2-2.294-.556a.75.75 0 01-.387-.832l1.77-7.849a31.743 31.743 0 00-3.339-.254v11.505a20.01 20.01 0 013.78.501.75.75 0 11-.339 1.462A18.558 18.558 0 0010 17.5c-1.442 0-2.845.165-4.191.477a.75.75 0 01-.338-1.462 20.01 20.01 0 013.779-.501V4.509c-1.129.026-2.243.112-3.34.254l1.771 7.85a.75.75 0 01-.387.83A4.98 4.98 0 015 14a4.98 4.98 0 01-2.294-.556.75.75 0 01-.387-.832L4.02 5.067c-.37.07-.738.148-1.103.232a.75.75 0 01-.336-1.462 33.186 33.186 0 016.668-.83V2.75A.75.75 0 0110 2zM5 7.543L3.92 12.33a3.499 3.499 0 002.16 0L5 7.543zm10 0l-1.08 4.787a3.498 3.498 0 002.16 0L15 7.543z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>

                    {/* Message */}
                    <p
                      className="font-body text-xs leading-relaxed italic"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      These are the currently available translations. Additional translations may be added in future updates.
                    </p>
                  </motion.div>
                </motion.div>
              </motion.section>
            </div>
          </motion.div>

          {/* Login Screen */}
          <LoginScreen isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

          {/* Profile Screen */}
          <ProfileScreen isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
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
        const showPinyin = shouldShowPinyin(pinyinLevel, word.hskLevel, word.freq, word.tocflLevel);
        const chars = splitChineseCharacters(word.chinese);
        const syllables = chars.length > 1 ? splitPinyinSyllables(word.pinyin, chars.length) : [word.pinyin];

        return (
          <motion.span
            key={word.chinese}
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: index * 0.02 }}
          >
            {chars.length > 1 ? (
              // Multi-character word: render each char with its pinyin centered above
              <span className="char-pinyin-pairs">
                {chars.map((char, charIdx) => (
                  <span key={charIdx} className="char-pinyin-unit">
                    <span
                      className="pinyin-text transition-opacity duration-300"
                      style={{ opacity: showPinyin ? 1 : 0 }}
                    >
                      {showPinyin ? syllables[charIdx] || '' : '\u00A0'}
                    </span>
                    <span className="chinese-char">{char}</span>
                  </span>
                ))}
              </span>
            ) : (
              // Single character word: simple ruby tag
              <span className="chinese-word" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                <span
                  className="pinyin-text transition-opacity duration-300"
                  style={{ opacity: showPinyin ? 1 : 0 }}
                >
                  {showPinyin ? word.pinyin : '\u00A0'}
                </span>
                <span className="chinese-char">{word.chinese}</span>
              </span>
            )}
            {/* Add space between words for readability */}
            {index < PREVIEW_WORDS.length - 1 && (
              <span className="inline-block w-1" />
            )}
          </motion.span>
        );
      })}

      {/* Legend */}
      <div
        className="mt-4 pt-4 space-y-2"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        {/* HSK levels */}
        <div className="flex flex-wrap gap-3">
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
        {/* Frequency levels */}
        <div className="flex flex-wrap gap-3">
          {(['common', 'uncommon', 'rare', 'biblical'] as const).map((freq) => {
            const showPinyin = shouldShowPinyin(pinyinLevel, null, freq);
            return (
              <div
                key={freq}
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
                  className="font-body text-xs capitalize"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {freq}
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

interface TranslationInfoDisplayProps {
  translation: typeof CHINESE_TRANSLATIONS[number];
  index: number;
}

const TranslationInfoDisplay = memo(function TranslationInfoDisplay({
  translation,
  index,
}: TranslationInfoDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + index * 0.1, duration: 0.4 }}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Main content */}
        <div className="flex-1">
          {/* Chinese name with pinyin */}
          <div className="mb-2">
            <ruby
              className="font-chinese-serif text-xl"
              style={{
                color: 'var(--text-primary)',
                letterSpacing: '0.06em',
              }}
            >
              {translation.label.chinese}
              <rt
                className="font-body text-[9px] italic"
                style={{ color: 'var(--text-tertiary)', letterSpacing: '0' }}
              >
                {translation.label.pinyin}
              </rt>
            </ruby>
          </div>

          {/* English name */}
          <p
            className="font-body text-sm mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            {translation.label.english}
          </p>
        </div>

        {/* Abbreviation badge */}
        <motion.div
          className="flex-shrink-0 px-3 py-1.5 rounded-lg"
          style={{
            backgroundColor: 'var(--accent-subtle)',
            border: '1px solid var(--accent-light)',
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
        >
          <span
            className="font-display text-sm tracking-widest font-medium"
            style={{ color: 'var(--accent)' }}
          >
            {translation.abbrev}
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
});

interface EnglishTranslationInfoDisplayProps {
  translation: typeof ENGLISH_TRANSLATIONS[number];
  index: number;
}

const EnglishTranslationInfoDisplay = memo(function EnglishTranslationInfoDisplay({
  translation,
  index,
}: EnglishTranslationInfoDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + index * 0.1, duration: 0.4 }}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Main content */}
        <div className="flex-1">
          {/* Translation name */}
          <h4
            className="font-body text-xl font-medium mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            {translation.label}
          </h4>

          {/* Description */}
          <p
            className="font-body text-sm italic"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {translation.description}
          </p>
        </div>

        {/* Abbreviation badge */}
        <motion.div
          className="flex-shrink-0 px-3 py-1.5 rounded-lg"
          style={{
            backgroundColor: 'var(--accent-subtle)',
            border: '1px solid var(--accent-light)',
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
        >
          <span
            className="font-display text-sm tracking-widest font-medium"
            style={{ color: 'var(--accent)' }}
          >
            {translation.abbrev}
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
});

// Text size options
const TEXT_SIZES: {
  value: TextSize;
  label: string;
  icon: string;
}[] = [
  { value: 'sm', label: 'X-Small', icon: 'Aa' },
  { value: 'md', label: 'Small', icon: 'Aa' },
  { value: 'lg', label: 'Medium', icon: 'Aa' },
  { value: 'xl', label: 'Large', icon: 'Aa' },
  { value: '2xl', label: 'X-Large', icon: 'Aa' },
];

interface TextSizeControlProps {
  selectedSize: TextSize;
  onSizeChange: (size: TextSize) => void;
}

const TextSizeControl = memo(function TextSizeControl({
  selectedSize,
  onSizeChange,
}: TextSizeControlProps) {
  return (
    <div>
      {/* Button grid */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        {TEXT_SIZES.map((size, index) => {
          const isSelected = selectedSize === size.value;
          const iconSizes = {
            sm: 'text-sm',
            md: 'text-base',
            lg: 'text-lg',
            xl: 'text-xl',
            '2xl': 'text-2xl',
          };

          return (
            <motion.button
              key={size.value}
              className="touch-feedback flex flex-col items-center justify-center rounded-xl py-4 px-2 transition-all duration-200"
              style={{
                backgroundColor: isSelected ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
                border: isSelected ? '2px solid var(--accent-light)' : '2px solid var(--border-subtle)',
                boxShadow: isSelected ? '0 2px 12px -3px var(--shadow-md)' : 'none',
              }}
              onClick={() => onSizeChange(size.value)}
              whileTap={{ scale: 0.95 }}
              whileHover={{
                backgroundColor: isSelected ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                y: -2,
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + index * 0.02 }}
            >
              {/* Icon */}
              <div
                className={`font-display font-medium ${iconSizes[size.value]} transition-all duration-200`}
                style={{
                  color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                  letterSpacing: '-0.02em',
                }}
              >
                {size.icon}
              </div>

              {/* Label */}
              <span
                className="mt-2 font-body text-[10px] font-medium text-center leading-tight"
                style={{ color: isSelected ? 'var(--accent)' : 'var(--text-tertiary)' }}
              >
                {size.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Preview */}
      <motion.div
        className="rounded-xl p-6"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
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

        {/* Preview text with selected size */}
        <div data-text-size={selectedSize}>
          <div className="flex flex-col items-center gap-1 mb-3">
            <span
              className="pinyin-text"
              style={{ color: 'var(--text-pinyin)' }}
            >
              shén ài shìrén
            </span>
            <span
              className="font-chinese-serif text-chinese"
              style={{ color: 'var(--text-primary)' }}
            >
              神愛世人
            </span>
          </div>
          <p
            className="text-center font-body italic"
            style={{
              color: 'var(--text-secondary)',
              fontSize: 'var(--english-base, 1rem)',
            }}
          >
            For God so loved the world
          </p>
        </div>
      </motion.div>
    </div>
  );
});
