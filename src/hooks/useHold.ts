// useHold hook - Unified hold gesture for word/verse interactions
// Optimized for frequent word lookups with visual feedback
// Replaces useTapAndHold and useLongPress with single implementation
//
// SCROLL PROTECTION (UX best practices):
// - Touch slop: 10px dead zone before any gesture registers
// - Velocity detection: Fast movement (>0.3 px/ms) immediately cancels gesture
// - Global scroll coordination: Cancels on scroll container scroll events
// - Delayed visual feedback: Only shows progress after confirming stationary touch

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

interface UseHoldOptions {
  /** Callback when hold completes */
  onHold: () => void;
  /** Optional callback when hold starts (for visual feedback) */
  onHoldStart?: () => void;
  /** Optional callback when hold is cancelled */
  onHoldCancel?: () => void;
  /** Optional callback for hold progress (0-1) for visual feedback */
  onHoldProgress?: (progress: number) => void;
  /** Hold duration in ms (default: 300ms - optimized for frequent lookups) */
  threshold?: number;
  /** Movement tolerance in px before cancelling (default: 10px - touch slop) */
  movementTolerance?: number;
  /** Velocity threshold for scroll detection (default: 0.3 px/ms) */
  velocityThreshold?: number;
  /** Delay before showing visual feedback (default: 50ms - confirm stationary) */
  feedbackDelay?: number;
}

interface HoldHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
}

