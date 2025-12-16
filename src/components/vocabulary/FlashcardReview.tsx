import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVocabularyStore } from '../../stores';
import { getBookById } from '../../data/bible';
import { ttsService, type VoiceGender } from '../../services';
import type { SavedWord, ReviewResult } from '../../types';

interface FlashcardReviewProps {
  words: SavedWord[];
  onClose: () => void;
  onComplete: () => void;
}

export const FlashcardReview = memo(function FlashcardReview({
  words,
  onClose,
  onComplete,
}: FlashcardReviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);

  const { reviewWord } = useVocabularyStore();

  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioAvailable] = useState(() => ttsService.isAvailable());
  const [showComingSoonTooltip, setShowComingSoonTooltip] = useState(false);
  const [clickedDisabled, setClickedDisabled] = useState(false);

  // Voice toggle state - alternates between male and female on each tap
  const [currentVoice, setCurrentVoice] = useState<VoiceGender>('male');
  const previousWordRef = useRef<string>('');

  // Prevent body scroll when flashcard review is active
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  const currentWord = words[currentIndex];

  // Reset voice to male when word changes
  useEffect(() => {
    if (currentWord && previousWordRef.current !== currentWord.chinese) {
      setCurrentVoice('male');
      previousWordRef.current = currentWord.chinese;
    }
  }, [currentWord]);

  // Cleanup: stop audio when component unmounts
  useEffect(() => {
    return () => {
      ttsService.stop();
    };
  }, []);
  const progress = ((currentIndex + 1) / words.length) * 100;
  const remaining = words.length - currentIndex;

  const handleReveal = () => {
    setIsRevealed(true);
  };

  // Handle audio playback using TTS service with voice toggle
  const handlePlayAudio = useCallback(async () => {
    if (!currentWord?.chinese) return;

    // Determine which voice to use for this play
    const voiceToUse = currentVoice;

    // Toggle voice for next tap
    setCurrentVoice(prev => prev === 'male' ? 'female' : 'male');

    try {
      await ttsService.speak({
        text: currentWord.chinese,
        lang: 'zh-TW', // Use Traditional Chinese (Taiwan Mandarin)
        voice: voiceToUse,
        onStart: () => setIsPlaying(true),
        onEnd: () => setIsPlaying(false),
        onError: () => {
          console.error('TTS playback error for:', currentWord.chinese);
          setIsPlaying(false);
        },
      });
    } catch (error) {
      console.error('Audio playback failed:', error);
      setIsPlaying(false);
    }
  }, [currentWord?.chinese, currentVoice]);

  const handleReview = useCallback(
    (result: ReviewResult) => {
      if (!currentWord) return;

      setDirection(result === 'good' ? 'right' : 'left');

      // Review the word
      reviewWord(currentWord.id, result);

      // Move to next card after animation
      setTimeout(() => {
        if (currentIndex < words.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setIsRevealed(false);
          setDirection(null);
        } else {
          onComplete();
        }
      }, 200);
    },
    [currentWord, currentIndex, words.length, reviewWord, onComplete]
  );

  const book = currentWord ? getBookById(currentWord.sourceVerse.bookId) : null;

  if (!currentWord) {
    return (
      <div
        className="fixed inset-0 z-48 flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <motion.div
          className="text-center px-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Decorative flourish */}
          <motion.div
            className="mx-auto mb-6 flex items-center justify-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div
              className="h-px w-8"
              style={{ background: 'linear-gradient(90deg, transparent, var(--border))' }}
            />
            <div
              className="h-1.5 w-1.5 rotate-45"
              style={{ backgroundColor: 'var(--accent-light)', opacity: 0.6 }}
            />
            <div
              className="h-px w-8"
              style={{ background: 'linear-gradient(90deg, var(--border), transparent)' }}
            />
          </motion.div>

          <p
            className="font-display text-lg"
            style={{ color: 'var(--text-secondary)', letterSpacing: '0.05em' }}
          >
            No words to review
          </p>

          <motion.button
            className="touch-feedback mt-6 rounded-full px-6 py-2.5 font-body text-sm tracking-wide"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'white',
            }}
            onClick={onClose}
            whileTap={{ scale: 0.95 }}
          >
            Go Back
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-48 flex flex-col"
      style={{ backgroundColor: 'var(--bg-primary)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <header
        className="safe-area-top"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <motion.button
            className="touch-feedback flex items-center gap-2 rounded-lg p-2"
            style={{ color: 'var(--text-tertiary)' }}
            onClick={onClose}
            whileTap={{ scale: 0.95 }}
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

          <h1
            className="font-display text-base tracking-wide"
            style={{ color: 'var(--text-primary)', letterSpacing: '0.1em' }}
          >
            REVIEW
          </h1>

          <span
            className="font-body text-sm italic"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {remaining} remaining
          </span>
        </div>

        {/* Progress bar - elegant thin line */}
        <div
          className="h-px"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <motion.div
            className="h-full"
            style={{
              backgroundColor: 'var(--accent)',
              boxShadow: '0 0 8px var(--accent-light)',
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </header>

      {/* Card area */}
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentWord.id}
            className="w-full max-w-sm"
            initial={{
              opacity: 0,
              scale: 0.95,
              x: direction === 'left' ? -50 : direction === 'right' ? 50 : 0,
            }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{
              opacity: 0,
              scale: 0.95,
              x: direction === 'left' ? -100 : direction === 'right' ? 100 : 0,
            }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {/* Flashcard */}
            <motion.div
              className="rounded-3xl px-10 py-12 shadow-elevated"
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border)',
                boxShadow: '0 8px 32px var(--shadow-elevated), 0 0 0 1px var(--border-subtle)',
              }}
              onClick={!isRevealed ? handleReveal : undefined}
              whileTap={!isRevealed ? { scale: 0.98 } : {}}
            >
              {/* Chinese word */}
              <div className="text-center">
                <motion.h2
                  className="font-chinese-serif text-6xl"
                  style={{
                    color: 'var(--text-primary)',
                    letterSpacing: '0.05em',
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {currentWord.chinese}
                </motion.h2>

                {/* Audio playback button */}
                <motion.div
                  className="relative flex justify-center mt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card reveal when clicking audio
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
                    onMouseEnter={() => !isAudioAvailable && setShowComingSoonTooltip(true)}
                    onMouseLeave={() => !isAudioAvailable && setShowComingSoonTooltip(false)}
                    className="rounded-full p-3 cursor-pointer relative overflow-hidden"
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

                    {/* Elegant ripple effect on click */}
                    <AnimatePresence>
                      {clickedDisabled && !isAudioAvailable && (
                        <>
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
                              ease: [0.16, 1, 0.3, 1]
                            }}
                          />
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
                      className="h-5 w-5 relative z-10"
                      style={{
                        filter: !isAudioAvailable ? 'drop-shadow(0 0 2px rgba(150, 140, 130, 0.1))' : 'none'
                      }}
                    >
                      {isPlaying ? (
                        <>
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                        </>
                      ) : (
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

                  {/* Coming Soon Tooltip */}
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
                        className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none z-50"
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
                        >
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
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Revealed content */}
                <AnimatePresence>
                  {isRevealed && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <p
                        className="mt-6 font-body text-[22px] italic"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {currentWord.pinyin}
                      </p>

                      {/* Decorative divider */}
                      <motion.div
                        className="mx-auto my-8 h-px w-20"
                        style={{
                          background:
                            'linear-gradient(90deg, transparent, var(--accent-light), transparent)',
                        }}
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.3 }}
                      />

                      <p
                        className="font-body text-xl leading-relaxed"
                        style={{ color: 'var(--text-primary)', lineHeight: '1.75' }}
                      >
                        {currentWord.definition}
                      </p>

                      {currentWord.partOfSpeech && (
                        <p
                          className="mt-3 font-body text-sm italic"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {currentWord.partOfSpeech}
                        </p>
                      )}

                      {/* Source verse */}
                      <motion.div
                        className="mt-6 rounded-xl px-4 py-3"
                        style={{ backgroundColor: 'var(--bg-secondary)' }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <p
                          className="font-body text-xs italic tracking-wide"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {book?.name.english} {currentWord.sourceVerse.chapter}:
                          {currentWord.sourceVerse.verse}
                        </p>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!isRevealed && (
                  <motion.p
                    className="mt-10 font-body text-sm tracking-wide"
                    style={{ color: 'var(--text-tertiary)' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    Tap to reveal
                  </motion.p>
                )}
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div
        className="safe-area-bottom"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <div className="flex gap-4 p-4">
          {isRevealed ? (
            <>
              <motion.button
                className="touch-feedback flex flex-1 flex-col items-center gap-2 rounded-2xl py-5"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                }}
                onClick={() => handleReview('again')}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth={1.5}
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
                <span className="font-body text-sm tracking-wide">Still Learning</span>
              </motion.button>

              <motion.button
                className="touch-feedback flex flex-1 flex-col items-center gap-2 rounded-2xl py-5"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'white',
                }}
                onClick={() => handleReview('good')}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-body text-sm tracking-wide">Know It</span>
              </motion.button>
            </>
          ) : (
            <motion.button
              className="touch-feedback flex-1 rounded-2xl py-5 text-center"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'white',
              }}
              onClick={handleReveal}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="font-display text-sm tracking-widest uppercase">
                Show Answer
              </span>
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
});
