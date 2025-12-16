// useFocusMode - Scroll-triggered focus mode for immersive reading
// Hides UI chrome when scrolling down, reveals when scrolling up
//
// BEHAVIOR:
// - Scrolling DOWN (reading): Hides UI after accumulating 80px of downward scroll
//   * Consistent threshold regardless of velocity for predictable behavior
//   * Requires sustained downward motion - prevents accidental hiding
// - Scrolling UP (navigating): Shows UI after just 30px - user wants to see controls
// - Accumulation decays gradually when user stops scrolling
// - Ignores small movements (< 5px) to filter momentum/rubber-banding
// - Direction changes only apply decay after meaningful opposite movement (15px threshold)
// - This creates predictable, consistent behavior without "dead zones"

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseFocusModeOptions {
  /** Minimum scroll delta to trigger hide (default: 15) */
  scrollThreshold?: number;
  /** Force UI visible (e.g., when panel is open) */
  forceVisible?: boolean;
}

interface UseFocusModeResult {
  /** Whether UI should be hidden */
  isHidden: boolean;
  /** Ref to attach to scrollable container */
  scrollRef: React.RefObject<HTMLDivElement | null>;
  /** Manually show UI */
  show: () => void;
  /** Manually hide UI */
  hide: () => void;
}

export function useFocusMode({
  scrollThreshold = 15,
  forceVisible = false,
}: UseFocusModeOptions = {}): UseFocusModeResult {
  const [isHidden, setIsHidden] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const lastScrollTop = useRef(0);
  const lastScrollTime = useRef(Date.now());
  const ticking = useRef(false);

  // Track accumulated scroll distance in each direction
  const accumulatedScrollDown = useRef(0);
  const accumulatedScrollUp = useRef(0);

  // Track movement in current direction before applying decay to opposite direction
  const currentDirectionDistance = useRef(0);

  // Track last scroll direction for decay logic
  const lastDirection = useRef<'up' | 'down' | null>(null);

  // Debounce timer for decay (gradual reduction instead of reset)
  const decayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    setIsHidden(false);
    accumulatedScrollDown.current = 0;
    accumulatedScrollUp.current = 0;
    currentDirectionDistance.current = 0;
    lastDirection.current = null;
  }, []);

  const hide = useCallback(() => {
    setIsHidden(true);
    accumulatedScrollDown.current = 0;
    accumulatedScrollUp.current = 0;
    currentDirectionDistance.current = 0;
    lastDirection.current = null;
  }, []);

  // Detect desktop screen size - disable focus mode on larger screens
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
      if (e.matches) {
        setIsHidden(false); // Show UI when switching to desktop
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Force visible when prop is true
  useEffect(() => {
    if (forceVisible && isHidden) {
      setIsHidden(false);
      accumulatedScrollDown.current = 0;
      accumulatedScrollUp.current = 0;
      currentDirectionDistance.current = 0;
      lastDirection.current = null;
    }
  }, [forceVisible, isHidden]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    // Skip adding scroll listener on desktop or when forceVisible is true
    if (isDesktop || forceVisible) return;

    const handleScroll = () => {
      if (ticking.current) return;

      ticking.current = true;
      requestAnimationFrame(() => {
        const currentScrollTop = container.scrollTop;
        const currentTime = Date.now();
        const delta = currentScrollTop - lastScrollTop.current;
        const timeDelta = currentTime - lastScrollTime.current;

        // Ignore very small movements (momentum, settling, jitter, rubber-banding)
        const MIN_DELTA = 5;
        if (Math.abs(delta) < MIN_DELTA) {
          lastScrollTop.current = currentScrollTop;
          lastScrollTime.current = currentTime;
          ticking.current = false;
          return;
        }

        // Detect momentum scrolling by checking velocity
        // Momentum scrolling typically has consistent small deltas with regular timing
        // Intentional scrolling has more variable deltas and timing
        const velocity = Math.abs(delta) / Math.max(timeDelta, 1);

        // If velocity is very low (< 0.3px/ms), it's likely settling/momentum tail
        // Don't count these toward accumulation
        if (velocity < 0.3 && Math.abs(delta) < 15) {
          lastScrollTop.current = currentScrollTop;
          lastScrollTime.current = currentTime;
          ticking.current = false;
          return;
        }

        // Determine current direction
        const currentDirection = delta > 0 ? 'down' : 'up';

        // Clear any pending decay timer - we're actively scrolling
        if (decayTimer.current) {
          clearTimeout(decayTimer.current);
          decayTimer.current = null;
        }

        // If direction changed, check if we should apply decay
        if (lastDirection.current && lastDirection.current !== currentDirection) {
          // Reset current direction tracking
          currentDirectionDistance.current = 0;

          // Only apply decay if this is a meaningful direction change
          // This prevents small corrective scrolls from decaying accumulation
          // User needs to scroll at least 15px in the opposite direction
          // before we start decaying the previous direction's accumulation
          if (currentDirection === 'down') {
            // Just started scrolling down after scrolling up
            // Don't decay yet - wait to see if this is intentional
            accumulatedScrollUp.current *= 0.7; // Small decay for smoothness
          } else {
            // Just started scrolling up after scrolling down
            accumulatedScrollDown.current *= 0.7; // Small decay for smoothness
          }
        } else if (lastDirection.current === currentDirection) {
          // Continuing in same direction - track distance
          currentDirectionDistance.current += Math.abs(delta);

          // After 15px of movement in new direction, apply full decay to opposite
          if (currentDirectionDistance.current >= 15) {
            if (currentDirection === 'down') {
              accumulatedScrollUp.current *= 0.3; // Stronger decay
            } else {
              accumulatedScrollDown.current *= 0.3; // Stronger decay
            }
            // Reset the tracking - we've applied the decay
            currentDirectionDistance.current = 0;
          }
        }

        lastDirection.current = currentDirection;

        // Scrolling DOWN - accumulate distance and hide when threshold reached
        if (delta > 0) {
          accumulatedScrollDown.current += delta;

          // Consistent threshold: 80px of accumulated downward scroll
          // This is predictable and gives users a clear mental model
          const hideAccumulationThreshold = scrollThreshold * 5.33; // 80px with default threshold

          if (accumulatedScrollDown.current >= hideAccumulationThreshold && !isHidden) {
            setIsHidden(true);
            // Reset accumulators after state change
            accumulatedScrollDown.current = 0;
            accumulatedScrollUp.current = 0;
            currentDirectionDistance.current = 0;
          }
        }
        // Scrolling UP - show UI with smaller threshold for quick access
        else if (delta < 0) {
          accumulatedScrollUp.current += Math.abs(delta);

          // Show UI quickly when scrolling up - user wants to navigate
          // 30px threshold - easier to show than hide
          const showAccumulationThreshold = scrollThreshold * 2; // 30px

          if (accumulatedScrollUp.current >= showAccumulationThreshold && isHidden) {
            setIsHidden(false);
            // Reset accumulators after state change
            accumulatedScrollDown.current = 0;
            accumulatedScrollUp.current = 0;
            currentDirectionDistance.current = 0;
          }
        }

        lastScrollTop.current = currentScrollTop;
        lastScrollTime.current = currentTime;
        ticking.current = false;
      });
    };

    // Set up decay timer when scrolling stops
    const handleScrollEnd = () => {
      // Clear any existing timer
      if (decayTimer.current) {
        clearTimeout(decayTimer.current);
      }

      // After 500ms of no scrolling, gradually reduce accumulation
      decayTimer.current = setTimeout(() => {
        // Decay by 75% after inactivity rather than resetting to 0
        // This allows users to pause briefly without losing progress toward threshold
        accumulatedScrollDown.current *= 0.25;
        accumulatedScrollUp.current *= 0.25;

        // If accumulation is very small, just clear it
        if (accumulatedScrollDown.current < 5) accumulatedScrollDown.current = 0;
        if (accumulatedScrollUp.current < 5) accumulatedScrollUp.current = 0;

        if (accumulatedScrollDown.current === 0 && accumulatedScrollUp.current === 0) {
          lastDirection.current = null;
          currentDirectionDistance.current = 0;
        }
      }, 500);
    };

    // Use a separate scroll listener to detect when scrolling stops
    let scrollEndTimer: ReturnType<typeof setTimeout> | null = null;
    const handleScrollWithEnd = () => {
      handleScroll();

      // Clear existing scroll end timer
      if (scrollEndTimer) {
        clearTimeout(scrollEndTimer);
      }

      // Set new timer to detect scroll end
      scrollEndTimer = setTimeout(handleScrollEnd, 150);
    };

    container.addEventListener('scroll', handleScrollWithEnd, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScrollWithEnd);
      if (decayTimer.current) {
        clearTimeout(decayTimer.current);
      }
      if (scrollEndTimer) {
        clearTimeout(scrollEndTimer);
      }
    };
  }, [isDesktop, forceVisible, scrollThreshold, isHidden]);

  return {
    // Disable focus mode on desktop (always show UI) or when forceVisible is true
    isHidden: isDesktop || forceVisible ? false : isHidden,
    scrollRef,
    show,
    hide,
  };
}
