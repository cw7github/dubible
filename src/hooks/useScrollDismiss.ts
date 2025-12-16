// useScrollDismiss - Intelligent scroll-based panel dismissal
// Auto-dismisses panels when user scrolls, with smooth fade-out and re-appearance

import { useEffect, useRef, useState } from 'react';

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
  dismissDelay: _dismissDelay = 300,
  trackClickPosition: _trackClickPosition = true,
}: UseScrollDismissOptions): ScrollDismissState {
  void _trackClickPosition; // Reserved for future use
  void _dismissDelay; // Reserved for future use
  const [opacity, setOpacity] = useState<number>(1);
  const [shouldFade, setShouldFade] = useState<boolean>(false);

  const scrollStartY = useRef<number>(0);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const isDismissing = useRef<boolean>(false); // Track if we've committed to dismiss

  // Reset state when panel becomes visible
  useEffect(() => {
    if (isVisible) {
      setOpacity(1);
      setShouldFade(false);
      isDismissing.current = false; // Reset dismiss flag
    }
  }, [isVisible]);

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

    const handleScroll = () => {
      // Cancel any pending RAF
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      // Use RAF to batch state updates and avoid performance issues
      rafRef.current = requestAnimationFrame(() => {
        const currentScrollY = container.scrollTop;
        const scrollDelta = Math.abs(currentScrollY - scrollStartY.current);

        // If user scrolls past threshold, start fading
        if (scrollDelta > scrollThreshold) {
          isDismissing.current = true; // Lock in - no restoring opacity
          setShouldFade(true);

          // Calculate opacity based on scroll distance (fade out over 40px)
          const fadeDistance = 40;
          const fadeProgress = Math.min(
            (scrollDelta - scrollThreshold) / fadeDistance,
            1
          );
          const newOpacity = 1 - fadeProgress;
          setOpacity(newOpacity);

          // Dismiss immediately once fully faded
          if (newOpacity <= 0.1 && !dismissTimerRef.current) {
            dismissTimerRef.current = setTimeout(() => {
              onDismiss();
            }, 50); // Tiny delay to let final fade render
          }
        } else if (!isDismissing.current) {
          // Only restore if we haven't started dismissing
          setOpacity(1);
          setShouldFade(false);
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
  ]);

  return {
    opacity,
    shouldFade,
  };
}
