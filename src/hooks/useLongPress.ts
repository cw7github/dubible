// useLongPress hook - Detects long press vs regular tap
// Returns handlers for onTouchStart, onTouchEnd, onMouseDown, onMouseUp
//
// NOTE: This hook is maintained for backward compatibility.
// For new code, prefer useHold which has better scroll protection.
//
// SCROLL PROTECTION (UX best practices):
// - Touch slop: 10px dead zone before any gesture registers
// - Velocity detection: Fast movement (>0.3 px/ms) immediately cancels gesture
// - Global scroll coordination: Cancels on scroll container scroll events

import { useCallback, useRef, useEffect } from 'react';
import {
  TOUCH_SLOP,
  VELOCITY_THRESHOLD,
  subscribeToGlobalScroll,
} from './useScrollGestureCoordination';

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface UseLongPressOptions {
  onLongPress: () => void;
  onTap?: () => void;
  onLongPressStart?: () => void; // Called when long press timer starts
  onLongPressCancel?: () => void; // Called when long press is cancelled
  threshold?: number; // ms to trigger long press (default 400ms)
  movementTolerance?: number; // px before cancelling (default: TOUCH_SLOP = 10px)
  velocityThreshold?: number; // px/ms before cancelling (default: VELOCITY_THRESHOLD = 0.3)
}

interface LongPressHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
}

export function useLongPress({
  onLongPress,
  onTap,
  onLongPressStart,
  onLongPressCancel,
  threshold = 400,
  movementTolerance = TOUCH_SLOP,
  velocityThreshold = VELOCITY_THRESHOLD,
}: UseLongPressOptions): LongPressHandlers {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const isStartedRef = useRef(false);
  const startPosRef = useRef<TouchPoint | null>(null);
  const lastPosRef = useRef<TouchPoint | null>(null);
  const maxVelocityRef = useRef<number>(0);
  const cancelRef = useRef<(triggerTap?: boolean) => void>(() => {});

  // Subscribe to global scroll events to cancel gesture when scrolling starts
  useEffect(() => {
    const unsubscribe = subscribeToGlobalScroll(() => {
      if (isStartedRef.current && !isLongPressRef.current) {
        cancelRef.current(false);
      }
    });

    return unsubscribe;
  }, []);

  const cancel = useCallback(
    (triggerTap: boolean = false) => {
      const wasLongPressStarted = isStartedRef.current && !isLongPressRef.current;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (triggerTap && !isLongPressRef.current && onTap) {
        onTap();
      }

      // Notify that long press was cancelled (only if it was started but not completed)
      if (wasLongPressStarted && onLongPressCancel) {
        onLongPressCancel();
      }

      // Reset state
      isStartedRef.current = false;
      startPosRef.current = null;
      lastPosRef.current = null;
      maxVelocityRef.current = 0;
    },
    [onTap, onLongPressCancel]
  );

  // Keep ref updated
  useEffect(() => {
    cancelRef.current = cancel;
  }, [cancel]);

  const start = useCallback(
    (x: number, y: number) => {
      const now = Date.now();
      isLongPressRef.current = false;
      isStartedRef.current = true;
      startPosRef.current = { x, y, timestamp: now };
      lastPosRef.current = { x, y, timestamp: now };
      maxVelocityRef.current = 0;

      // Notify that long press has started
      if (onLongPressStart) {
        onLongPressStart();
      }

      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        onLongPress();
      }, threshold);
    },
    [onLongPress, onLongPressStart, threshold]
  );

  const checkMovementAndVelocity = useCallback(
    (x: number, y: number): boolean => {
      if (!startPosRef.current || !lastPosRef.current) return false;

      const now = Date.now();

      // Calculate distance from start
      const dx = x - startPosRef.current.x;
      const dy = y - startPosRef.current.y;
      const distanceFromStart = Math.sqrt(dx * dx + dy * dy);

      // Calculate velocity from last point
      const timeDelta = now - lastPosRef.current.timestamp;
      if (timeDelta > 0) {
        const lastDx = x - lastPosRef.current.x;
        const lastDy = y - lastPosRef.current.y;
        const distance = Math.sqrt(lastDx * lastDx + lastDy * lastDy);
        const velocity = distance / timeDelta;
        maxVelocityRef.current = Math.max(maxVelocityRef.current, velocity);
      }

      // Update last position
      lastPosRef.current = { x, y, timestamp: now };

      // Check if movement exceeds touch slop
      const exceedsSlop = distanceFromStart > movementTolerance;

      // Check if velocity indicates scroll intent
      const isHighVelocity = maxVelocityRef.current > velocityThreshold;

      return exceedsSlop || isHighVelocity;
    },
    [movementTolerance, velocityThreshold]
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      start(touch.clientX, touch.clientY);
    },
    [start]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      // Prevent ghost click on mobile
      if (isLongPressRef.current) {
        e.preventDefault();
        // CRITICAL: Stop propagation to prevent this touchend from being
        // interpreted as a tap by parent gesture handlers (e.g., useDoubleTap)
        e.stopPropagation();
      }
      cancel(!isLongPressRef.current);
    },
    [cancel]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // Cancel if moved too far or too fast (scroll intent detected)
      if (startPosRef.current) {
        const touch = e.touches[0];
        if (checkMovementAndVelocity(touch.clientX, touch.clientY)) {
          cancel(false);
        }
      }
    },
    [cancel, checkMovementAndVelocity]
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only left click
      if (e.button !== 0) return;
      start(e.clientX, e.clientY);
    },
    [start]
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      // Stop propagation if long press completed to prevent parent handlers from
      // interpreting this as a click/tap
      if (isLongPressRef.current) {
        e.stopPropagation();
      }
      cancel(!isLongPressRef.current);
    },
    [cancel]
  );

  const onMouseLeave = useCallback(() => {
    cancel(false);
  }, [cancel]);

  return {
    onTouchStart,
    onTouchEnd,
    onTouchMove,
    onMouseDown,
    onMouseUp,
    onMouseLeave,
  };
}
