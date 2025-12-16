import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore, useAuthStore } from '../../stores';
import { PINYIN_LEVELS } from '../../types';
import type { PinyinLevel, CharacterSet, TextSize } from '../../types';
import { LoginScreen, ProfileScreen } from '../auth';

// Character set options
const CHARACTER_SETS: { value: CharacterSet; chinese: string; english: string }[] = [
  { value: 'traditional', chinese: '繁體', english: 'Traditional' },
  { value: 'simplified', chinese: '简体', english: 'Simplified' },
];

// Text size options
const TEXT_SIZES: { value: TextSize; label: string }[] = [
  { value: 'sm', label: 'XS' },
  { value: 'md', label: 'S' },
  { value: 'lg', label: 'M' },
  { value: 'xl', label: 'L' },
  { value: '2xl', label: 'XL' },
];

interface SettingsScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

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
    theme,
    setTheme,
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
            className="fixed inset-0 z-45"
            style={{ backgroundColor: 'var(--overlay)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={handleBackdropClick}
          />

          {/* Panel - Narrower for compactness */}
          <motion.div
            className="fixed top-0 right-0 bottom-0 z-46 w-80 max-w-[85vw] overflow-hidden shadow-elevated safe-area-top safe-area-bottom"
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderLeft: '1px solid var(--border-subtle)',
            }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 500 }}
          >
            {/* Compact Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-1 h-4 rounded-full"
                  style={{ backgroundColor: 'var(--accent)' }}
                />
                <span
                  className="font-display text-sm md:text-xs tracking-[0.2em] uppercase"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Settings
                </span>
              </div>
              <motion.button
                className="touch-feedback rounded-lg p-1.5 -mr-1"
                style={{ color: 'var(--text-tertiary)' }}
                onClick={onClose}
                whileTap={{ scale: 0.9 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </motion.button>
            </div>

            {/* Content */}
            <div className="h-full overflow-y-auto pb-16 px-4 py-4 space-y-5">

              {/* Account - Compact inline */}
              {isFirebaseAvailable && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                >
                  {isAuthenticated && user ? (
                    <button
                      className="touch-feedback w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left"
                      style={{ backgroundColor: 'var(--bg-secondary)' }}
                      onClick={() => setIsProfileOpen(true)}
                    >
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt=""
                          className="w-8 h-8 rounded-full"
                          style={{ border: '1.5px solid var(--border-subtle)' }}
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: 'var(--accent-subtle)' }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" style={{ color: 'var(--accent)' }}>
                            <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-base md:text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                          {user.displayName || 'User'}
                        </p>
                        <p className="font-body text-xs md:text-[10px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                          {user.email}
                        </p>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }}>
                        <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 010-1.06z" clipRule="evenodd" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      className="touch-feedback w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left"
                      style={{ backgroundColor: 'var(--accent-subtle)', border: '1px solid var(--accent-light)' }}
                      onClick={() => setIsLoginOpen(true)}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'var(--accent)' }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white" className="w-4 h-4">
                          <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
                          <path fillRule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114l-1.048-.943h9.546A.75.75 0 0019 10z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-body text-base md:text-sm" style={{ color: 'var(--accent)' }}>Sign in</p>
                        <p className="font-body text-xs md:text-[10px]" style={{ color: 'var(--text-secondary)' }}>Sync your progress</p>
                      </div>
                    </button>
                  )}
                </motion.div>
              )}

              {/* Theme Selector */}
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
              >
                <SectionHeader chinese="主題" english="Theme" />

                <div
                  className="mt-3 flex rounded-lg p-0.5"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                  <button
                    className="touch-feedback flex-1 rounded-md py-2 px-3 transition-all duration-150 flex flex-col items-center gap-1"
                    style={{
                      backgroundColor: theme === 'light' ? 'var(--bg-primary)' : 'transparent',
                      boxShadow: theme === 'light' ? '0 1px 3px var(--shadow)' : 'none',
                    }}
                    onClick={() => setTheme('light')}
                    aria-label="Light theme"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      className="h-4.5 w-4.5"
                      style={{ color: theme === 'light' ? 'var(--accent)' : 'var(--text-tertiary)' }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                      />
                    </svg>
                    <span
                      className="font-body text-xs md:text-[10px]"
                      style={{ color: theme === 'light' ? 'var(--accent)' : 'var(--text-tertiary)' }}
                    >
                      Light
                    </span>
                  </button>

                  <button
                    className="touch-feedback flex-1 rounded-md py-2 px-3 transition-all duration-150 flex flex-col items-center gap-1"
                    style={{
                      backgroundColor: theme === 'sepia' ? 'var(--bg-primary)' : 'transparent',
                      boxShadow: theme === 'sepia' ? '0 1px 3px var(--shadow)' : 'none',
                    }}
                    onClick={() => setTheme('sepia')}
                    aria-label="Sepia theme"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      className="h-4.5 w-4.5"
                      style={{ color: theme === 'sepia' ? 'var(--accent)' : 'var(--text-tertiary)' }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
                      />
                    </svg>
                    <span
                      className="font-body text-xs md:text-[10px]"
                      style={{ color: theme === 'sepia' ? 'var(--accent)' : 'var(--text-tertiary)' }}
                    >
                      Sepia
                    </span>
                  </button>

                  <button
                    className="touch-feedback flex-1 rounded-md py-2 px-3 transition-all duration-150 flex flex-col items-center gap-1"
                    style={{
                      backgroundColor: theme === 'dark' ? 'var(--bg-primary)' : 'transparent',
                      boxShadow: theme === 'dark' ? '0 1px 3px var(--shadow)' : 'none',
                    }}
                    onClick={() => setTheme('dark')}
                    aria-label="Dark theme"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-4.5 w-4.5"
                      style={{ color: theme === 'dark' ? 'var(--accent)' : 'var(--text-tertiary)' }}
                    >
                      <path
                        fillRule="evenodd"
                        d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span
                      className="font-body text-xs md:text-[10px]"
                      style={{ color: theme === 'dark' ? 'var(--accent)' : 'var(--text-tertiary)' }}
                    >
                      Dark
                    </span>
                  </button>
                </div>
              </motion.section>

              {/* Divider */}
              <div className="h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />

              {/* Reading Level - Elegant slider */}
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <SectionHeader chinese="程度" english="Reading Level" />

                {/* Slider component */}
                <ReadingLevelSlider
                  value={pinyinLevel}
                  onChange={setPinyinLevel}
                />
              </motion.section>

              {/* Character Set - Inline toggle */}
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <SectionHeader chinese="字體" english="Characters" />

                <div
                  className="mt-3 flex rounded-lg p-0.5"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                  {CHARACTER_SETS.map((set) => (
                    <button
                      key={set.value}
                      className="touch-feedback flex-1 rounded-md py-2 px-3 transition-all duration-150"
                      style={{
                        backgroundColor: characterSet === set.value ? 'var(--bg-primary)' : 'transparent',
                        boxShadow: characterSet === set.value ? '0 1px 3px var(--shadow)' : 'none',
                      }}
                      onClick={() => setCharacterSet(set.value)}
                    >
                      <span
                        className="font-chinese-serif text-base md:text-sm"
                        style={{ color: characterSet === set.value ? 'var(--accent)' : 'var(--text-secondary)' }}
                      >
                        {set.chinese}
                      </span>
                      <span
                        className="ml-1.5 font-body text-xs md:text-[10px]"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {set.english}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.section>

              {/* Text Size - Compact segmented control */}
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <SectionHeader chinese="大小" english="Text Size" />

                <div
                  className="mt-3 flex rounded-lg p-0.5"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                  {TEXT_SIZES.map((size) => (
                    <button
                      key={size.value}
                      className="touch-feedback flex-1 rounded-md py-2.5 transition-all duration-150"
                      style={{
                        backgroundColor: textSize === size.value ? 'var(--bg-primary)' : 'transparent',
                        boxShadow: textSize === size.value ? '0 1px 3px var(--shadow)' : 'none',
                      }}
                      onClick={() => setTextSize(size.value)}
                    >
                      <span
                        className="font-display text-sm md:text-xs"
                        style={{ color: textSize === size.value ? 'var(--accent)' : 'var(--text-tertiary)' }}
                      >
                        {size.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Inline preview */}
                <div
                  className="mt-3 rounded-lg px-3 py-2.5 text-center"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                  data-text-size={textSize}
                >
                  <span className="font-chinese-serif text-chinese" style={{ color: 'var(--text-primary)' }}>
                    神愛世人
                  </span>
                </div>
              </motion.section>

              {/* Bible Translations - Condensed info */}
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <SectionHeader chinese="譯本" english="Translations" />

                <div
                  className="mt-3 rounded-lg overflow-hidden"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                  {/* Chinese */}
                  <div className="px-3 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-body text-xs md:text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                        中文
                      </span>
                      <span className="font-chinese-serif text-base md:text-sm" style={{ color: 'var(--text-primary)' }}>
                        新譯本
                      </span>
                    </div>
                    <span
                      className="font-display text-xs md:text-[10px] tracking-wider px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}
                    >
                      CNV
                    </span>
                  </div>

                  <div className="h-px mx-3" style={{ backgroundColor: 'var(--border-subtle)' }} />

                  {/* English */}
                  <div className="px-3 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-body text-xs md:text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                        ENG
                      </span>
                      <span className="font-body text-base md:text-sm" style={{ color: 'var(--text-primary)' }}>
                        Berean Standard
                      </span>
                    </div>
                    <span
                      className="font-display text-xs md:text-[10px] tracking-wider px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}
                    >
                      BSB
                    </span>
                  </div>
                </div>

<p
                  className="mt-2 font-body text-xs md:text-[10px] px-1"
                  style={{ color: 'var(--text-tertiary)', opacity: 0.6 }}
                >
                  Only supported translations
                </p>
              </motion.section>

              {/* Version info */}
              <motion.div
                className="pt-4 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <p
                  className="font-body text-[10px] md:text-[9px] tracking-wider uppercase"
                  style={{ color: 'var(--text-tertiary)', opacity: 0.5 }}
                >
                  DuBible v1.0
                </p>
              </motion.div>
            </div>
          </motion.div>

          <LoginScreen isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
          <ProfileScreen isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
        </>
      )}
    </AnimatePresence>
  );
});

// Compact section header
const SectionHeader = memo(function SectionHeader({
  chinese,
  english,
}: {
  chinese: string;
  english: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span
        className="font-chinese-serif text-base md:text-sm"
        style={{ color: 'var(--text-primary)' }}
      >
        {chinese}
      </span>
      <span
        className="font-body text-xs md:text-[10px] uppercase tracking-wider"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {english}
      </span>
      <div
        className="flex-1 h-px ml-2"
        style={{ background: 'linear-gradient(90deg, var(--border-subtle), transparent)' }}
      />
    </div>
  );
});

// Reading Level Slider - Elegant discrete slider with 6 stops
const ReadingLevelSlider = memo(function ReadingLevelSlider({
  value,
  onChange,
}: {
  value: PinyinLevel;
  onChange: (level: PinyinLevel) => void;
}) {
  const currentIndex = PINYIN_LEVELS.findIndex(l => l.value === value);
  const currentLevel = PINYIN_LEVELS[currentIndex];

  return (
    <div className="mt-4 px-1">
      {/* Endpoint labels */}
      <div className="flex justify-between mb-2">
        <span
          className="font-body text-[11px] md:text-[9px] uppercase tracking-wider"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Beginner
        </span>
        <span
          className="font-body text-[11px] md:text-[9px] uppercase tracking-wider"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Fluent
        </span>
      </div>

      {/* Slider track */}
      <div
        className="relative h-10 flex items-center"
        style={{ touchAction: 'none' }}
      >
        {/* Background track */}
        <div
          className="absolute left-0 right-0 h-1 rounded-full"
          style={{ backgroundColor: 'var(--border)' }}
        />

        {/* Filled track */}
        <motion.div
          className="absolute left-0 h-1 rounded-full"
          style={{ backgroundColor: 'var(--accent)' }}
          initial={false}
          animate={{ width: `${(currentIndex / (PINYIN_LEVELS.length - 1)) * 100}%` }}
          transition={{ type: 'spring', damping: 25, stiffness: 400 }}
        />

        {/* Dots */}
        <div className="absolute left-0 right-0 flex justify-between">
          {PINYIN_LEVELS.map((level, idx) => {
            const isActive = idx === currentIndex;
            const isPast = idx < currentIndex;

            return (
              <button
                key={level.value}
                className="touch-feedback relative flex items-center justify-center"
                style={{ width: '24px', height: '24px', margin: '-12px -4px' }}
                onClick={() => onChange(level.value)}
                aria-label={level.label.english}
              >
                <motion.div
                  className="rounded-full"
                  style={{
                    backgroundColor: isActive || isPast ? 'var(--accent)' : 'var(--bg-secondary)',
                    border: isActive ? 'none' : `2px solid ${isPast ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                  initial={false}
                  animate={{
                    width: isActive ? 16 : 10,
                    height: isActive ? 16 : 10,
                    boxShadow: isActive ? '0 0 12px var(--accent-light), 0 2px 8px rgba(0,0,0,0.15)' : 'none',
                  }}
                  transition={{ type: 'spring', damping: 20, stiffness: 400 }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Current level indicator */}
      <motion.div
        className="mt-3 text-center"
        initial={false}
        animate={{ opacity: 1 }}
        key={currentLevel.value}
      >
        <motion.div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ backgroundColor: 'var(--accent-subtle)' }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        >
          <span
            className="font-chinese-serif text-base md:text-sm"
            style={{ color: 'var(--accent)' }}
          >
            {currentLevel.label.chinese}
          </span>
          <span
            className="font-body text-sm md:text-xs"
            style={{ color: 'var(--accent)' }}
          >
            {currentLevel.label.english}
          </span>
        </motion.div>
        <p
          className="mt-1.5 font-body text-xs md:text-[10px]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {currentLevel.description}
        </p>
      </motion.div>
    </div>
  );
});
