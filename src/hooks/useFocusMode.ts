// useFocusMode - Scroll-triggered focus mode for immersive reading
// Hides UI chrome when scrolling down, reveals when scrolling up or pausing

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseFocusModeOptions {
  /** Time in ms before showing UI after scroll stops (default: 1500) */
  idleTimeout?: number;
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
  idleTimeout = 1500,
  scrollThreshold = 15,
  forceVisible = false,
}: UseFocusModeOptions = {}): UseFocusModeResult {
  const [isHidden, setIsHidden] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const lastScrollTop = useRef(0);
  const lastScrollTime = useRef(Date.now());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ticking = useRef(false);

  const show = useCallback(() => setIsHidden(false), []);
  const hide = useCallback(() => setIsHidden(true), []);

  // Force visible when prop is true
  useEffect(() => {
    if (forceVisible && isHidden) {
      setIsHidden(false);
    }
  }, [forceVisible, isHidden]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (ticking.current) return;

      ticking.current = true;
      requestAnimationFrame(() => {
        const currentScrollTop = container.scrollTop;
        const delta = currentScrollTop - lastScrollTop.current;
        const now = Date.now();

        // Clear any existing idle timer
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
        }

        // Only respond if scroll delta exceeds threshold
        if (Math.abs(delta) > scrollThreshold) {
          if (delta > 0 && !forceVisible) {
            // Scrolling DOWN - hide UI
            setIsHidden(true);
          } else if (delta < 0) {
            // Scrolling UP - show UI
            setIsHidden(false);
          }
        }

        // Set idle timer to show UI after pause
        idleTimerRef.current = setTimeout(() => {
          if (!forceVisible) {
            setIsHidden(false);
          }
        }, idleTimeout);

        lastScrollTop.current = currentScrollTop;
        lastScrollTime.current = now;
        ticking.current = false;
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [forceVisible, idleTimeout, scrollThreshold]);

  return {
    isHidden: forceVisible ? false : isHidden,
    scrollRef,
    show,
    hide,
  };
}
