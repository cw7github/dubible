import { memo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GestureTutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

// Gesture steps with bilingual content
const GESTURES = [
  {
    id: 'hold',
    titleChinese: '按住',
    titlePinyin: 'àn zhù',
    titleEnglish: 'Hold',
    descriptionChinese: '按住任何中文字詞',
    descriptionEnglish: 'to see its definition',
    duration: '300ms',
    icon: 'hold',
  },
  {
    id: 'double-tap',
    titleChinese: '雙擊',
    titlePinyin: 'shuāng jī',
    titleEnglish: 'Double Tap',
    descriptionChinese: '快速點擊經文兩次',
    descriptionEnglish: 'to see English translation',
    duration: '300ms',
    icon: 'double-tap',
  },
  {
    id: 'scroll',
    titleChinese: '滑動',
    titlePinyin: 'huá dòng',
    titleEnglish: 'Scroll',
    descriptionChinese: '滑動瀏覽經文內容',
    descriptionEnglish: 'to navigate through the passage',
    duration: '',
    icon: 'scroll',
  },
];

// Animated hand SVG for "hold" gesture
const HoldAnimation = () => (
  <svg viewBox="0 0 120 120" className="gesture-hand">
    {/* Finger pressing down */}
    <motion.g
      initial={{ y: -10 }}
      animate={{ y: [0, 8, 8, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', times: [0, 0.2, 0.8, 1] }}
    >
      {/* Finger */}
      <ellipse cx="60" cy="50" rx="16" ry="22" fill="var(--text-secondary)" opacity="0.15" />
      <ellipse cx="60" cy="48" rx="14" ry="20" fill="var(--bg-primary)" stroke="var(--accent)" strokeWidth="2" />
      {/* Fingernail hint */}
      <path d="M52 38 Q60 32 68 38" fill="none" stroke="var(--accent)" strokeWidth="1.5" opacity="0.5" />
    </motion.g>

    {/* Ripple effect on press */}
    <motion.circle
      cx="60"
      cy="75"
      r="0"
      fill="none"
      stroke="var(--accent)"
      strokeWidth="2"
      initial={{ r: 0, opacity: 0.8 }}
      animate={{ r: [0, 25, 30], opacity: [0.8, 0.3, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut', delay: 0.2 }}
    />
    <motion.circle
      cx="60"
      cy="75"
      r="0"
      fill="none"
      stroke="var(--accent)"
      strokeWidth="1.5"
      initial={{ r: 0, opacity: 0.6 }}
      animate={{ r: [0, 18, 22], opacity: [0.6, 0.2, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut', delay: 0.35 }}
    />

    {/* Target word indicator */}
    <motion.rect
      x="35"
      y="85"
      width="50"
      height="18"
      rx="3"
      fill="var(--accent)"
      initial={{ opacity: 0.1 }}
      animate={{ opacity: [0.1, 0.25, 0.25, 0.1] }}
      transition={{ duration: 2.5, repeat: Infinity, times: [0, 0.2, 0.8, 1] }}
    />
    <text x="60" y="98" textAnchor="middle" fontSize="11" fill="var(--text-primary)" fontFamily="Noto Serif TC">
      神
    </text>
  </svg>
);

// Animated hand SVG for "double-tap" gesture
const DoubleTapAnimation = () => (
  <svg viewBox="0 0 120 120" className="gesture-hand">
    {/* Finger tapping twice */}
    <motion.g
      initial={{ y: 0 }}
      animate={{ y: [0, 12, 0, 12, 0, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', times: [0, 0.15, 0.3, 0.45, 0.6, 1] }}
    >
      <ellipse cx="60" cy="50" rx="16" ry="22" fill="var(--text-secondary)" opacity="0.15" />
      <ellipse cx="60" cy="48" rx="14" ry="20" fill="var(--bg-primary)" stroke="var(--accent)" strokeWidth="2" />
      <path d="M52 38 Q60 32 68 38" fill="none" stroke="var(--accent)" strokeWidth="1.5" opacity="0.5" />
    </motion.g>

    {/* First tap ripple */}
    <motion.circle
      cx="60"
      cy="75"
      fill="none"
      stroke="var(--accent)"
      strokeWidth="2"
      initial={{ r: 0, opacity: 0 }}
      animate={{ r: [0, 20, 25], opacity: [0, 0.6, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', times: [0, 0.15, 0.35], delay: 0.1 }}
    />

    {/* Second tap ripple */}
    <motion.circle
      cx="60"
      cy="75"
      fill="none"
      stroke="var(--accent)"
      strokeWidth="2"
      initial={{ r: 0, opacity: 0 }}
      animate={{ r: [0, 20, 25], opacity: [0, 0.6, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', times: [0, 0.15, 0.35], delay: 0.4 }}
    />

    {/* Verse text */}
    <motion.g
      initial={{ opacity: 0.6 }}
      animate={{ opacity: [0.6, 0.9, 0.9, 0.6] }}
      transition={{ duration: 2, repeat: Infinity, times: [0, 0.5, 0.7, 1] }}
    >
      <rect x="20" y="85" width="80" height="20" rx="3" fill="var(--accent)" opacity="0.15" />
      <text x="60" y="99" textAnchor="middle" fontSize="9" fill="var(--text-secondary)" fontFamily="Noto Serif TC">
        神愛世人
      </text>
    </motion.g>
  </svg>
);

// Animated hand SVG for "scroll" gesture
const ScrollAnimation = () => (
  <svg viewBox="0 0 120 120" className="gesture-hand">
    {/* Finger scrolling down */}
    <motion.g
      initial={{ y: 0 }}
      animate={{ y: [0, 30, 30, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', times: [0, 0.4, 0.6, 1] }}
    >
      <ellipse cx="60" cy="35" rx="16" ry="22" fill="var(--text-secondary)" opacity="0.15" />
      <ellipse cx="60" cy="33" rx="14" ry="20" fill="var(--bg-primary)" stroke="var(--accent)" strokeWidth="2" />
      <path d="M52 23 Q60 17 68 23" fill="none" stroke="var(--accent)" strokeWidth="1.5" opacity="0.5" />
    </motion.g>

    {/* Trail lines showing scroll direction */}
    <motion.path
      d="M60 60 L60 95"
      stroke="var(--accent)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray="4 4"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 0.6, 0.6, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, times: [0, 0.4, 0.6, 1] }}
    />

    {/* Arrow head */}
    <motion.path
      d="M54 88 L60 96 L66 88"
      stroke="var(--accent)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.6, 0.6, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, times: [0, 0.4, 0.6, 1] }}
    />
  </svg>
);

const GestureIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'hold':
      return <HoldAnimation />;
    case 'double-tap':
      return <DoubleTapAnimation />;
    case 'scroll':
      return <ScrollAnimation />;
    default:
      return null;
  }
};

export const GestureTutorial = memo(function GestureTutorial({
  isOpen,
  onClose,
}: GestureTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);

  const handleNext = useCallback(() => {
    if (currentStep < GESTURES.length - 1) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    } else {
      onClose();
    }
  }, [currentStep, onClose]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    onClose();
  }, [onClose]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setDirection(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  const currentGesture = GESTURES[currentStep];

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0,
    }),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="gesture-tutorial-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Decorative background pattern */}
          <div className="gesture-tutorial-pattern" />

          {/* Main content */}
          <div className="gesture-tutorial-content">
            {/* Header with ornamental line */}
            <motion.div
              className="gesture-tutorial-header"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="gesture-ornament">
                <span className="gesture-ornament-line" />
                <span className="gesture-ornament-diamond" />
                <span className="gesture-ornament-line" />
              </div>
              <h2 className="gesture-tutorial-title">
                <span className="font-chinese-serif">手勢指南</span>
                <span className="gesture-title-divider">·</span>
                <span>Gestures</span>
              </h2>
            </motion.div>

            {/* Gesture card */}
            <div className="gesture-card-container">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentStep}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="gesture-card"
                >
                  {/* Gesture animation */}
                  <div className="gesture-icon-wrapper">
                    <GestureIcon type={currentGesture.icon} />
                  </div>

                  {/* Gesture title */}
                  <div className="gesture-card-title">
                    <span className="gesture-chinese">{currentGesture.titleChinese}</span>
                    <span className="gesture-pinyin">{currentGesture.titlePinyin}</span>
                    <span className="gesture-english">{currentGesture.titleEnglish}</span>
                  </div>

                  {/* Description */}
                  <p className="gesture-description">
                    <span className="font-chinese-serif">{currentGesture.descriptionChinese}</span>
                    <br />
                    <span className="gesture-desc-english">{currentGesture.descriptionEnglish}</span>
                  </p>

                  {/* Duration badge */}
                  {currentGesture.duration && (
                    <div className="gesture-duration">
                      {currentGesture.duration}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Progress dots */}
            <div className="gesture-progress">
              {GESTURES.map((_, index) => (
                <motion.button
                  key={index}
                  className={`gesture-dot ${index === currentStep ? 'active' : ''}`}
                  onClick={() => {
                    setDirection(index > currentStep ? 1 : -1);
                    setCurrentStep(index);
                  }}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="gesture-nav">
              {currentStep > 0 ? (
                <motion.button
                  className="gesture-nav-btn secondary"
                  onClick={handlePrev}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  <span>Back</span>
                </motion.button>
              ) : (
                <motion.button
                  className="gesture-nav-btn secondary"
                  onClick={handleSkip}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Skip
                </motion.button>
              )}

              <motion.button
                className="gesture-nav-btn primary"
                onClick={handleNext}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span>{currentStep < GESTURES.length - 1 ? 'Next' : 'Start Reading'}</span>
                {currentStep < GESTURES.length - 1 && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