export function useHold({
  onHold,
  onHoldStart,
  onHoldCancel,
  onHoldProgress,
  threshold = 300,
  movementTolerance = TOUCH_SLOP,
  velocityThreshold = VELOCITY_THRESHOLD,
  feedbackDelay = 50,
}: UseHoldOptions): HoldHandlers {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHoldCompletedRef = useRef(false);
  const isHoldStartedRef = useRef(false);
  const isFeedbackStartedRef = useRef(false);
  const startPosRef = useRef<TouchPoint | null>(null);
  const lastPosRef = useRef<TouchPoint | null>(null);
  const maxVelocityRef = useRef<number>(0);
  const cancelRef = useRef<() => void>(() => {});

  // Subscribe to global scroll events to cancel gesture when scrolling starts
  useEffect(() => {
    const unsubscribe = subscribeToGlobalScroll(() => {
      // Cancel any active gesture when scroll is detected
      if (isHoldStartedRef.current && !isHoldCompletedRef.current) {
        cancelRef.current();
      }
    });

    return unsubscribe;
  }, []);

  const clearAllTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    const wasHoldStarted = isHoldStartedRef.current && !isHoldCompletedRef.current;
    const wasFeedbackStarted = isFeedbackStartedRef.current;

    // Clear all timers
    clearAllTimers();

    // Reset state
    isHoldStartedRef.current = false;
    isFeedbackStartedRef.current = false;
    startPosRef.current = null;
    lastPosRef.current = null;
    maxVelocityRef.current = 0;

    // Reset progress feedback (regardless of whether hold completed)
    if (onHoldProgress) {
      onHoldProgress(0);
    }

    // Notify that hold was cancelled (only if feedback was shown)
    if (wasHoldStarted && wasFeedbackStarted && onHoldCancel) {
      onHoldCancel();
    }
  }, [clearAllTimers, onHoldCancel, onHoldProgress]);

  // Keep cancel ref updated
  useEffect(() => {
    cancelRef.current = cancel;
  }, [cancel]);

  const startFeedback = useCallback(() => {
    if (isFeedbackStartedRef.current || isHoldCompletedRef.current) return;
    if (!startPosRef.current) return;

    isFeedbackStartedRef.current = true;

    // Notify that hold has started (for visual feedback)
    if (onHoldStart) {
      onHoldStart();
    }

    // Start progress feedback - update every 16ms (60fps)
    if (onHoldProgress) {
      const startTime = startPosRef.current.timestamp;
      // Account for feedback delay in progress calculation
      const adjustedStart = startTime + feedbackDelay;

      onHoldProgress(0);
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - adjustedStart;
        const adjustedThreshold = threshold - feedbackDelay;
        const progress = Math.min(Math.max(0, elapsed / adjustedThreshold), 1);
        onHoldProgress(progress);

        if (progress >= 1) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
        }
      }, 16);
    }
  }, [onHoldStart, onHoldProgress, threshold, feedbackDelay]);

  const start = useCallback(
    (x: number, y: number) => {
      // Cancel any existing gesture
      cancel();

      const now = Date.now();
      isHoldCompletedRef.current = false;
      isHoldStartedRef.current = true;
      isFeedbackStartedRef.current = false;
      startPosRef.current = { x, y, timestamp: now };
      lastPosRef.current = { x, y, timestamp: now };
      maxVelocityRef.current = 0;

      // Delay visual feedback to confirm stationary touch
      // This prevents flashing feedback when user intends to scroll
      feedbackTimerRef.current = setTimeout(() => {
        startFeedback();
      }, feedbackDelay);

      // Trigger hold after threshold (from actual touch start, not feedback delay)
      timerRef.current = setTimeout(() => {
        isHoldCompletedRef.current = true;

        // Ensure feedback is started if it wasn't already
        if (!isFeedbackStartedRef.current) {
          startFeedback();
        }

        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(10); // Short haptic pulse
        }

        onHold();
      }, threshold);
    },
    [cancel, onHold, threshold, feedbackDelay, startFeedback]
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

      // Check if velocity indicates scroll intent (fast movement)
      const isHighVelocity = maxVelocityRef.current > velocityThreshold;

      return exceedsSlop || isHighVelocity;
    },
    [movementTolerance, velocityThreshold]
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // Stop propagation to prevent touch events on words from bubbling to verse handlers
      e.stopPropagation();

      // iOS PWA Fix: Prevent default to block iOS's native long-press behavior
      // This prevents text selection and callout menu in PWA standalone mode
      // We can safely do this because:
      // 1. We cancel the gesture on scroll (movement/velocity detection)
      // 2. Scrolling is handled by the scroll container, not individual words
      // 3. This only affects the word element itself, not the scroll container
      e.preventDefault();

      const touch = e.touches[0];
      start(touch.clientX, touch.clientY);
    },
    [start]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      // CRITICAL: Always stop propagation to prevent touch events on words
      // from bubbling up to verse-level tap handlers (e.g., useDoubleTap)
      // This ensures single taps on words don't trigger verse translation
      e.stopPropagation();

      // iOS PWA Fix: Always prevent default to fully consume the touch event
      // This ensures no ghost clicks or unexpected interactions occur,
      // especially when the definition card appears and covers the word
      e.preventDefault();

      // Note: We call cancel() to clean up timers and state, but the hold
      // callback has already fired if the threshold was met. The panel state
      // is managed by the parent component (ReadingScreen), not by this hook.
      cancel();
    },
    [cancel]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // iOS PWA Fix: Prevent default to block text selection during hold
      // This must be called BEFORE checking movement, to prevent iOS from
      // starting text selection even if we later cancel the gesture
      if (startPosRef.current) {
        e.preventDefault();
      }

      // Cancel if moved too far or too fast (scroll intent detected)
      if (startPosRef.current) {
        const touch = e.touches[0];
        if (checkMovementAndVelocity(touch.clientX, touch.clientY)) {
          cancel();
        }
      }
    },
    [cancel, checkMovementAndVelocity]
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only left click
      if (e.button !== 0) return;
      // Stop propagation to prevent mouse events on words from bubbling to verse handlers
      e.stopPropagation();
      start(e.clientX, e.clientY);
    },
    [start]
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      // Always stop propagation to prevent mouse events on words from bubbling to verse handlers
      e.stopPropagation();
      cancel();
    },
    [cancel]
  );

  const onMouseLeave = useCallback(() => {
    cancel();
  }, [cancel]);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Cancel if moved too far or too fast
      if (startPosRef.current && checkMovementAndVelocity(e.clientX, e.clientY)) {
        cancel();
      }
    },
    [cancel, checkMovementAndVelocity]
  );

  return {
    onTouchStart,
    onTouchEnd,
    onTouchMove,
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    onMouseMove,
  };
}
