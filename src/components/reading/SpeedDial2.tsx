import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SpeedDial2Props {
  playbackRate: number;
  onSetPlaybackRate: (rate: number) => void;
}

const MIN_SPEED = 0.5;
const MAX_SPEED = 1.5;
const SPEED_RANGE = MAX_SPEED - MIN_SPEED; // 1.0

// Dial dimensions
const DIAL_SIZE = 140;
const DIAL_RADIUS = DIAL_SIZE / 2;
const TRACK_RADIUS = 48; // Where tick marks and dragging happen
const INNER_RADIUS = 28; // Inner decorative ring

// Angle constants (we use 270° arc, from -135° to +135°)
const START_ANGLE = -135;
const END_ANGLE = 135;
const ANGLE_RANGE = END_ANGLE - START_ANGLE; // 270°

/**
 * SpeedDial2 - Rotary Speed Controller
 *
 * A distinctive circular dial inspired by vintage gauges and illuminated manuscripts.
 * - Fixed-size button that never affects parent layout
 * - Elegant rotary dial overlay for speed selection
 * - Drag around the dial or tap tick marks to select speed
 */
export const SpeedDial2 = memo(function SpeedDial2({
  playbackRate,
  onSetPlaybackRate,
}: SpeedDial2Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [tempSpeed, setTempSpeed] = useState(playbackRate);
  const dialRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Sync temp speed when playback rate changes externally
  useEffect(() => {
    if (!isDragging) {
      setTempSpeed(playbackRate);
    }
  }, [playbackRate, isDragging]);

  // Calculate center position when expanded
  useEffect(() => {
    if (isExpanded && dialRef.current) {
      const rect = dialRef.current.getBoundingClientRect();
      centerRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
  }, [isExpanded]);

  // Convert speed to angle (0.5 → -135°, 1.5 → +135°)
  const speedToAngle = useCallback((speed: number) => {
    const normalized = (speed - MIN_SPEED) / SPEED_RANGE;
    return START_ANGLE + normalized * ANGLE_RANGE;
  }, []);

  // Convert angle to speed
  const angleToSpeed = useCallback((angle: number) => {
    // Clamp angle to valid range
    const clampedAngle = Math.max(START_ANGLE, Math.min(END_ANGLE, angle));
    const normalized = (clampedAngle - START_ANGLE) / ANGLE_RANGE;
    return MIN_SPEED + normalized * SPEED_RANGE;
  }, []);

  // Snap to nearest 0.1 increment
  const snapSpeed = useCallback((speed: number) => {
    return Math.round(speed * 10) / 10;
  }, []);

  // Handle drag on the dial
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isExpanded) return;

    e.preventDefault();
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    // Calculate initial angle from pointer position
    const dx = e.clientX - centerRef.current.x;
    const dy = e.clientY - centerRef.current.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90; // Offset so top is 0°

    const newSpeed = snapSpeed(angleToSpeed(angle));
    setTempSpeed(newSpeed);
  }, [isExpanded, angleToSpeed, snapSpeed]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;

    const dx = e.clientX - centerRef.current.x;
    const dy = e.clientY - centerRef.current.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

    const newSpeed = snapSpeed(angleToSpeed(angle));
    setTempSpeed(newSpeed);
  }, [isDragging, angleToSpeed, snapSpeed]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;

    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    // Commit the speed
    onSetPlaybackRate(tempSpeed);
  }, [isDragging, tempSpeed, onSetPlaybackRate]);

  // Handle tap on specific speed
  const handleSpeedTap = useCallback((speed: number) => {
    setTempSpeed(speed);
    onSetPlaybackRate(speed);
    // Keep dial open for further adjustments
  }, [onSetPlaybackRate]);

  // Close when clicking outside
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dialRef.current && !dialRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    // Delay to avoid immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  // Generate tick marks and speed labels
  const renderDialMarks = () => {
    const marks = [];

    for (let i = 0; i <= 10; i++) {
      const speed = 0.5 + i * 0.1;
      const angle = speedToAngle(speed);
      const angleRad = (angle - 90) * (Math.PI / 180);

      // Major ticks at 0.5, 1.0, 1.5
      const isMajor = speed === 0.5 || speed === 1.0 || speed === 1.5;
      const isActive = Math.abs(speed - tempSpeed) < 0.05;

      // Tick position on outer edge
      const tickOuterRadius = TRACK_RADIUS + 8;
      const tickInnerRadius = isMajor ? TRACK_RADIUS - 4 : TRACK_RADIUS;

      const x1 = Math.cos(angleRad) * tickInnerRadius;
      const y1 = Math.sin(angleRad) * tickInnerRadius;
      const x2 = Math.cos(angleRad) * tickOuterRadius;
      const y2 = Math.sin(angleRad) * tickOuterRadius;

      // Label position (outside ticks)
      const labelRadius = TRACK_RADIUS + 18;
      const labelX = Math.cos(angleRad) * labelRadius;
      const labelY = Math.sin(angleRad) * labelRadius;

      marks.push(
        <g key={speed}>
          {/* Tick mark */}
          <motion.line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={isActive ? 'var(--accent)' : isMajor ? 'var(--text-secondary)' : 'var(--border)'}
            strokeWidth={isMajor ? 2.5 : 1.5}
            strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              stroke: isActive ? 'var(--accent)' : isMajor ? 'var(--text-secondary)' : 'var(--border)',
            }}
            transition={{ delay: i * 0.02 }}
          />

          {/* Speed label for major ticks */}
          {isMajor && (
            <motion.text
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={isActive ? 'var(--accent)' : 'var(--text-tertiary)'}
              fontSize="9"
              fontWeight={isActive ? 600 : 400}
              style={{ fontFamily: 'var(--font-body)', userSelect: 'none' }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.02 }}
            >
              {speed.toFixed(1)}
            </motion.text>
          )}
        </g>
      );
    }

    return marks;
  };

  // Current speed indicator (needle)
  const currentAngle = speedToAngle(tempSpeed);
  const needleAngleRad = (currentAngle - 90) * (Math.PI / 180);
  const needleX = Math.cos(needleAngleRad) * (TRACK_RADIUS - 6);
  const needleY = Math.sin(needleAngleRad) * (TRACK_RADIUS - 6);

  return (
    <div className="relative flex-shrink-0">
      {/* Compact button - always visible, fixed size */}
      <motion.button
        className="flex items-center justify-center rounded-full font-body select-none"
        style={{
          width: 42,
          height: 42,
          background: isExpanded
            ? 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)'
            : 'linear-gradient(145deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
          color: isExpanded ? 'white' : 'var(--text-secondary)',
          border: isExpanded ? 'none' : '1.5px solid var(--border)',
          boxShadow: isExpanded
            ? '0 4px 16px -2px var(--accent-light), inset 0 1px 0 rgba(255,255,255,0.2)'
            : '0 2px 8px -2px var(--shadow), inset 0 1px 0 rgba(255,255,255,0.5)',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <span
          className="tabular-nums text-sm font-medium"
          style={{ letterSpacing: '-0.02em' }}
        >
          {playbackRate.toFixed(1)}×
        </span>
      </motion.button>

      {/* Dial overlay - positioned absolutely, never affects layout */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            ref={dialRef}
            className="absolute z-50 select-none"
            style={{
              width: DIAL_SIZE,
              height: DIAL_SIZE,
              right: -DIAL_SIZE / 2 + 21, // Center on button
              top: '100%',
              marginTop: 12,
            }}
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -8 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 28,
              mass: 0.8,
            }}
          >
            {/* Dial background with layered design */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'var(--card-bg)',
                border: '2px solid var(--border)',
                boxShadow: `
                  0 16px 48px -8px var(--shadow-elevated),
                  0 8px 24px -4px var(--shadow-md),
                  inset 0 2px 4px rgba(255,255,255,0.1),
                  inset 0 -2px 8px var(--shadow)
                `,
              }}
            />

            {/* Decorative outer ring */}
            <svg
              className="absolute inset-0"
              viewBox={`${-DIAL_RADIUS} ${-DIAL_RADIUS} ${DIAL_SIZE} ${DIAL_SIZE}`}
              style={{ overflow: 'visible' }}
            >
              {/* Subtle arc track */}
              <motion.path
                d={describeArc(0, 0, TRACK_RADIUS, START_ANGLE - 90, END_ANGLE - 90)}
                fill="none"
                stroke="var(--border-subtle)"
                strokeWidth="8"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />

              {/* Active arc (from min to current) */}
              <motion.path
                d={describeArc(0, 0, TRACK_RADIUS, START_ANGLE - 90, currentAngle - 90)}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeOpacity={0.3}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3 }}
              />

              {/* Inner decorative ring */}
              <circle
                cx="0"
                cy="0"
                r={INNER_RADIUS}
                fill="none"
                stroke="var(--border-subtle)"
                strokeWidth="1"
                opacity={0.5}
              />

              {/* Tick marks and labels */}
              {renderDialMarks()}

              {/* Current position indicator (glowing dot) */}
              <motion.circle
                cx={needleX}
                cy={needleY}
                r="6"
                fill="var(--accent)"
                style={{
                  filter: 'drop-shadow(0 0 6px var(--accent-light))',
                }}
                animate={{
                  cx: needleX,
                  cy: needleY,
                  scale: isDragging ? 1.2 : 1,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              />

              {/* Small center decoration */}
              <circle
                cx="0"
                cy="0"
                r="4"
                fill="var(--accent)"
                opacity={0.6}
              />
            </svg>

            {/* Center display - current speed */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              style={{ paddingTop: 4 }}
            >
              <motion.span
                className="font-body tabular-nums"
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 600,
                  color: 'var(--accent)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
                animate={{ scale: isDragging ? 1.1 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                {tempSpeed.toFixed(1)}
              </motion.span>
              <span
                className="font-body text-xs"
                style={{ color: 'var(--text-tertiary)', marginTop: 2 }}
              >
                speed
              </span>
            </div>

            {/* Interactive drag area (invisible, covers the arc track) */}
            <div
              className="absolute inset-0 rounded-full cursor-grab active:cursor-grabbing"
              style={{ touchAction: 'none' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />

            {/* Quick speed buttons at bottom */}
            <div
              className="absolute left-1/2 -translate-x-1/2 flex gap-1"
              style={{ bottom: -8, transform: 'translateX(-50%)' }}
            >
              {[0.75, 1.0, 1.25].map((speed) => (
                <motion.button
                  key={speed}
                  className="px-2 py-1 rounded-md font-body text-xs tabular-nums"
                  style={{
                    background: Math.abs(tempSpeed - speed) < 0.05
                      ? 'var(--accent-subtle)'
                      : 'var(--bg-secondary)',
                    color: Math.abs(tempSpeed - speed) < 0.05
                      ? 'var(--accent)'
                      : 'var(--text-tertiary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                  onClick={() => handleSpeedTap(speed)}
                  whileTap={{ scale: 0.95 }}
                >
                  {speed === 1.0 ? '1×' : `${speed}×`}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// Helper function to describe an SVG arc
function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
  ].join(' ');
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}
