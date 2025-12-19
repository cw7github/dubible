import { memo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SpeedSelectorProps {
  playbackRate: number;
  onSetPlaybackRate: (rate: number) => void;
}

// Speed range: 0.5x to 1.5x in 0.1 increments
const MIN_SPEED = 0.5;
const MAX_SPEED = 1.5;
const STEP = 0.1;

/**
 * SpeedSelector - Compact Vertical Stepper
 *
 * - Up/down arrows to adjust speed by 0.1
 * - Scroll wheel support for quick adjustments
 * - Speed value displayed in center
 * - Compact design that doesn't expand AudioBar
 */
export const SpeedSelector = memo(function SpeedSelector({
  playbackRate,
  onSetPlaybackRate,
}: SpeedSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAccumulator = useRef(0);
  const SCROLL_THRESHOLD = 60; // Pixels of scroll needed to change speed by 0.1

  // Clamp speed to valid range using integer math
  const clampSpeed = useCallback((speed: number): number => {
    const speedInt = Math.round(speed * 10);
    const clampedInt = Math.max(
      Math.round(MIN_SPEED * 10),
      Math.min(Math.round(MAX_SPEED * 10), speedInt)
    );
    return clampedInt / 10;
  }, []);

  const increaseSpeed = useCallback(() => {
    const newSpeed = clampSpeed(playbackRate + STEP);
    if (newSpeed !== playbackRate) {
      onSetPlaybackRate(newSpeed);
    }
  }, [playbackRate, onSetPlaybackRate, clampSpeed]);

  const decreaseSpeed = useCallback(() => {
    const newSpeed = clampSpeed(playbackRate - STEP);
    if (newSpeed !== playbackRate) {
      onSetPlaybackRate(newSpeed);
    }
  }, [playbackRate, onSetPlaybackRate, clampSpeed]);

  // Handle scroll wheel with accumulator for granular control
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Accumulate scroll delta
      scrollAccumulator.current += e.deltaY;

      // Only change speed when threshold is exceeded
      if (Math.abs(scrollAccumulator.current) >= SCROLL_THRESHOLD) {
        // Scroll up (negative deltaY) = increase speed, scroll down = decrease speed
        if (scrollAccumulator.current < 0) {
          increaseSpeed();
        } else {
          decreaseSpeed();
        }
        // Reset accumulator (keep remainder for smooth continuous scrolling)
        scrollAccumulator.current = scrollAccumulator.current % SCROLL_THRESHOLD;
      }
    },
    [increaseSpeed, decreaseSpeed, SCROLL_THRESHOLD]
  );

  const canIncrease = playbackRate < MAX_SPEED - 0.01;
  const canDecrease = playbackRate > MIN_SPEED + 0.01;

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center select-none flex-shrink-0"
      onWheel={handleWheel}
      style={{
        gap: 2,
      }}
    >
      {/* Up arrow */}
      <motion.button
        className="flex items-center justify-center transition-colors"
        style={{
          width: 28,
          height: 16,
          borderRadius: '6px 6px 2px 2px',
          background: canIncrease ? 'var(--bg-tertiary)' : 'transparent',
          color: canIncrease ? 'var(--text-secondary)' : 'var(--text-muted)',
          opacity: canIncrease ? 1 : 0.3,
        }}
        onClick={increaseSpeed}
        disabled={!canIncrease}
        whileTap={canIncrease ? { scale: 0.9, y: -1 } : {}}
        whileHover={canIncrease ? { background: 'var(--bg-secondary)' } : {}}
      >
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          style={{ opacity: canIncrease ? 0.7 : 0.3 }}
        >
          <path
            d="M1 5L5 1L9 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.button>

      {/* Speed value display */}
      <motion.div
        className="relative flex items-center justify-center font-body tabular-nums"
        style={{
          width: 44,
          height: 26,
          borderRadius: 8,
          background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-secondary)',
          fontSize: '0.8125rem',
          fontWeight: 500,
          cursor: 'ns-resize',
          overflow: 'hidden',
        }}
        whileHover={{
          boxShadow: '0 2px 8px -2px rgba(0,0,0,0.1)',
        }}
      >
        <AnimatePresence mode="popLayout">
          <motion.span
            key={playbackRate}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{
              duration: 0.15,
              ease: [0.32, 0.72, 0, 1],
            }}
          >
            {playbackRate.toFixed(1)}×
          </motion.span>
        </AnimatePresence>
      </motion.div>

      {/* Down arrow */}
      <motion.button
        className="flex items-center justify-center transition-colors"
        style={{
          width: 28,
          height: 16,
          borderRadius: '2px 2px 6px 6px',
          background: canDecrease ? 'var(--bg-tertiary)' : 'transparent',
          color: canDecrease ? 'var(--text-secondary)' : 'var(--text-muted)',
          opacity: canDecrease ? 1 : 0.3,
        }}
        onClick={decreaseSpeed}
        disabled={!canDecrease}
        whileTap={canDecrease ? { scale: 0.9, y: 1 } : {}}
        whileHover={canDecrease ? { background: 'var(--bg-secondary)' } : {}}
      >
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          style={{ opacity: canDecrease ? 0.7 : 0.3 }}
        >
          <path
            d="M1 1L5 5L9 1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.button>
    </div>
  );
});
