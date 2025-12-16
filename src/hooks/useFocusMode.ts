// useFocusMode - Scroll-triggered focus mode for immersive reading
// Hides UI chrome when scrolling down, reveals when scrolling up

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
  const ticking = useRef(false);

  const show = useCallback(() => setIsHidden(false), []);
  const hide = useCallback(() => setIsHidden(true), []);

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
        const delta = currentScrollTop - lastScrollTop.current;

        // Only respond if scroll delta exceeds threshold
        if (Math.abs(delta) > scrollThreshold) {
          if (delta > 0) {
            // Scrolling DOWN - hide UI
            setIsHidden(true);
          } else if (delta < 0) {
            // Scrolling UP - show UI
            setIsHidden(false);
          }
        }

        // Do NOT set idle timer - header should stay hidden until user scrolls up
        // This prevents the jarring content shift when header reappears

        lastScrollTop.current = currentScrollTop;
        ticking.current = false;
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [isDesktop, forceVisible, scrollThreshold]);

  return {
    // Disable focus mode on desktop (always show UI) or when forceVisible is true
    isHidden: isDesktop || forceVisible ? false : isHidden,
    scrollRef,
    show,
    hide,
  };
}
