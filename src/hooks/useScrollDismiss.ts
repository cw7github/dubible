// useScrollDismiss - Intelligent scroll-based panel dismissal
// Auto-dismisses panels when user scrolls, with smooth fade-out and re-appearance

import { useEffect, useRef, useCallback, useState } from 'react';

interface UseScrollDismissOptions {
  /** Whether the panel is currently visible */
  isVisible: boolean;
  /** Callback to dismiss the panel */
  onDismiss: () => void;
  /** Scroll container ref to monitor */
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  /** Minimum scroll delta to trigger dismiss (default: 50px) */
  scrollThreshold?: number;
  /** Delay before auto-dismiss when scrolling starts (ms, default: 300) */
  dismissDelay?: number;
  /** Whether to track the clicked verse position for re-appearance (default: true) */
  trackClickPosition?: boolean;
}

interface ScrollDismissState {
  /** Current opacity for smooth fade (0-1) */
  opacity: number;
  /** Whether panel should be in DOM but invisible */
  shouldFade: boolean;
}

export function useScrollDismiss({
  isVisible,
  onDismiss,
  scrollContainerRef,
  scrollThreshold = 50,
  dismissDelay = 300,
  trackClickPosition = true,
}: UseScrollDismissOptions): ScrollDismissState {
  const [opacity, setOpacity] = useState<number>(1);
  const [shouldFade, setShouldFade] = useState<boolean>(false);

  const scrollStartY = useRef<number>(0);
  const clickPositionY = useRef<number>(0);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollY = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  // Track where the user clicked to open the panel
  const recordClickPosition = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container && trackClickPosition) {
      clickPositionY.current = container.scrollTop;
    }
  }, [scrollContainerRef, trackClickPosition]);

  // Reset state when panel becomes visible
  useEffect(() => {
    if (isVisible) {
      setOpacity(1);
      setShouldFade(false);
      recordClickPosition();
    }
  }, [isVisible, recordClickPosition]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !isVisible) {
      // Clean up timers
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
      return;
    }

    scrollStartY.current = container.scrollTop;
    lastScrollY.current = container.scrollTop;

    const handleScroll = () => {
      // Cancel any pending RAF
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      // Use RAF to batch state updates and avoid performance issues
      rafRef.current = requestAnimationFrame(() => {
        const currentScrollY = container.scrollTop;
        const scrollDelta = Math.abs(currentScrollY - scrollStartY.current);

        lastScrollY.current = currentScrollY;

        // Clear existing timer
        if (dismissTimerRef.current) {
          clearTimeout(dismissTimerRef.current);
          dismissTimerRef.current = null;
        }

        // If user scrolls past threshold, start fade-out
        if (scrollDelta > scrollThreshold) {
          setShouldFade(true);

          // Calculate opacity based on scroll distance (fade out smoothly)
          const fadeDistance = 100; // Distance over which to fade
          const fadeProgress = Math.min(
            (scrollDelta - scrollThreshold) / fadeDistance,
            1
          );
          const newOpacity = 1 - fadeProgress * 0.7; // Fade to 30% opacity
          setOpacity(newOpacity);

          // Auto-dismiss after delay
          dismissTimerRef.current = setTimeout(() => {
            onDismiss();
            setShouldFade(false);
            setOpacity(1);
          }, dismissDelay);
        } else {
          // Still near the click position - keep visible
          setShouldFade(false);
          setOpacity(1);
        }

        // If scrolling back to original position, restore full opacity
        if (trackClickPosition && Math.abs(currentScrollY - clickPositionY.current) < 30) {
          setShouldFade(false);
          setOpacity(1);
          if (dismissTimerRef.current) {
            clearTimeout(dismissTimerRef.current);
            dismissTimerRef.current = null;
          }
        }
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [
    isVisible,
    onDismiss,
    scrollContainerRef,
    scrollThreshold,
    dismissDelay,
    trackClickPosition,
  ]);

  return {
    opacity,
    shouldFade,
  };
}
