// useScrollGestureCoordination - Coordinates gestures with scroll to prevent accidental triggering
// Implements best practices for mobile scroll vs tap/hold disambiguation:
// - Touch slop / dead zone (8-10px)
// - Velocity-based intent detection
// - Global scroll event coordination
// - Gesture cancellation on scroll start

import { useCallback, useRef, useEffect } from 'react';

// Platform-standard touch slop values (similar to Android/iOS)
export const TOUCH_SLOP = 10; // px - movement within this is still considered stationary
export const VELOCITY_THRESHOLD = 0.3; // px/ms - movement faster than this is scroll intent
export const HOLD_DELAY_AFTER_MOVE = 50; // ms - extra delay before allowing hold after any movement

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface GestureState {
  startPoint: TouchPoint | null;
  lastPoint: TouchPoint | null;
  isScrolling: boolean;
  hasExceededSlop: boolean;
  maxVelocity: number;
  cumulativeDistance: number;
}

interface UseScrollGestureCoordinationOptions {
  /** Movement tolerance before cancelling gesture (default: TOUCH_SLOP = 10px) */
  movementTolerance?: number;
  /** Velocity threshold for scroll detection (default: VELOCITY_THRESHOLD = 0.3 px/ms) */
  velocityThreshold?: number;
  /** Callback when gesture should be cancelled due to scroll/movement */
  onScrollDetected?: () => void;
}

interface ScrollGestureHandlers {
  /** Call on touch/mouse start */
  handleStart: (x: number, y: number) => void;
  /** Call on touch/mouse move - returns true if gesture should be cancelled */
  handleMove: (x: number, y: number) => boolean;
  /** Call on touch/mouse end */
  handleEnd: () => void;
  /** Check if current gesture is valid (not cancelled by scroll) */
  isGestureValid: () => boolean;
  /** Get the gesture state for advanced use cases */
  getState: () => GestureState;
}

/**
 * Hook for coordinating touch gestures with scroll behavior.
 * Implements mobile-standard touch slop and velocity detection to
 * distinguish between scroll intent and tap/hold intent.
 */
export function useScrollGestureCoordination({
  movementTolerance = TOUCH_SLOP,
  velocityThreshold = VELOCITY_THRESHOLD,
  onScrollDetected,
}: UseScrollGestureCoordinationOptions = {}): ScrollGestureHandlers {
  const stateRef = useRef<GestureState>({
    startPoint: null,
    lastPoint: null,
    isScrolling: false,
    hasExceededSlop: false,
    maxVelocity: 0,
    cumulativeDistance: 0,
  });

  const onScrollDetectedRef = useRef(onScrollDetected);
  onScrollDetectedRef.current = onScrollDetected;

  const resetState = useCallback(() => {
    stateRef.current = {
      startPoint: null,
      lastPoint: null,
      isScrolling: false,
      hasExceededSlop: false,
      maxVelocity: 0,
      cumulativeDistance: 0,
    };
  }, []);

  const handleStart = useCallback((x: number, y: number) => {
    const now = Date.now();
    stateRef.current = {
      startPoint: { x, y, timestamp: now },
      lastPoint: { x, y, timestamp: now },
      isScrolling: false,
      hasExceededSlop: false,
      maxVelocity: 0,
      cumulativeDistance: 0,
    };
  }, []);

  const handleMove = useCallback((x: number, y: number): boolean => {
    const state = stateRef.current;
    if (!state.startPoint || !state.lastPoint) return false;

    const now = Date.now();

    // Calculate distance from start point
    const dx = x - state.startPoint.x;
    const dy = y - state.startPoint.y;
    const distanceFromStart = Math.sqrt(dx * dx + dy * dy);

    // Calculate velocity from last point
    const timeDelta = now - state.lastPoint.timestamp;
    if (timeDelta > 0) {
      const lastDx = x - state.lastPoint.x;
      const lastDy = y - state.lastPoint.y;
      const distance = Math.sqrt(lastDx * lastDx + lastDy * lastDy);
      const velocity = distance / timeDelta;

      state.maxVelocity = Math.max(state.maxVelocity, velocity);
      state.cumulativeDistance += distance;
    }

    // Update last point
    state.lastPoint = { x, y, timestamp: now };

    // Check if movement exceeds tolerance
    const exceedsSlop = distanceFromStart > movementTolerance;

    // Check if velocity indicates scroll intent
    const isHighVelocity = state.maxVelocity > velocityThreshold;

    // Mark as scrolling if either condition is met
    if ((exceedsSlop || isHighVelocity) && !state.hasExceededSlop) {
      state.hasExceededSlop = true;
      state.isScrolling = true;

      // Notify that scroll was detected
      if (onScrollDetectedRef.current) {
        onScrollDetectedRef.current();
      }
    }

    return state.isScrolling;
  }, [movementTolerance, velocityThreshold]);

  const handleEnd = useCallback(() => {
    resetState();
  }, [resetState]);

  const isGestureValid = useCallback((): boolean => {
    return !stateRef.current.isScrolling && !stateRef.current.hasExceededSlop;
  }, []);

  const getState = useCallback((): GestureState => {
    return { ...stateRef.current };
  }, []);

  return {
    handleStart,
    handleMove,
    handleEnd,
    isGestureValid,
    getState,
  };
}

/**
 * Global scroll detection - tracks when any scroll container is actively scrolling.
 * Gesture hooks can subscribe to know when to cancel their gestures.
 */
let isGlobalScrollActive = false;
let scrollActiveTimeout: ReturnType<typeof setTimeout> | null = null;
const scrollListeners = new Set<() => void>();

export function subscribeToGlobalScroll(listener: () => void): () => void {
  scrollListeners.add(listener);
  return () => scrollListeners.delete(listener);
}

export function notifyGlobalScrollStart(): void {
  isGlobalScrollActive = true;

  // Clear any pending timeout
  if (scrollActiveTimeout) {
    clearTimeout(scrollActiveTimeout);
  }

  // Notify all listeners
  scrollListeners.forEach(listener => listener());

  // Mark scroll as inactive after 150ms of no scroll events
  scrollActiveTimeout = setTimeout(() => {
    isGlobalScrollActive = false;
  }, 150);
}

export function isScrollActive(): boolean {
  return isGlobalScrollActive;
}

/**
 * Hook to listen for global scroll events and cancel gestures accordingly.
 * Attach this to scroll containers to coordinate with gesture hooks.
 */
export function useGlobalScrollNotifier(
  scrollContainerRef: React.RefObject<HTMLElement | null>
): void {
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      notifyGlobalScrollStart();
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [scrollContainerRef]);
}

/**
 * Hook that returns true when global scroll is active.
 * Useful for conditionally disabling gesture visual feedback.
 */
export function useIsScrolling(): boolean {
  const isScrollingRef = useRef(false);

  useEffect(() => {
    // We don't actually need to re-render on every scroll event
    // The gesture hooks will handle cancellation
    // This is just for components that want to know scroll state

    const unsubscribe = subscribeToGlobalScroll(() => {
      isScrollingRef.current = true;
      // Schedule async update to avoid too many re-renders
      setTimeout(() => {
        isScrollingRef.current = isScrollActive();
      }, 160);
    });

    return unsubscribe;
  }, []);

  return isScrollingRef.current;
}
