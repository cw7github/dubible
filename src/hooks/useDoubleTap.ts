// useDoubleTap hook - Detects double tap gesture
// Improved to avoid conflicts with word hold gestures
// Returns handlers for onTouchStart, onTouchEnd, onMouseDown, onMouseUp
//
// SCROLL PROTECTION (UX best practices):
// - Touch slop: Uses platform-standard 10px dead zone
// - Velocity detection: Fast movement immediately invalidates tap
// - Global scroll coordination: Cancels pending taps on scroll start
// - Duration check: Long touches are excluded (not taps)

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

interface UseDoubleTapOptions {
  onDoubleTap: () => void;
  /** ms between taps to consider it a double tap (default 300ms) */
  delay?: number;
  /** Movement tolerance in px before rejecting as swipe (default: TOUCH_SLOP = 10px) */
  movementTolerance?: number;
  /** Velocity threshold for scroll detection (default: 0.3 px/ms) */
  velocityThreshold?: number;
}

interface DoubleTapHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
}

export function useDoubleTap({
  onDoubleTap,
  delay = 300,
  movementTolerance = TOUCH_SLOP,
  velocityThreshold = VELOCITY_THRESHOLD,
}: UseDoubleTapOptions): DoubleTapHandlers {
  const lastTapTimeRef = useRef<number>(0);
  const lastTapPosRef = useRef<{ x: number; y: number } | null>(null);
  const tapCountRef = useRef<number>(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<TouchPoint | null>(null);
  const lastPosRef = useRef<TouchPoint | null>(null);
  const isTapValidRef = useRef<boolean>(true);
  const maxVelocityRef = useRef<number>(0);
  const resetTapStateRef = useRef<() => void>(() => {});

  // Maximum duration for a touch to count as a tap (prevents hold gestures from counting)
  const MAX_TAP_DURATION = 200; // ms - well below hold threshold (300ms)

  // Maximum distance between taps to count as double tap
  const MAX_TAP_DISTANCE = 30; // px

  const resetTapState = useCallback(() => {
    tapCountRef.current = 0;
    lastTapTimeRef.current = 0;
    lastTapPosRef.current = null;
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
    }
  }, []);

  // Keep ref updated
  useEffect(() => {
    resetTapStateRef.current = resetTapState;
  }, [resetTapState]);

  // Subscribe to global scroll events to reset tap state when scrolling starts
  useEffect(() => {
    const unsubscribe = subscribeToGlobalScroll(() => {
      // Reset tap state when scroll is detected
      // This prevents double-tap from triggering after scroll ends
      resetTapStateRef.current();
      isTapValidRef.current = false;
    });

    return unsubscribe;
  }, []);

  const handleTap = useCallback((x: number, y: number) => {
    // Don't count this tap if it was a swipe/drag
    if (!isTapValidRef.current) {
      isTapValidRef.current = true; // Reset for next gesture
      return;
    }

    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;

    // Check if this tap is close enough to the last tap (spatial proximity)
    let isNearLastTap = true;
    if (lastTapPosRef.current) {
      const dx = Math.abs(x - lastTapPosRef.current.x);
      const dy = Math.abs(y - lastTapPosRef.current.y);
      const distance = Math.sqrt(dx * dx + dy * dy);
      isNearLastTap = distance < MAX_TAP_DISTANCE;
    }

    if (timeSinceLastTap < delay && timeSinceLastTap > 0 && isNearLastTap) {
      // Double tap detected
      resetTapState();

      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(5); // Very short pulse
      }

      onDoubleTap();
    } else {
      // First tap or too slow/far
      tapCountRef.current = 1;
      lastTapTimeRef.current = now;
      lastTapPosRef.current = { x, y };

      // Reset tap count after delay
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
      }
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
        lastTapTimeRef.current = 0;
        lastTapPosRef.current = null;
      }, delay);
    }
  }, [onDoubleTap, delay, resetTapState]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const now = Date.now();
      startPosRef.current = { x: touch.clientX, y: touch.clientY, timestamp: now };
      lastPosRef.current = { x: touch.clientX, y: touch.clientY, timestamp: now };
      isTapValidRef.current = true;
      maxVelocityRef.current = 0;
    },
    []
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // Check if movement exceeds tolerance or velocity is too high
      if (startPosRef.current && lastPosRef.current) {
        const touch = e.touches[0];
        const now = Date.now();

        // Calculate distance from start
        const dx = touch.clientX - startPosRef.current.x;
        const dy = touch.clientY - startPosRef.current.y;
        const distanceFromStart = Math.sqrt(dx * dx + dy * dy);

        // Calculate velocity
        const timeDelta = now - lastPosRef.current.timestamp;
        if (timeDelta > 0) {
          const lastDx = touch.clientX - lastPosRef.current.x;
          const lastDy = touch.clientY - lastPosRef.current.y;
          const distance = Math.sqrt(lastDx * lastDx + lastDy * lastDy);
          const velocity = distance / timeDelta;
          maxVelocityRef.current = Math.max(maxVelocityRef.current, velocity);
        }

        // Update last position
        lastPosRef.current = { x: touch.clientX, y: touch.clientY, timestamp: now };

        // Invalidate tap if movement or velocity exceeds threshold
        if (distanceFromStart > movementTolerance || maxVelocityRef.current > velocityThreshold) {
          isTapValidRef.current = false;
        }
      }
    },
    [movementTolerance, velocityThreshold]
  );

  const onTouchEnd = useCallback(
    () => {
      // Check if touch duration was too long (likely a hold gesture, not a tap)
      const now = Date.now();
      const touchDuration = startPosRef.current ? now - startPosRef.current.timestamp : 0;
      const isTooLong = touchDuration > MAX_TAP_DURATION;

      // Get final position for tap location
      const finalX = lastPosRef.current?.x ?? startPosRef.current?.x ?? 0;
      const finalY = lastPosRef.current?.y ?? startPosRef.current?.y ?? 0;

      // Only count as tap if:
      // 1. Movement was within tolerance (isTapValidRef)
      // 2. Velocity was low (no fast swipe)
      // 3. Touch duration was short enough (not a hold gesture)
      if (isTapValidRef.current && !isTooLong) {
        handleTap(finalX, finalY);
      }

      startPosRef.current = null;
      lastPosRef.current = null;
      maxVelocityRef.current = 0;
    },
    [handleTap]
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only left click
      if (e.button !== 0) return;
      isTapValidRef.current = true;
      startPosRef.current = { x: e.clientX, y: e.clientY, timestamp: Date.now() };
    },
    []
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if (isTapValidRef.current && startPosRef.current) {
        handleTap(e.clientX, e.clientY);
      }
      startPosRef.current = null;
    },
    [handleTap]
  );

  return {
    onTouchStart,
    onTouchEnd,
    onTouchMove,
    onMouseDown,
    onMouseUp,
  };
}
