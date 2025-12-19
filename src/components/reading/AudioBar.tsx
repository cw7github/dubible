import { memo, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpeedSelector } from './SpeedSelector';

interface AudioBarProps {
  isPlaying: boolean;
  isAvailable: boolean;
  isLoading?: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  currentVerseNumber: number | null;
  currentWord: string | null;
  currentPinyin: string | null;
  currentDefinition: string | null;
  isMusicPlaying?: boolean;
  // Book/Chapter info
  bookName?: { chinese: string; english: string; pinyin: string };
  chapter?: number;
  totalChapters?: number;
  // Controls
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSetPlaybackRate: (rate: number) => void;
  onClose: () => void;
  // Chapter navigation
  onPreviousChapter?: () => void;
  onNextChapter?: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  // Auto-advance state
  isAutoAdvancing?: boolean;
  autoAdvanceCountdown?: number;
  onCancelAutoAdvance?: () => void;
  // Auto-scroll state
  autoScrollEnabled?: boolean;
  onResumeAutoScroll?: () => void; // Toggles auto-scroll on/off and scrolls to current verse when enabling
}

// Chinese punctuation marks to filter out from display
const PUNCTUATION = ['。', '，', '；', '：', '！', '？', '、', '「', '」', '『', '』', '（', '）', '…', '──'];

/**
 * Split pinyin into syllables based on vowel patterns and consonant starts
 * Handles both space-separated and continuous pinyin strings
 * Also handles apostrophes (') which separate syllables in pinyin (e.g., "cí'ài" -> ["cí", "ài"])
 */
