import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SpeedDialProps {
  playbackRate: number;
  onSetPlaybackRate: (rate: number) => void;
}

const MIN_SPEED = 0.5;
const MAX_SPEED = 1.5;

// Generate all available speeds (use integer math to avoid floating-point issues)
const generateSpeeds = (): number[] => {
  const speeds: number[] = [];
  const minInt = Math.round(MIN_SPEED * 10);
  const maxInt = Math.round(MAX_SPEED * 10);
  for (let i = minInt; i <= maxInt; i++) {
    speeds.push(i / 10);
  }
  return speeds;
};

const ALL_SPEEDS = generateSpeeds();
const ITEM_HEIGHT = 36; // Height of each speed item
const VISIBLE_ITEMS = 3; // Show 3 items at a time

/**
 * SpeedDial - Compact Scrollable Speed Selector
 *
 * Design: Small fixed-size window showing 3 speeds with drag-to-scroll
 * - Current speed always centered
 * - Drag up/down to scroll through speeds
 * - Overlays without affecting AudioBar layout
 */
export const SpeedDial = memo(function SpeedDial({
  playbackRate,
  onSetPlaybackRate,
}: SpeedDialProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const dialRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartOffset = useRef(0);
  const isDragging = useRef(false);

  // Calculate scroll position to center current speed
  const getCurrentIndex = () => ALL_SPEEDS.indexOf(playbackRate);

  // When expanded, center the current speed
  useEffect(() => {
    if (isExpanded) {
      const currentIndex = getCurrentIndex();
      // Center the current item (show 1 above, current in middle, 1 below)
      setScrollOffset(currentIndex * ITEM_HEIGHT);
    }
  }, [isExpanded, playbackRate]);

  // Handle pointer down (start drag)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isExpanded) {
      setIsExpanded(true);
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;
    dragStartY.current = e.clientY;
    dragStartOffset.current = scrollOffset;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [isExpanded, scrollOffset]);

  // Handle pointer move (dragging)
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging.current) return;

    e.preventDefault();
    const deltaY = dragStartY.current - e.clientY; // Inverted: drag down = scroll down
    const newOffset = dragStartOffset.current + deltaY;

    // Clamp scroll offset to valid range
    const maxOffset = (ALL_SPEEDS.length - 1) * ITEM_HEIGHT;
    const clampedOffset = Math.max(0, Math.min(maxOffset, newOffset));

    setScrollOffset(clampedOffset);
  }, []);

  // Handle pointer up (end drag, snap to nearest speed)
  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (!isDragging.current) return;

    e.preventDefault();
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture((e as any).pointerId);

    // Snap to nearest speed
    const nearestIndex = Math.round(scrollOffset / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(ALL_SPEEDS.length - 1, nearestIndex));
    const newSpeed = ALL_SPEEDS[clampedIndex];

    // Update speed and scroll position
    if (newSpeed !== playbackRate) {
      onSetPlaybackRate(newSpeed);
    }
    setScrollOffset(clampedIndex * ITEM_HEIGHT);
  }, [scrollOffset, playbackRate, onSetPlaybackRate]);

  // Add/remove pointer listeners
  useEffect(() => {
    if (isDragging.current) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
      };
    }
  }, [handlePointerMove, handlePointerUp]);

  // Close when clicking outside
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dialRef.current && !dialRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  // Handle click on a speed item
  const handleSpeedClick = (speed: number) => {
    onSetPlaybackRate(speed);
    setIsExpanded(false);
  };

  return (
    <div ref={dialRef} className="relative">
      {/* Collapsed: Simple button */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.button
            className="touch-feedback rounded-lg px-2.5 py-1.5 font-body text-xs tabular-nums tracking-wide"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
            }}
            onClick={() => setIsExpanded(true)}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
          >
            {playbackRate.toFixed(1)}×
          </motion.button>
        )}
      </AnimatePresence>

      {/* Expanded: Compact scrollable window - dropdown below button */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="absolute top-full right-0 mt-2 select-none z-50"
            initial={{ opacity: 0, y: -8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.9 }}
            transition={{
              duration: 0.2,
              ease: [0.16, 1, 0.3, 1]
            }}
          >
            {/* Scrollable window container */}
            <div
              className="relative overflow-hidden rounded-xl"
              style={{
                width: 64,
                height: ITEM_HEIGHT * VISIBLE_ITEMS,
                backgroundColor: 'var(--card-bg)',
                border: '1.5px solid var(--border)',
                boxShadow: '0 8px 24px -4px rgba(0,0,0,0.15), 0 4px 12px -2px rgba(0,0,0,0.1)',
                touchAction: 'none',
              }}
            >
              {/* Scrollable speed list */}
              <motion.div
                className="absolute inset-0 cursor-grab active:cursor-grabbing"
                onPointerDown={handlePointerDown}
                style={{
                  y: -scrollOffset + ITEM_HEIGHT, // Offset to center current item
                }}
                animate={{
                  y: -scrollOffset + ITEM_HEIGHT,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                }}
              >
                {ALL_SPEEDS.map((speed, index) => {
                  const isCurrent = Math.abs(speed - playbackRate) < 0.05;
                  const isNormal = speed === 1.0;

                  // Calculate distance from center for opacity
                  const centerIndex = scrollOffset / ITEM_HEIGHT;
                  const distance = Math.abs(index - centerIndex);
                  const opacity = Math.max(0.3, 1 - distance * 0.35);

                  return (
                    <motion.button
                      key={speed}
                      className="flex items-center justify-center w-full relative"
                      style={{
                        height: ITEM_HEIGHT,
                        color: isCurrent
                          ? 'var(--accent)'
                          : isNormal
                            ? 'var(--text-primary)'
                            : 'var(--text-secondary)',
                        opacity,
                      }}
                      onClick={() => handleSpeedClick(speed)}
                      whileTap={{ scale: 0.94 }}
                    >
                      {/* Highlight for current speed */}
                      {isCurrent && (
                        <motion.div
                          className="absolute inset-0"
                          style={{
                            backgroundColor: 'var(--accent-subtle)',
                            borderRadius: 6,
                            margin: '0 6px',
                          }}
                          layoutId="currentSpeed"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}

                      {/* Speed value */}
                      <div className="relative z-10 flex items-baseline gap-0.5">
                        <span
                          className="font-body tabular-nums"
                          style={{
                            fontSize: isCurrent ? '1.0625rem' : '0.9375rem',
                            fontWeight: isCurrent ? 600 : isNormal ? 500 : 400,
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {speed.toFixed(1)}
                        </span>
                        <span
                          className="font-body"
                          style={{
                            fontSize: '0.625rem',
                            opacity: 0.6,
                          }}
                        >
                          ×
                        </span>
                      </div>

                      {/* Tick mark for 1.0x */}
                      {isNormal && (
                        <div
                          className="absolute left-1.5"
                          style={{
                            width: 2,
                            height: 10,
                            backgroundColor: 'var(--accent)',
                            borderRadius: 1,
                            opacity: isCurrent ? 0.8 : 0.4,
                          }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>

              {/* Top gradient fade */}
              <div
                className="absolute top-0 left-0 right-0 pointer-events-none z-10"
                style={{
                  height: ITEM_HEIGHT,
                  background: 'linear-gradient(180deg, var(--card-bg) 0%, transparent 100%)',
                }}
              />

              {/* Bottom gradient fade */}
              <div
                className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
                style={{
                  height: ITEM_HEIGHT,
                  background: 'linear-gradient(0deg, var(--card-bg) 0%, transparent 100%)',
                }}
              />

              {/* Center indicator line (subtle) */}
              <div
                className="absolute left-0 right-0 pointer-events-none z-10"
                style={{
                  top: ITEM_HEIGHT,
                  height: ITEM_HEIGHT,
                  borderTop: '1px solid var(--border-subtle)',
                  borderBottom: '1px solid var(--border-subtle)',
                  opacity: 0.3,
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
