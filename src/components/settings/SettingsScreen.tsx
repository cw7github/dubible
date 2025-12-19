import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore, useAuthStore } from '../../stores';
import { PINYIN_LEVELS } from '../../types';
import type { PinyinLevel, CharacterSet, TextSize, FeedbackCategory, Feedback } from '../../types';
import { LoginScreen, ProfileScreen } from '../auth';
import {
  submitFeedback,
  getUserFeedback,
  FEEDBACK_CATEGORIES,
} from '../../services/feedbackService';
import { isFirebaseConfigured } from '../../lib/firebase';
import { AVAILABLE_TRANSLATIONS } from '../../data/english';

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
    englishVersion,
    setEnglishVersion,
    ambientMusicEnabled,
    setAmbientMusicEnabled,
  } = useSettingsStore();
  const { user, isAuthenticated, isFirebaseAvailable } = useAuthStore();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [userFeedback, setUserFeedback] = useState<Feedback[]>([]);

  // Load user's previous feedback to show responses
  useEffect(() => {
    if (isAuthenticated && user?.uid) {
      getUserFeedback(user.uid).then(setUserFeedback).catch(console.error);
    } else {
      setUserFeedback([]);
    }
  }, [isAuthenticated, user?.uid]);

  // Refresh feedback after submission
  const handleFeedbackSubmitted = () => {
    if (user?.uid) {
      getUserFeedback(user.uid).then(setUserFeedback).catch(console.error);
    }
    setIsFeedbackOpen(false);
  };

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

              {/* Bible Translations */}
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <SectionHeader chinese="譯本" english="Translations" />

                {/* Chinese - Read-only */}
                <div className="mt-3">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-body text-xs md:text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                      中文
                    </span>
                  </div>
                  <div
                    className="rounded-lg px-3 py-2.5"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-chinese-serif text-base md:text-sm" style={{ color: 'var(--text-primary)' }}>
                        新譯本
                      </span>
                      <span
                        className="font-display text-xs md:text-[10px] tracking-wider px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}
                      >
                        CNV
                      </span>
                    </div>
                  </div>
                </div>

                {/* English - Selector */}
                <div className="mt-4">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-body text-xs md:text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                      English
                    </span>
                  </div>
                  <div
                    className="flex rounded-lg p-0.5"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  >
                    {AVAILABLE_TRANSLATIONS.map((translation) => (
                      <button
                        key={translation.id}
                        className="touch-feedback flex-1 rounded-md py-2 px-3 transition-all duration-150"
                        style={{
                          backgroundColor: englishVersion === translation.id ? 'var(--bg-primary)' : 'transparent',
                          boxShadow: englishVersion === translation.id ? '0 1px 3px var(--shadow)' : 'none',
                        }}
                        onClick={() => setEnglishVersion(translation.id)}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className="font-display text-xs md:text-[10px] tracking-wider"
                            style={{ color: englishVersion === translation.id ? 'var(--accent)' : 'var(--text-tertiary)' }}
                          >
                            {translation.abbreviation}
                          </span>
                          <span
                            className="font-body text-[10px] md:text-[9px]"
                            style={{ color: englishVersion === translation.id ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}
                          >
                            {translation.name.replace(' Bible', '').replace(' Version', '')}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.section>

              {/* Divider */}
              <div className="h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />

              {/* Audio Section */}
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <SectionHeader chinese="音頻" english="Audio" />

                {/* Ambient Music Toggle */}
                <button
                  className="touch-feedback mt-3 w-full flex items-center justify-between rounded-xl px-3 py-2.5"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                  onClick={() => setAmbientMusicEnabled(!ambientMusicEnabled)}
                >
                  <div className="flex-1">
                    <p className="font-body text-base md:text-sm text-left" style={{ color: 'var(--text-primary)' }}>
                      Ambient Music
                    </p>
                    <p className="font-body text-xs md:text-[10px] text-left" style={{ color: 'var(--text-tertiary)' }}>
                      Play subtle background music during audio narration
                    </p>
                  </div>
                  <div
                    className="relative flex items-center justify-center flex-shrink-0 ml-3 rounded-full transition-all duration-200"
                    style={{
                      width: '44px',
                      height: '26px',
                      backgroundColor: ambientMusicEnabled ? 'var(--accent)' : 'var(--border)',
                    }}
                  >
                    <motion.div
                      className="absolute w-5 h-5 rounded-full"
                      style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                      initial={false}
                      animate={{ x: ambientMusicEnabled ? 9 : -9 }}
                      transition={{ type: 'spring', damping: 20, stiffness: 500 }}
                    />
                  </div>
                </button>
              </motion.section>

              {/* Divider */}
              <div className="h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />

              {/* Feedback Section */}
              {isFirebaseConfigured && (
                <motion.section
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <SectionHeader chinese="反饋" english="Feedback" />

                  {/* Send Feedback Button */}
                  <button
                    className="touch-feedback mt-3 w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                    onClick={() => setIsFeedbackOpen(true)}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'var(--accent-subtle)' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" style={{ color: 'var(--accent)' }}>
                        <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 001.28.53l3.58-3.579a.78.78 0 01.527-.224 41.202 41.202 0 005.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0010 2zm0 7a1 1 0 100-2 1 1 0 000 2zM8 8a1 1 0 11-2 0 1 1 0 012 0zm5 1a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-body text-base md:text-sm" style={{ color: 'var(--text-primary)' }}>
                        Send Feedback
                      </p>
                      <p className="font-body text-xs md:text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        Report bugs, request features
                      </p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }}>
                      <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 010-1.06z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {/* Show responses to user's previous feedback */}
                  {userFeedback.filter(f => f.response).length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="font-body text-xs md:text-[10px] uppercase tracking-wider px-1" style={{ color: 'var(--text-tertiary)' }}>
                        Responses
                      </p>
                      {userFeedback.filter(f => f.response).slice(0, 3).map((feedback) => (
                        <div
                          key={feedback.id}
                          className="rounded-lg px-3 py-2.5"
                          style={{ backgroundColor: 'var(--bg-secondary)' }}
                        >
                          <p className="font-body text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {feedback.message.slice(0, 50)}{feedback.message.length > 50 ? '...' : ''}
                          </p>
                          <div
                            className="mt-2 pt-2 flex items-start gap-2"
                            style={{ borderTop: '1px solid var(--border-subtle)' }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }}>
                              <path fillRule="evenodd" d="M1 8.74c0 .983.713 1.825 1.69 1.943.904.108 1.817.19 2.737.243.363.02.688.231.85.556l1.052 2.103a.75.75 0 001.342 0l1.052-2.103c.162-.325.487-.535.85-.556.92-.053 1.833-.134 2.738-.243.976-.118 1.689-.96 1.689-1.942V4.259c0-.982-.713-1.824-1.69-1.942a44.45 44.45 0 00-10.62 0C1.712 2.435 1 3.277 1 4.26v4.482z" clipRule="evenodd" />
                            </svg>
                            <p className="font-body text-xs" style={{ color: 'var(--accent)' }}>
                              {feedback.response}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.section>
              )}

            </div>
          </motion.div>

          <LoginScreen isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
          <ProfileScreen isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
          <FeedbackForm
            isOpen={isFeedbackOpen}
            onClose={() => setIsFeedbackOpen(false)}
            onSubmitted={handleFeedbackSubmitted}
            user={user}
          />
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

// Feedback Form Modal
interface FeedbackFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null } | null;
}

const FeedbackForm = memo(function FeedbackForm({
  isOpen,
  onClose,
  onSubmitted,
  user,
}: FeedbackFormProps) {
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>('other');
  const [contactEmail, setContactEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const getFriendlyErrorMessage = (error: unknown): string => {
    const code = typeof (error as any)?.code === 'string' ? (error as any).code : null;
    if (code === 'resource-exhausted') {
      return 'Firebase quota exceeded. Please try again in a few minutes (or after the daily reset).';
    }
    if (code === 'permission-denied') {
      return 'Feedback is blocked by Firestore permissions. Please sign in and try again.';
    }
    if (code === 'unavailable') {
      return 'Network error. Please try again.';
    }
    const msg = error instanceof Error ? error.message : '';
    return msg && msg.length < 160 ? msg : 'Something went wrong. Please try again.';
  };

  const copyFeedbackToClipboard = async (): Promise<void> => {
    const contact = contactEmail.trim() || user?.email || '';
    const payload = [
      `Category: ${category}`,
      contact ? `Contact: ${contact}` : null,
      `Page: ${window.location.pathname}`,
      '',
      message.trim(),
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setMessage('');
      setCategory('other');
      setContactEmail('');
      setSubmitStatus('idle');
      setErrorMessage(null);
      setCopied(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!message.trim()) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage(null);

    try {
      await submitFeedback(
        {
          message: message.trim(),
          category,
          contactEmail: contactEmail.trim() || undefined,
        },
        {
          userId: user?.uid || null,
          userEmail: user?.email || null,
          userName: user?.displayName || null,
          userPhoto: user?.photoURL || null,
        }
      );
      setSubmitStatus('success');
      // Wait a moment to show success, then close
      setTimeout(() => {
        onSubmitted();
      }, 1500);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setErrorMessage(getFriendlyErrorMessage(error));
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50"
            style={{ backgroundColor: 'var(--overlay)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-x-4 top-[15%] z-51 mx-auto max-w-md rounded-2xl shadow-elevated overflow-hidden"
            style={{ backgroundColor: 'var(--bg-primary)' }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
          >
            {/* Header */}
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
                  className="font-display text-sm tracking-wider"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Send Feedback
                </span>
              </div>
              <button
                className="touch-feedback rounded-lg p-1.5 -mr-1"
                style={{ color: 'var(--text-tertiary)' }}
                onClick={onClose}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* User info display (if authenticated) */}
              {user && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                >
                  {user.photoURL && (
                    <img src={user.photoURL} alt="" className="w-5 h-5 rounded-full" />
                  )}
                  <span>Sending as {user.displayName || user.email}</span>
                </div>
              )}

              {/* Category selector */}
              <div>
                <label
                  className="block font-body text-xs uppercase tracking-wider mb-2"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {FEEDBACK_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      className="touch-feedback px-3 py-1.5 rounded-full text-sm font-body transition-all"
                      style={{
                        backgroundColor: category === cat.value ? 'var(--accent)' : 'var(--bg-secondary)',
                        color: category === cat.value ? 'white' : 'var(--text-secondary)',
                      }}
                      onClick={() => setCategory(cat.value)}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message textarea */}
              <div>
                <label
                  className="block font-body text-xs uppercase tracking-wider mb-2"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Your Message
                </label>
                <textarea
                  className="w-full rounded-lg px-3 py-2.5 font-body text-sm resize-none"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    minHeight: '120px',
                  }}
                  placeholder="Tell us what's on your mind..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                />
                <p className="mt-1 text-right font-body text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {message.length}/2000
                </p>
              </div>

              {/* Contact email (for anonymous users) */}
              {!user && (
                <div>
                  <label
                    className="block font-body text-xs uppercase tracking-wider mb-2"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    className="w-full rounded-lg px-3 py-2.5 font-body text-sm"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                    placeholder="your@email.com (for follow-up)"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
              )}

              {/* Submit button */}
              <motion.button
                className="touch-feedback w-full py-3 rounded-xl font-body text-sm font-medium"
                style={{
                  backgroundColor: submitStatus === 'success' ? 'var(--success, #22c55e)' : 'var(--accent)',
                  color: 'white',
                  opacity: !message.trim() || isSubmitting ? 0.5 : 1,
                }}
                onClick={handleSubmit}
                disabled={!message.trim() || isSubmitting}
                whileTap={{ scale: 0.98 }}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.div
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    Sending...
                  </span>
                ) : submitStatus === 'success' ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                    Sent! Thank you
                  </span>
                ) : submitStatus === 'error' ? (
                  'Failed - Try Again'
                ) : (
                  'Send Feedback'
                )}
              </motion.button>

              {submitStatus === 'error' && (
                <div className="space-y-2">
                  <p className="text-center font-body text-xs" style={{ color: 'var(--error, #ef4444)' }}>
                    {errorMessage || 'Something went wrong. Please try again.'}
                  </p>
                  <button
                    className="touch-feedback w-full rounded-lg py-2 text-xs font-body"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                    onClick={copyFeedbackToClipboard}
                    type="button"
                  >
                    {copied ? 'Copied' : 'Copy Feedback'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
