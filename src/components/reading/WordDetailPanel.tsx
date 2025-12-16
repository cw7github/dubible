/**
 * WordDetailPanel - Enhanced word information display
 *
 * A beautiful "Scholarly Lexicon Entry" design showing:
 * - Chinese character with pinyin
 * - Part of speech with color-coded badge
 * - Character breakdown (etymology)
 * - Frequency indicator
 * - Usage notes
 * - Save to vocabulary action
 * - Audio pronunciation button
 */

import { memo, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SegmentedWord, VerseReference } from '../../types';
import { useVocabularyStore } from '../../stores';
import { getBookById } from '../../data/bible';
import { ttsService } from '../../services';
import { splitPinyinSyllables } from '../../utils/pinyin';

interface WordDetailPanelProps {
  word: SegmentedWord;
  verseRef: VerseReference | null;
  onClose: () => void;
}

// Part of speech display config
const POS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  n: { label: 'noun', color: '#5B7553', bg: '#E8F0E6' },
  v: { label: 'verb', color: '#8B5A3C', bg: '#F5EDE8' },
  adj: { label: 'adj', color: '#6B5B95', bg: '#EDE8F5' },
  adv: { label: 'adv', color: '#4A7C8F', bg: '#E6F0F3' },
  prep: { label: 'prep', color: '#7C6A5B', bg: '#F0EDE8' },
  conj: { label: 'conj', color: '#8B7355', bg: '#F5F0E8' },
  part: { label: 'particle', color: '#9B8579', bg: '#F5F0ED' },
  mw: { label: 'measure', color: '#6B8E7B', bg: '#E8F0EC' },
  pron: { label: 'pron', color: '#7B6B8E', bg: '#EFEBF5' },
  num: { label: 'num', color: '#5B7B8E', bg: '#E8EDF0' },
  prop: { label: 'name', color: '#8B6B53', bg: '#F5EDE6' },
};

// Frequency display config
const FREQ_CONFIG: Record<string, { label: string; icon: string }> = {
  common: { label: 'Common', icon: '●●●' },
  uncommon: { label: 'Uncommon', icon: '●●○' },
  rare: { label: 'Rare', icon: '●○○' },
  biblical: { label: 'Biblical', icon: '○○○' },
};

// Name type display
const NAME_TYPE_LABELS: Record<string, string> = {
  person: 'Person',
  place: 'Place',
  group: 'Group',
};

