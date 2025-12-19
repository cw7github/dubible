import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';

interface SpeedStripProps {
  playbackRate: number;
  onSetPlaybackRate: (rate: number) => void;
}

// Speed range configuration
const MIN_SPEED = 0.5;
const MAX_SPEED = 1.5;
const SPEEDS = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5];
const ITEM_WIDTH = 44; // Width of each speed option
const STRIP_PADDING = 12; // Padding on strip ends

/**
 * SpeedStrip - Horizontal Magnetic Speed Selector
 *
 * A refined horizontal strip that overlays elegantly.
 * - Tap button to expand into horizontal selector
 * - Tap any speed or drag horizontally to select
 * - Magnetic snapping for precise control
 * - Works beautifully on both touch and mouse
 */
export const SpeedStrip = memo(function SpeedStrip({
  playbackRate,
  onSetPlaybackRate,
}: SpeedStripProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartValue = useRef(0);

  // Motion value for smooth dragging
  const x = useMotionValue(0);

  // Calculate x position from speed value
  const speedToX = useCallback((speed: number) => {
    const index = SPEEDS.indexOf(speed);
    if (index === -1) return 0;
    // Center the current speed in the strip
    const centerOffset = (SPEEDS.length * ITEM_WIDTH) / 2 - ITEM_WIDTH / 2;
    return centerOffset - index * ITEM_WIDTH;
  }, []);

  // Calculate speed from x position
  const xToSpeed = useCallback((xPos: number) => {
    const centerOffset = (SPEEDS.length * ITEM_WIDTH) / 2 - ITEM_WIDTH / 2;
    const index = Math.round((centerOffset - xPos) / ITEM_WIDTH);
    const clampedIndex = Math.max(0, Math.min(SPEEDS.length - 1, index));
    return SPEEDS[clampedIndex];
  }, []);

  // Initialize position when expanded
  useEffect(() => {
    if (isExpanded) {
      x.set(speedToX(playbackRate));
    }
  }, [isExpanded, playbackRate, speedToX, x]);

  // Close when clicking outside
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    // Delay to prevent immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isExpanded]);

  // Handle drag start
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isExpanded) return;

    e.preventDefault();
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartValue.current = x.get();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [isExpanded, x]);

  // Handle drag move
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;

    const deltaX = e.clientX - dragStartX.current;
    const newX = dragStartValue.current + deltaX;

    // Apply resistance at edges
    const maxX = speedToX(MIN_SPEED);
    const minX = speedToX(MAX_SPEED);

    if (newX > maxX) {
      x.set(maxX + (newX - maxX) * 0.2);
    } else if (newX < minX) {
      x.set(minX + (newX - minX) * 0.2);
    } else {
      x.set(newX);
    }
  }, [speedToX, x]);

  // Handle drag end - snap to nearest speed
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;

    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    const currentX = x.get();
    const nearestSpeed = xToSpeed(currentX);
    const targetX = speedToX(nearestSpeed);

    // Animate to snapped position
    animate(x, targetX, {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    });

    if (nearestSpeed !== playbackRate) {
      onSetPlaybackRate(nearestSpeed);
    }
  }, [x, xToSpeed, speedToX, playbackRate, onSetPlaybackRate]);

  // Handle direct click on a speed
  const handleSpeedClick = useCallback((speed: number) => {
    const targetX = speedToX(speed);
    animate(x, targetX, {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    });
    onSetPlaybackRate(speed);

    // Close after selection with slight delay for visual feedback
    setTimeout(() => setIsExpanded(false), 200);
  }, [speedToX, x, onSetPlaybackRate]);


  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      {/* Collapsed: Elegant pill button */}
      <motion.button
        className="relative overflow-hidden select-none"
        style={{
          padding: '6px 14px',
          borderRadius: 20,
          background: isExpanded
            ? 'var(--accent-subtle)'
            : 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
          border: '1px solid var(--border-subtle)',
          cursor: 'pointer',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
        whileTap={{ scale: 0.96 }}
        transition={{ duration: 0.1 }}
      >
        {/* Subtle shine effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
            borderRadius: 20,
          }}
        />

        <span
          className="relative font-body tabular-nums tracking-tight"
          style={{
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: isExpanded ? 'var(--accent)' : 'var(--text-secondary)',
            letterSpacing: '-0.01em',
          }}
        >
          {playbackRate.toFixed(1)}×
        </span>
      </motion.button>

      {/* Expanded: Horizontal magnetic strip */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            ref={stripRef}
            className="absolute z-50 select-none"
            style={{
              top: '100%',
              right: -8,
              marginTop: 8,
            }}
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{
              duration: 0.2,
              ease: [0.16, 1, 0.3, 1]
            }}
          >
            {/* Strip container with glass effect */}
            <div
              className="relative overflow-hidden"
              style={{
                width: SPEEDS.length * ITEM_WIDTH + STRIP_PADDING * 2,
                height: 48,
                borderRadius: 24,
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                boxShadow: `
                  0 4px 24px -4px rgba(0,0,0,0.12),
                  0 2px 8px -2px rgba(0,0,0,0.08),
                  inset 0 1px 0 rgba(255,255,255,0.06)
                `,
              }}
            >
              {/* Track groove */}
              <div
                className="absolute"
                style={{
                  top: '50%',
                  left: STRIP_PADDING + ITEM_WIDTH / 2,
                  right: STRIP_PADDING + ITEM_WIDTH / 2,
                  height: 3,
                  marginTop: -1.5,
                  background: 'var(--bg-tertiary)',
                  borderRadius: 2,
                }}
              />

              {/* Tick marks for each speed */}
              <div
                className="absolute inset-0 flex items-center"
                style={{ paddingLeft: STRIP_PADDING, paddingRight: STRIP_PADDING }}
              >
                {SPEEDS.map((speed) => (
                  <div
                    key={speed}
                    className="flex-shrink-0 flex items-center justify-center"
                    style={{ width: ITEM_WIDTH }}
                  >
                    <div
                      style={{
                        width: speed === 1.0 ? 3 : 2,
                        height: speed === 1.0 ? 10 : 6,
                        background: speed === 1.0 ? 'var(--accent)' : 'var(--border)',
                        borderRadius: 1,
                        opacity: speed === 1.0 ? 0.6 : 0.4,
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Draggable speed indicators */}
              <motion.div
                className="absolute inset-0 flex items-center cursor-grab active:cursor-grabbing"
                style={{
                  x,
                  paddingLeft: STRIP_PADDING,
                  paddingRight: STRIP_PADDING,
                  touchAction: 'none',
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                {SPEEDS.map((speed) => {
                  const isCurrent = Math.abs(speed - playbackRate) < 0.05;
                  const isNormal = speed === 1.0;

                  return (
                    <SpeedItem
                      key={speed}
                      speed={speed}
                      isCurrent={isCurrent}
                      isNormal={isNormal}
                      x={x}
                      speedToX={speedToX}
                      onClick={() => handleSpeedClick(speed)}
                    />
                  );
                })}
              </motion.div>

              {/* Center indicator - where selection happens */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: '50%',
                  top: '50%',
                  width: 40,
                  height: 40,
                  marginLeft: -20,
                  marginTop: -20,
                  borderRadius: 20,
                  border: '2px solid var(--accent)',
                  opacity: 0.3,
                }}
              />

              {/* Edge fades */}
              <div
                className="absolute top-0 bottom-0 left-0 pointer-events-none"
                style={{
                  width: 32,
                  background: 'linear-gradient(90deg, var(--card-bg) 0%, transparent 100%)',
                }}
              />
              <div
                className="absolute top-0 bottom-0 right-0 pointer-events-none"
                style={{
                  width: 32,
                  background: 'linear-gradient(-90deg, var(--card-bg) 0%, transparent 100%)',
                }}
              />
            </div>

            {/* Speed label below */}
            <motion.div
              className="text-center mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <span
                className="font-body text-xs"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Drag or tap to select
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// Individual speed item component
const SpeedItem = memo(function SpeedItem({
  speed,
  isCurrent,
  isNormal,
  x,
  speedToX,
  onClick,
}: {
  speed: number;
  isCurrent: boolean;
  isNormal: boolean;
  x: ReturnType<typeof useMotionValue<number>>;
  speedToX: (speed: number) => number;
  onClick: () => void;
}) {
  // Calculate opacity based on distance from center
  const opacity = useTransform(x, (xVal: number) => {
    const targetX = speedToX(speed);
    const distanceFromSelection = Math.abs(xVal - targetX);
    return Math.max(0.4, 1 - (distanceFromSelection / ITEM_WIDTH) * 0.4);
  });

  // Calculate scale based on proximity to center
  const scale = useTransform(x, (xVal: number) => {
    const targetX = speedToX(speed);
    const distanceFromSelection = Math.abs(xVal - targetX);
    const normalizedDist = Math.min(distanceFromSelection / ITEM_WIDTH, 1);
    return 1 - normalizedDist * 0.15;
  });

  return (
    <motion.button
      className="flex-shrink-0 flex items-center justify-center relative"
      style={{
        width: ITEM_WIDTH,
        height: 48,
        opacity,
        scale,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      whileTap={{ scale: 0.9 }}
    >
      {/* Highlight pill for current selection */}
      {isCurrent && (
        <motion.div
          className="absolute"
          style={{
            width: 36,
            height: 28,
            borderRadius: 14,
            background: 'var(--accent-subtle)',
          }}
          layoutId="speedHighlight"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}

      <span
        className="relative font-body tabular-nums"
        style={{
          fontSize: '0.8125rem',
          fontWeight: isCurrent ? 600 : isNormal ? 500 : 400,
          color: isCurrent
            ? 'var(--accent)'
            : isNormal
              ? 'var(--text-primary)'
              : 'var(--text-secondary)',
          letterSpacing: '-0.01em',
        }}
      >
        {speed.toFixed(1)}
      </span>
    </motion.button>
  );
});