function splitPinyinToSyllables(pinyin: string, targetCount: number): string[] {
  // First, check if apostrophes are present - they explicitly mark syllable boundaries
  if (pinyin.includes("'")) {
    const apostropheSplit = pinyin.split("'");
    if (apostropheSplit.length === targetCount) {
      return apostropheSplit;
    }
  }

  // Next, try splitting by spaces
  const spaceSplit = pinyin.split(/\s+/);
  if (spaceSplit.length === targetCount) {
    return spaceSplit;
  }

  // Remove spaces and apostrophes for complex parsing
  const cleaned = pinyin.replace(/[\s']+/g, '');
  const vowels = /[aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/i;

  const syllables: string[] = [];
  let current = '';

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const nextChar = cleaned[i + 1];
    current += char;

    const hasVowel = vowels.test(current);
    const nextIsCapital = nextChar && nextChar === nextChar.toUpperCase() && /[A-Z]/.test(nextChar);
    const nextStartsNew = nextChar && /[bpmfdtnlgkhjqxzhchshrzcsyw]/i.test(nextChar) &&
                          !['g', 'n', 'r'].includes(char.toLowerCase());

    if (hasVowel && (nextIsCapital || (nextStartsNew && !vowels.test(nextChar)) || i === cleaned.length - 1)) {
      if (nextChar && ['n', 'g'].includes(nextChar.toLowerCase())) {
        const afterNext = cleaned[i + 2];
        if (nextChar.toLowerCase() === 'n') {
          if (afterNext === 'g') {
            current += nextChar + afterNext;
            i += 2;
          } else if (!afterNext || !vowels.test(afterNext)) {
            current += nextChar;
            i += 1;
          }
        }
      }
      if (current) {
        syllables.push(current);
        current = '';
      }
    }
  }
  if (current) syllables.push(current);

  if (syllables.length !== targetCount) {
    const words = pinyin.split(/\s+/);
    const result: string[] = [];
    for (const word of words) {
      let temp = '';
      for (let i = 0; i < word.length; i++) {
        if (i > 0 && word[i] === word[i].toUpperCase() && /[A-Z]/.test(word[i])) {
          if (temp) result.push(temp);
          temp = word[i];
        } else {
          temp += word[i];
        }
      }
      if (temp) result.push(temp);
    }
    if (result.length === targetCount) return result;
  }

  if (syllables.length !== targetCount && targetCount > 0) {
    const words = pinyin.split(/\s+/);
    if (words.length === targetCount) return words;
    while (syllables.length < targetCount) syllables.push('');
    return syllables.slice(0, targetCount);
  }

  return syllables;
}

/**
 * Split pinyin into syllables and pair with characters
 * Example: "shén de" + "神的" -> [{ char: '神', pinyin: 'shén' }, { char: '的', pinyin: 'de' }]
 * Example: "shǐzhě" + "使者" -> [{ char: '使', pinyin: 'shǐ' }, { char: '者', pinyin: 'zhě' }]
 */
function pairPinyinWithCharacters(word: string, pinyin: string): Array<{ char: string; pinyin: string }> {
  const chars = word.split('');
  const syllables = splitPinyinToSyllables(pinyin, chars.length);

  // Pair each character with its corresponding pinyin syllable
  return chars.map((char, i) => ({ char, pinyin: syllables[i] || '' }));
}

/**
 * AudioBar - A refined, contemplative audio player for scripture reading
 *
 * Design Philosophy: Contemplative Elegance
 * - Soft, rounded forms inspired by sacred illuminated manuscripts
 * - Vertical typography with pinyin floating above each character
 * - Warm color palette with subtle gold accents
 * - Gentle, meditative animations
 */
export const AudioBar = memo(function AudioBar({
  isPlaying,
  isAvailable,
  isLoading = false,
  currentTime,
  duration,
  playbackRate,
  currentVerseNumber,
  currentWord,
  currentPinyin,
  currentDefinition,
  isMusicPlaying = false,
  bookName,
  chapter,
  onTogglePlay,
  onSeek,
  onSetPlaybackRate,
  onClose,
  onPreviousChapter,
  onNextChapter,
  canGoPrevious = false,
  canGoNext = false,
  isAutoAdvancing = false,
  autoAdvanceCountdown = 0,
  onCancelAutoAdvance,
  autoScrollEnabled = true,
  onResumeAutoScroll,
}: AudioBarProps) {
  // Persist the last valid character-pinyin pairs to display during pauses
  const lastValidPairsRef = useRef<Array<{ char: string; pinyin: string }> | null>(null);

  // Clear persisted pairs when chapter/book changes
  useEffect(() => {
    lastValidPairsRef.current = null;
  }, [bookName, chapter]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Pair pinyin with characters for horizontal display
  // Keep showing last valid pairs during pauses/punctuation
  const characterPinyinPairs = useMemo(() => {
    if (!currentWord || !currentPinyin || PUNCTUATION.includes(currentWord)) {
      // During pauses or punctuation, keep showing the last valid pairs
      return lastValidPairsRef.current;
    }
    const pairs = pairPinyinWithCharacters(currentWord, currentPinyin);
    // Update the persisted pairs whenever we have valid content
    lastValidPairsRef.current = pairs;
    return pairs;
  }, [currentWord, currentPinyin]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAvailable || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    onSeek(percentage * duration);
  };

  // Auto-advance overlay
  const renderAutoAdvanceOverlay = () => {
    if (!isAutoAdvancing) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="absolute inset-0 flex items-center justify-center gap-3 rounded-2xl backdrop-blur-sm"
        style={{
          backgroundColor: 'rgba(var(--bg-primary-rgb, 255, 255, 255), 0.95)',
          zIndex: 10,
        }}
      >
        {/* Animated loading indicator */}
        <div className="flex items-center gap-2">
          <motion.div
            className="flex gap-1"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-1.5 rounded-full"
                style={{
                  height: 14,
                  backgroundColor: 'var(--accent)',
                }}
                animate={{ scaleY: [0.4, 1, 0.4] }}
                transition={{
                  duration: 0.7,
                  repeat: Infinity,
                  delay: i * 0.12,
                }}
              />
            ))}
          </motion.div>
          <span
            className="font-body text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            Next chapter in {autoAdvanceCountdown}s...
          </span>
        </div>

        {/* Cancel button */}
        <motion.button
          className="px-3 py-1.5 rounded-lg font-body text-xs"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          }}
          onClick={onCancelAutoAdvance}
          whileTap={{ scale: 0.95 }}
          whileHover={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          Cancel
        </motion.button>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="audio-bar"
        style={{
          position: 'fixed',
          top: 'calc(56px + env(safe-area-inset-top, 0px))',
          left: 0,
          right: 0,
          zIndex: 25,
          padding: '12px 0',
          background: 'linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="mx-auto max-w-2xl md:max-w-3xl lg:max-w-4xl px-4 flex items-center justify-center gap-3">
          <motion.div
            className="flex gap-1"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-1 rounded-full"
                style={{
                  height: 16,
                  backgroundColor: 'var(--accent)',
                  opacity: 0.6,
                }}
                animate={{ scaleY: [0.5, 1, 0.5] }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
              />
            ))}
          </motion.div>
          <span
            className="font-body text-sm"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Loading audio...
          </span>
        </div>
      </motion.div>
    );
  }

  if (!isAvailable) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="audio-bar"
      style={{
        position: 'fixed',
        top: 'calc(56px + env(safe-area-inset-top, 0px))',
        left: 0,
        right: 0,
        zIndex: 25,
        background: 'linear-gradient(180deg, var(--bg-primary) 0%, transparent 100%)',
        paddingBottom: 8,
      }}
    >
      {/* Centering wrapper with responsive padding */}
      <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto px-4">
        {/* Main content container */}
        <div
          className="relative"
          style={{
            background: 'var(--card-bg)',
            borderRadius: 20,
            padding: '14px 16px',
            boxShadow: '0 8px 32px -4px rgba(0,0,0,0.08), 0 4px 16px -4px rgba(0,0,0,0.04), inset 0 1px 0 0 rgba(255,255,255,0.05)',
            border: '1px solid var(--border-subtle)',
          }}
        >
        {/* Auto-advance overlay */}
        <AnimatePresence>
          {renderAutoAdvanceOverlay()}
        </AnimatePresence>

        {/* Book name and chapter header */}
        {bookName && chapter && (
          <div
            className="flex items-center justify-between mb-3 pb-2"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            {/* Left spacer for balance */}
            <div className="flex-shrink-0 w-8" />

            {/* Centered book/chapter info */}
            <div className="flex items-center gap-3 min-w-0 flex-1 justify-center">
              {/* Book icon with gentle glow */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 flex-shrink-0"
                style={{
                  color: 'var(--accent)',
                  opacity: 0.85,
                  filter: 'drop-shadow(0 0 4px var(--accent-light))'
                }}
              >
                <path d="M10.75 16.82A7.462 7.462 0 0115 15.5c.71 0 1.396.098 2.046.282A.75.75 0 0018 15.06v-11a.75.75 0 00-.546-.721A9.006 9.006 0 0015 3a8.963 8.963 0 00-4.25 1.065V16.82zM9.25 4.065A8.963 8.963 0 005 3c-.85 0-1.673.118-2.454.339A.75.75 0 002 4.06v11a.75.75 0 00.954.721A7.462 7.462 0 015 15.5c1.579 0 3.042.487 4.25 1.32V4.065z" />
              </svg>

              {/* English book name - larger and more prominent */}
              <motion.span
                className="font-body leading-tight truncate"
                style={{
                  color: 'var(--text-primary)',
                  fontSize: '1.125rem',
                  letterSpacing: '0.015em',
                  fontWeight: 400,
                }}
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                {bookName.english}
              </motion.span>

              {/* Chapter badge with soft glow - larger and more spacing */}
              <span
                className="flex-shrink-0 px-3 py-1 rounded-full font-body tabular-nums"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-subtle) 0%, var(--accent-subtle) 100%)',
                  color: 'var(--accent)',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px -2px var(--accent-light)',
                  fontSize: '0.8125rem',
                  letterSpacing: '0.01em',
                }}
              >
                {chapter}{currentVerseNumber ? `:${currentVerseNumber}` : ''}
              </span>
            </div>

            {/* Close button */}
            <motion.button
              className="flex-shrink-0 rounded-full p-1.5 -mr-1"
              style={{
                color: 'var(--text-tertiary)',
                background: 'transparent',
              }}
              onClick={onClose}
              whileTap={{ scale: 0.88 }}
              whileHover={{
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--bg-secondary)',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </motion.button>
          </div>
        )}

        {/* Main controls row */}
        <div className="flex items-center gap-4">
          {/* Compact control button group - tightly spaced */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Previous chapter button - compact, refined design */}
            <motion.button
              className="flex-shrink-0 flex items-center justify-center rounded-full relative overflow-hidden"
              style={{
                width: 32,
                height: 32,
                background: canGoPrevious
                  ? 'linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)'
                  : 'var(--bg-secondary)',
                color: canGoPrevious ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                border: '1px solid var(--border-subtle)',
                opacity: canGoPrevious ? 1 : 0.4,
                cursor: canGoPrevious ? 'pointer' : 'not-allowed',
                boxShadow: canGoPrevious ? '0 2px 8px -2px rgba(0,0,0,0.1)' : 'none',
              }}
              onClick={() => {
                if (!canGoPrevious) return;
                if (currentTime > 2000) {
                  onSeek(0);
                } else {
                  onPreviousChapter?.();
                }
              }}
              whileTap={canGoPrevious ? { scale: 0.9 } : {}}
              whileHover={canGoPrevious ? {
                scale: 1.05,
                boxShadow: '0 4px 12px -2px rgba(0,0,0,0.15)',
              } : {}}
              disabled={!canGoPrevious}
              title={currentTime > 2000 ? "Restart chapter" : "Previous chapter"}
            >
              {/* Soft inner glow on hover */}
              {canGoPrevious && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'radial-gradient(circle at center, var(--accent-light) 0%, transparent 70%)',
                    opacity: 0,
                  }}
                  whileHover={{ opacity: 0.15 }}
                  transition={{ duration: 0.2 }}
                />
              )}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-3.5 h-3.5 relative z-10"
              >
                <path d="M9.195 18.44c1.25.713 2.805-.19 2.805-1.629v-2.34l6.945 3.968c1.25.714 2.805-.188 2.805-1.628V8.688c0-1.44-1.555-2.342-2.805-1.628L12 11.03v-2.34c0-1.44-1.555-2.343-2.805-1.629l-7.108 4.062c-1.26.72-1.26 2.536 0 3.256l7.108 4.061z" />
              </svg>
            </motion.button>

            {/* Play/Pause button - compact yet prominent, with soft glow */}
            <motion.button
              className="flex-shrink-0 flex items-center justify-center rounded-full relative overflow-hidden"
              style={{
                width: 44,
                height: 44,
                background: isPlaying
                  ? 'linear-gradient(135deg, var(--accent) 0%, var(--accent) 100%)'
                  : 'linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)',
                color: isPlaying ? 'white' : 'var(--text-primary)',
                border: isPlaying ? 'none' : '1.5px solid var(--border)',
                boxShadow: isPlaying
                  ? '0 8px 24px -4px var(--accent-light), 0 4px 12px -2px var(--accent)'
                  : '0 4px 12px -2px rgba(0,0,0,0.08)',
              }}
              onClick={onTogglePlay}
              whileTap={{ scale: 0.9 }}
              whileHover={{
                scale: 1.08,
                boxShadow: isPlaying
                  ? '0 12px 32px -4px var(--accent-light), 0 6px 16px -2px var(--accent)'
                  : '0 6px 16px -2px rgba(0,0,0,0.12)',
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {/* Pulsing glow when playing */}
              {isPlaying && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'radial-gradient(circle at center, rgba(255,255,255,0.3) 0%, transparent 70%)',
                  }}
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.1, 0.3],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              <AnimatePresence mode="wait">
                {isPlaying ? (
                  <motion.svg
                    key="pause"
                    initial={{ scale: 0.7, opacity: 0, rotate: -10 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.7, opacity: 0, rotate: 10 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5 relative z-10"
                  >
                    <path
                      fillRule="evenodd"
                      d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
                      clipRule="evenodd"
                    />
                  </motion.svg>
                ) : (
                  <motion.svg
                    key="play"
                    initial={{ scale: 0.7, opacity: 0, rotate: 10 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.7, opacity: 0, rotate: -10 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5 ml-0.5 relative z-10"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                      clipRule="evenodd"
                    />
                  </motion.svg>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Next chapter button - compact */}
            <motion.button
              className="flex-shrink-0 flex items-center justify-center rounded-full relative overflow-hidden"
              style={{
                width: 32,
                height: 32,
                background: canGoNext
                  ? 'linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)'
                  : 'var(--bg-secondary)',
                color: canGoNext ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                border: '1px solid var(--border-subtle)',
                opacity: canGoNext ? 1 : 0.4,
                cursor: canGoNext ? 'pointer' : 'not-allowed',
                boxShadow: canGoNext ? '0 2px 8px -2px rgba(0,0,0,0.1)' : 'none',
              }}
              onClick={canGoNext ? onNextChapter : undefined}
              whileTap={canGoNext ? { scale: 0.9 } : {}}
              whileHover={canGoNext ? {
                scale: 1.05,
                boxShadow: '0 4px 12px -2px rgba(0,0,0,0.15)',
              } : {}}
              disabled={!canGoNext}
              title="Next chapter"
            >
              {canGoNext && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'radial-gradient(circle at center, var(--accent-light) 0%, transparent 70%)',
                    opacity: 0,
                  }}
                  whileHover={{ opacity: 0.15 }}
                  transition={{ duration: 0.2 }}
                />
              )}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-3.5 h-3.5 relative z-10"
              >
                <path d="M5.055 7.06c-1.25-.714-2.805.189-2.805 1.628v8.123c0 1.44 1.555 2.342 2.805 1.628L12 14.471v2.34c0 1.447 1.555 2.342 2.805 1.628l7.108-4.061c1.26-.72 1.26-2.536 0-3.256L14.805 7.06C13.555 6.346 12 7.25 12 8.688v2.34L5.055 7.06z" />
              </svg>
            </motion.button>

            {/* Music indicator - shows when ambient music is playing */}
            <AnimatePresence>
              {isMusicPlaying && (
                <motion.div
                  className="flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.2 }}
                  title="Ambient music playing"
                  style={{
                    width: 24,
                    height: 24,
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4"
                    style={{ color: 'var(--accent)' }}
                  >
                    <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
                    <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
                  </svg>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Auto-scroll toggle button - compact, part of the control group */}
            {onResumeAutoScroll && (
              <motion.button
                className="flex-shrink-0 flex items-center justify-center rounded-full relative overflow-hidden"
                style={{
                  width: 32,
                  height: 32,
                  background: autoScrollEnabled
                    ? 'linear-gradient(135deg, var(--accent-subtle) 0%, var(--accent-subtle) 100%)'
                    : 'linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)',
                  color: autoScrollEnabled ? 'var(--accent)' : 'var(--text-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: autoScrollEnabled
                    ? '0 2px 8px -2px var(--accent-light), 0 0 16px -4px var(--accent-light)'
                    : '0 2px 6px -2px rgba(0,0,0,0.08)',
                }}
                onClick={onResumeAutoScroll}
                whileTap={{ scale: 0.9 }}
                whileHover={{
                  scale: 1.05,
                  boxShadow: autoScrollEnabled
                    ? '0 4px 12px -2px var(--accent-light), 0 0 20px -4px var(--accent-light)'
                    : '0 4px 10px -2px rgba(0,0,0,0.12)',
                }}
                title={autoScrollEnabled ? "Sync scroll enabled - view follows narration" : "Sync scroll disabled - click to follow narration"}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                {/* Pulsing glow when enabled and playing */}
                {autoScrollEnabled && isPlaying && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'radial-gradient(circle at center, var(--accent-light) 0%, transparent 70%)',
                    }}
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.2, 0.05, 0.2],
                    }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                  />
                )}

                {/* Sync/target icon - compact size */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  className="w-3.5 h-3.5 relative z-10"
                >
                  {autoScrollEnabled ? (
                    // Active: Target/crosshair with pulsing center - "locked on" to current verse
                    <>
                      {/* Outer circle */}
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Inner circle */}
                      <circle
                        cx="12"
                        cy="12"
                        r="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Center dot - pulsing to show active sync */}
                      <motion.circle
                        cx="12"
                        cy="12"
                        r="1.5"
                        fill="currentColor"
                        initial={{ scale: 1, opacity: 1 }}
                        animate={{
                          scale: [1, 1.3, 1],
                          opacity: [1, 0.7, 1],
                        }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                      />
                      {/* Crosshair lines - subtle */}
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 2v3M12 19v3M2 12h3M19 12h3"
                        opacity={0.5}
                      />
                    </>
                  ) : (
                    // Disabled: Target with broken/disconnected crosshair - "not tracking"
                    <>
                      {/* Outer circle - dimmed */}
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.4}
                      />
                      {/* Inner circle - dimmed */}
                      <circle
                        cx="12"
                        cy="12"
                        r="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.4}
                      />
                      {/* Center dot - static, dimmed */}
                      <circle
                        cx="12"
                        cy="12"
                        r="1.5"
                        fill="currentColor"
                        opacity={0.3}
                      />
                      {/* Broken crosshair lines - gaps to show disconnection */}
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 2v2M12 20v2M2 12h2M20 12h2"
                        opacity={0.25}
                        strokeDasharray="2 2"
                      />
                    </>
                  )}
                </svg>
              </motion.button>
            )}
          </div>

          {/* Separator with soft gradient - provides clear visual separation */}
          <div
            className="w-px h-10 flex-shrink-0"
            style={{
              background: 'linear-gradient(180deg, transparent 0%, var(--border-subtle) 50%, transparent 100%)',
            }}
          />

          {/* Current word display - Vertical stacked layout with fixed height */}
          <div
            className="flex-1 flex flex-col justify-center min-w-0 py-1"
            style={{
              minHeight: '100px', // Fixed height to prevent collapse: ~16px pinyin + 30px char + 40px def + spacing
            }}
          >
            <AnimatePresence mode="popLayout">
              {characterPinyinPairs && (
                <motion.div
                  key={currentWord}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.1, ease: 'easeOut' }}
                  className="flex flex-col items-center gap-2"
                >
                  {/* Top row: Chinese characters with pinyin precisely centered above each */}
                  <div className="flex items-end gap-1.5">
                    {characterPinyinPairs.map((pair, i) => (
                      <div
                        key={i}
                        className="flex flex-col items-center"
                        style={{
                          minWidth: '1.75rem', // Ensure enough space for centering
                        }}
                      >
                        {/* Pinyin syllable - precisely centered above character */}
                        <span
                          className="font-body text-xs leading-none mb-1 whitespace-nowrap"
                          style={{
                            color: 'var(--text-tertiary)',
                            fontStyle: 'italic',
                            fontSize: '0.7rem',
                            opacity: 0.75,
                            letterSpacing: '0.01em',
                            textAlign: 'center',
                            width: '100%',
                          }}
                        >
                          {pair.pinyin}
                        </span>
                        {/* Chinese character */}
                        <span
                          className="font-chinese-serif leading-none"
                          style={{
                            fontSize: '1.875rem',
                            color: 'var(--accent)',
                            fontWeight: 500,
                            textShadow: isPlaying ? '0 0 20px var(--accent-light)' : 'none',
                            filter: isPlaying ? 'brightness(1.15)' : 'none',
                            textAlign: 'center',
                            width: '100%',
                          }}
                        >
                          {pair.char}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Bottom row: English definition with multiple lines - always reserve space */}
                  <div
                    className="font-body text-sm leading-relaxed text-center max-w-full px-2"
                    style={{
                      color: 'var(--text-secondary)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: '1.4',
                      minHeight: '2.8em', // Reserve space for 2 lines
                    }}
                  >
                    {currentDefinition || '\u00A0'}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Speed selector - vertical stepper with arrows */}
          <SpeedSelector
            playbackRate={playbackRate}
            onSetPlaybackRate={onSetPlaybackRate}
          />
        </div>

        {/* Bottom row: Progress bar with elegant styling */}
        <div className="mt-4 flex items-center gap-3">
          {/* Time elapsed */}
          <span
            className="font-body text-xs tabular-nums flex-shrink-0"
            style={{ color: 'var(--text-tertiary)', minWidth: 38 }}
          >
            {formatTime(currentTime)}
          </span>

          {/* Progress bar - thicker with smooth rounded design */}
          <div
            className="flex-1 relative h-2 rounded-full cursor-pointer overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)',
            }}
            onClick={handleProgressClick}
          >
            {/* Subtle tick marks */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background: 'repeating-linear-gradient(90deg, var(--border) 0px, var(--border) 1px, transparent 1px, transparent 12px)',
              }}
            />

            {/* Progress fill with gradient */}
            <motion.div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, var(--accent) 0%, var(--accent-light) 100%)`,
                boxShadow: isPlaying ? '0 0 16px var(--accent-light), 0 2px 8px var(--accent)' : '0 2px 6px var(--accent-light)',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />

            {/* Playhead with soft glow */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: 14,
                height: 14,
                background: 'radial-gradient(circle at center, white 0%, var(--accent) 100%)',
                left: `calc(${progress}% - 7px)`,
                boxShadow: '0 0 0 3px var(--accent-light), 0 3px 12px rgba(0,0,0,0.2)',
              }}
              animate={{
                scale: isPlaying ? [1, 1.15, 1] : 1,
              }}
              transition={{ duration: 1.5, repeat: isPlaying ? Infinity : 0 }}
            />
          </div>

          {/* Duration */}
          <span
            className="font-body text-xs tabular-nums flex-shrink-0"
            style={{ color: 'var(--text-tertiary)', minWidth: 38 }}
          >
            {formatTime(duration)}
          </span>
        </div>
        </div>
      </div>
    </motion.div>
  );
});