export const WordDetailPanel = memo(function WordDetailPanel({
  word,
  verseRef,
  onClose: _onClose,
}: WordDetailPanelProps) {
  void _onClose; // Reserved for future use
  const { addWord, removeWord, isWordSaved, getWordByChars } = useVocabularyStore();

  const isSaved = isWordSaved(word.chinese);
  const savedWord = getWordByChars(word.chinese);
  const book = verseRef ? getBookById(verseRef.bookId) : null;

  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false);
  // Enable audio when TTS service is available (Azure/OpenAI configured)
  const [isAudioAvailable] = useState(() => ttsService.isAvailable());
  const [showComingSoonTooltip, setShowComingSoonTooltip] = useState(false);
  const [clickedDisabled, setClickedDisabled] = useState(false);

  // Handle audio playback using TTS service
  const handlePlayAudio = useCallback(async () => {
    if (!word.chinese) return;

    try {
      await ttsService.speak({
        text: word.chinese,
        lang: 'zh-TW', // Use Traditional Chinese (Taiwan Mandarin)
        onStart: () => setIsPlaying(true),
        onEnd: () => setIsPlaying(false),
        onError: () => {
          console.error('TTS playback error for:', word.chinese);
          setIsPlaying(false);
        },
      });
    } catch (error) {
      console.error('Audio playback failed:', error);
      setIsPlaying(false);
    }
  }, [word.chinese]);

  // Cleanup: stop audio when component unmounts
  useEffect(() => {
    return () => {
      ttsService.stop();
    };
  }, []);

  const handleSaveToggle = useCallback(() => {
    if (!verseRef) return;

    if (isSaved && savedWord) {
      removeWord(savedWord.id);
    } else {
      addWord(
        word.chinese,
        word.pinyin,
        word.definition || '',
        verseRef,
        word.partOfSpeech,
        word.hskLevel ?? undefined
      );
    }
  }, [word, verseRef, isSaved, savedWord, addWord, removeWord]);

  const posConfig = word.partOfSpeech ? POS_CONFIG[word.partOfSpeech] : null;
  const freqConfig = word.freq ? FREQ_CONFIG[word.freq] : null;
  const hasBreakdown = word.breakdown && word.breakdown.length > 1;
  const isNameEntry = word.isName;

  return (
    <motion.div
      className="px-4 py-3"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {/* Compact header row with badges */}
      <div className="flex items-center justify-between gap-3 mb-2">
        {/* Left: Badges (horizontal layout) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Biblical Name badge */}
          {isNameEntry && (
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-medium tracking-wide"
              style={{
                backgroundColor: '#F5EBE0',
                color: '#9B7B5B',
              }}
            >
              Biblical Name
            </span>
          )}

          {/* Name type badge (Person/Place/Group) */}
          {word.nameType && (
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-medium tracking-wide"
              style={{
                backgroundColor: word.nameType === 'person' ? '#F5EBE0' : word.nameType === 'place' ? '#E8F0E6' : '#EDE8F5',
                color: word.nameType === 'person' ? '#8B6B53' : word.nameType === 'place' ? '#5B7553' : '#6B5B95',
              }}
            >
              {NAME_TYPE_LABELS[word.nameType]}
            </span>
          )}

          {/* Part of speech badge */}
          {posConfig && !isNameEntry && (
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-medium tracking-wide"
              style={{
                backgroundColor: posConfig.bg,
                color: posConfig.color,
              }}
            >
              {posConfig.label}
            </span>
          )}

          {/* HSK badge */}
          {word.hskLevel && (
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-medium tracking-wide"
              style={{
                backgroundColor: 'var(--accent-subtle)',
                color: 'var(--accent)',
              }}
            >
              HSK {word.hskLevel}
            </span>
          )}
        </div>

        {/* Right: Verse reference */}
        {verseRef && book && (
          <p
            className="font-body text-[9px] uppercase tracking-wider flex-shrink-0"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {book.name.english} {verseRef.chapter}:{verseRef.verse}
          </p>
        )}
      </div>

      {/* Main content row - compact horizontal layout */}
      <div className="flex items-start gap-3">
        {/* Chinese character with pinyin and audio button - compact */}
        <div className="flex flex-col items-center flex-shrink-0">
          {/* Pinyin centered above each character */}
          <div className="flex items-center gap-2">
            <div className="flex">
              {(() => {
                const chars = [...word.chinese];
                const syllables = splitPinyinSyllables(word.pinyin, chars.length);
                return chars.map((char, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <span
                      className="font-body text-[10px] tracking-wide italic leading-tight mb-0.5 text-center"
                      style={{ color: 'var(--text-secondary)', opacity: 0.75, minWidth: '1.5rem' }}
                    >
                      {syllables[idx] || ''}
                    </span>
                    <span
                      className="font-chinese-serif text-2xl leading-none"
                      style={{
                        color: isNameEntry ? '#8B6B53' : 'var(--text-primary)',
                      }}
                    >
                      {char}
                    </span>
                  </div>
                ));
              })()}
            </div>

            {/* Audio playback button - Coming Soon state */}
            <div className="relative">
              <motion.button
                onClick={() => {
                  if (!isAudioAvailable) {
                    setClickedDisabled(true);
                    setShowComingSoonTooltip(true);
                    setTimeout(() => {
                      setClickedDisabled(false);
                      setShowComingSoonTooltip(false);
                    }, 2800);
                  } else {
                    handlePlayAudio();
                  }
                }}
                onHoverStart={() => !isAudioAvailable && setShowComingSoonTooltip(true)}
                onHoverEnd={() => !isAudioAvailable && setShowComingSoonTooltip(false)}
                className="rounded-full p-1.5 cursor-pointer relative overflow-hidden"
                style={{
                  backgroundColor: isAudioAvailable
                    ? (isPlaying ? 'var(--accent)' : 'var(--accent-subtle)')
                    : 'rgba(150, 140, 130, 0.08)',
                  color: isAudioAvailable
                    ? (isPlaying ? 'white' : 'var(--accent)')
                    : 'rgba(130, 120, 110, 0.35)',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  border: !isAudioAvailable ? '1px solid rgba(150, 140, 130, 0.12)' : 'none',
                  boxShadow: !isAudioAvailable ? '0 0 12px rgba(150, 140, 130, 0.03)' : 'none',
                }}
                whileTap={isAudioAvailable ? { scale: 0.9 } : { scale: 0.98 }}
                whileHover={isAudioAvailable ? { scale: 1.05 } : {}}
                aria-label={isAudioAvailable ? "Play pronunciation" : "Audio coming soon"}
                disabled={!isAudioAvailable && isPlaying}
                animate={!isAudioAvailable ? {
                  opacity: [0.6, 0.8, 0.6],
                } : {}}
                transition={!isAudioAvailable ? {
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                } : {}}
              >
                {/* Subtle shimmer effect for disabled state */}
                {!isAudioAvailable && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'linear-gradient(135deg, transparent 30%, rgba(255, 255, 255, 0.15) 50%, transparent 70%)',
                      backgroundSize: '200% 200%',
                    }}
                    animate={{
                      backgroundPosition: ['0% 0%', '200% 200%'],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                )}

                {/* Elegant ripple effect on click - manuscript-inspired */}
                <AnimatePresence>
                  {clickedDisabled && !isAudioAvailable && (
                    <>
                      {/* Subtle expanding ring */}
                      <motion.div
                        className="absolute inset-0 rounded-full pointer-events-none"
                        style={{
                          border: '2px solid rgba(139, 90, 43, 0.25)',
                          boxShadow: '0 0 12px rgba(139, 90, 43, 0.15)',
                        }}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 2.2, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: 1.2,
                          ease: [0.16, 1, 0.3, 1] // Smooth easeOutExpo
                        }}
                      />
                      {/* Inner glow pulse */}
                      <motion.div
                        className="absolute inset-0 rounded-full pointer-events-none"
                        style={{
                          backgroundColor: 'rgba(139, 90, 43, 0.12)',
                        }}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: [0, 0.5, 0], scale: 1 }}
                        transition={{
                          duration: 0.8,
                          ease: "easeOut"
                        }}
                      />
                    </>
                  )}
                </AnimatePresence>

                {/* Speaker icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5 relative z-10"
                  style={{
                    filter: !isAudioAvailable ? 'drop-shadow(0 0 2px rgba(150, 140, 130, 0.1))' : 'none'
                  }}
                >
                  {isPlaying ? (
                    // Playing state: speaker with three sound waves
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </>
                  ) : (
                    // Idle/disabled state: speaker with muted wave
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path
                        d="M15.54 8.46a5 5 0 0 1 0 7.07"
                        opacity={isAudioAvailable ? "0.5" : "0.25"}
                      />
                    </>
                  )}
                </svg>
              </motion.button>

              {/* Coming Soon Tooltip - Elegant appearance with click enhancement */}
              <AnimatePresence>
                {showComingSoonTooltip && !isAudioAvailable && (
                  <motion.div
                    initial={{ opacity: 0, y: 5, scale: 0.9 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: clickedDisabled ? [1, 1.05, 1] : 1
                    }}
                    exit={{ opacity: 0, y: 5, scale: 0.9 }}
                    transition={{
                      type: "spring",
                      damping: 20,
                      stiffness: 300,
                      opacity: { duration: 0.2 },
                      scale: clickedDisabled ? {
                        duration: 0.6,
                        ease: [0.16, 1, 0.3, 1],
                        times: [0, 0.4, 1]
                      } : {}
                    }}
                    className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none z-50"
                  >
                    <motion.div
                      className="px-3 py-1.5 rounded-lg shadow-lg relative"
                      style={{
                        backgroundColor: clickedDisabled
                          ? 'rgba(139, 90, 43, 0.96)'
                          : 'rgba(80, 70, 60, 0.96)',
                        backdropFilter: 'blur(8px)',
                        border: clickedDisabled
                          ? '1px solid rgba(212, 184, 150, 0.3)'
                          : '1px solid rgba(150, 140, 130, 0.2)',
                        boxShadow: clickedDisabled
                          ? '0 6px 20px rgba(139, 90, 43, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.08) inset, 0 0 20px rgba(139, 90, 43, 0.15)'
                          : '0 4px 16px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
                        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      animate={clickedDisabled ? {
                        boxShadow: [
                          '0 6px 20px rgba(139, 90, 43, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.08) inset, 0 0 20px rgba(139, 90, 43, 0.15)',
                          '0 6px 20px rgba(139, 90, 43, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.12) inset, 0 0 30px rgba(139, 90, 43, 0.2)',
                          '0 6px 20px rgba(139, 90, 43, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.08) inset, 0 0 20px rgba(139, 90, 43, 0.15)',
                        ]
                      } : {}}
                      transition={{
                        duration: 1.2,
                        ease: "easeInOut"
                      }}
                    >
                      {/* Elegant tooltip arrow */}
                      <div
                        className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45"
                        style={{
                          backgroundColor: clickedDisabled
                            ? 'rgba(139, 90, 43, 0.96)'
                            : 'rgba(80, 70, 60, 0.96)',
                          borderTop: clickedDisabled
                            ? '1px solid rgba(212, 184, 150, 0.3)'
                            : '1px solid rgba(150, 140, 130, 0.2)',
                          borderLeft: clickedDisabled
                            ? '1px solid rgba(212, 184, 150, 0.3)'
                            : '1px solid rgba(150, 140, 130, 0.2)',
                          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      />

                      {/* Manuscript-inspired ornamental flourish on click */}
                      <AnimatePresence>
                        {clickedDisabled && (
                          <motion.div
                            className="absolute -left-2 top-1/2 -translate-y-1/2"
                            initial={{ opacity: 0, x: -4, scale: 0.8 }}
                            animate={{ opacity: [0, 1, 0.8], x: 0, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                              color: 'rgba(245, 240, 235, 0.6)',
                              fontSize: '8px',
                              fontFamily: "'Cormorant Garamond', Georgia, serif",
                            }}
                          >
                            ✦
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <p
                        className="relative font-medium tracking-wide"
                        style={{
                          color: clickedDisabled
                            ? 'rgba(255, 250, 240, 0.98)'
                            : 'rgba(245, 240, 235, 0.95)',
                          fontFamily: clickedDisabled
                            ? "'Cormorant Garamond', Georgia, serif"
                            : "ui-sans-serif, system-ui, -apple-system, sans-serif",
                          fontSize: clickedDisabled ? '11px' : '10px',
                          letterSpacing: clickedDisabled ? '0.04em' : '0.03em',
                          fontStyle: clickedDisabled ? 'italic' : 'normal',
                          textShadow: clickedDisabled
                            ? '0 1px 3px rgba(0, 0, 0, 0.3), 0 0 8px rgba(255, 215, 180, 0.3)'
                            : '0 1px 2px rgba(0, 0, 0, 0.2)',
                          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      >
                        {clickedDisabled ? 'Audio arrives soon...' : 'Audio Coming Soon'}
                      </p>

                      {/* Manuscript-inspired ornamental flourish on click (right side) */}
                      <AnimatePresence>
                        {clickedDisabled && (
                          <motion.div
                            className="absolute -right-2 top-1/2 -translate-y-1/2"
                            initial={{ opacity: 0, x: 4, scale: 0.8 }}
                            animate={{ opacity: [0, 1, 0.8], x: 0, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                              color: 'rgba(245, 240, 235, 0.6)',
                              fontSize: '8px',
                              fontFamily: "'Cormorant Garamond', Georgia, serif",
                            }}
                          >
                            ✦
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Definition and optional extras */}
        <div className="flex-1 min-w-0">
          {/* Definition - primary content */}
          <p
            className="font-body leading-snug"
            style={{
              color: 'var(--text-primary)',
              lineHeight: '1.5',
              fontSize: 'var(--english-base, 1rem)'
            }}
          >
            {word.definition || 'No definition available'}
          </p>

          {/* Character breakdown - compact inline style */}
          {hasBreakdown && (() => {
            // Split pinyin into syllables for each character
            const pinyinSyllables = splitPinyinSyllables(word.pinyin, word.breakdown!.length);

            return (
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <span
                  className="text-[8px] uppercase tracking-widest font-medium"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Parts:
                </span>
                {word.breakdown!.map((char, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                    }}
                  >
                    {/* Character with pinyin above it */}
                    <span className="inline-flex flex-col items-center">
                      <span
                        className="text-[9px] italic leading-tight mb-0.5"
                        style={{ color: 'var(--text-secondary)', opacity: 0.75 }}
                      >
                        {pinyinSyllables[idx] || ''}
                      </span>
                      <span
                        className="font-chinese-serif text-sm"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {char.c}
                      </span>
                    </span>
                    {/* Meaning to the side */}
                    <span
                      className="text-[9px]"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {char.m}
                    </span>
                  </span>
                ))}
              </div>
            );
          })()}

          {/* Usage note - compact */}
          {word.note && (
            <div
              className="mt-2 rounded px-2 py-1.5 border-l-2"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderLeftColor: 'var(--accent)',
              }}
            >
              <p
                className="font-body text-[11px] italic leading-snug"
                style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}
              >
                {word.note}
              </p>
            </div>
          )}

          {/* Frequency indicator - inline at bottom */}
          {freqConfig && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className="text-[9px] tracking-wide"
                style={{ color: 'var(--text-tertiary)', letterSpacing: '0.5px' }}
              >
                {freqConfig.icon}
              </span>
              <span
                className="text-[8px] uppercase tracking-wider"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {freqConfig.label}
              </span>
            </div>
          )}
        </div>

        {/* Save button - compact */}
        <motion.button
          onClick={handleSaveToggle}
          className="touch-feedback rounded-full p-2 flex-shrink-0 self-start"
          style={{
            backgroundColor: isSaved ? 'var(--accent)' : 'var(--bg-secondary)',
            color: isSaved ? 'white' : 'var(--text-tertiary)',
          }}
          whileTap={{ scale: 0.9 }}
          aria-label={isSaved ? 'Remove from vocabulary' : 'Save to vocabulary'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={isSaved ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={2}
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
        </motion.button>
      </div>
    </motion.div>
  );
});

export default WordDetailPanel;
