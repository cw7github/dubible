// useTapFocusMode - Tap-based focus mode for immersive reading
// Simple, predictable alternative to scroll-based focus mode
//
// BEHAVIOR:
// - Tap anywhere on reading content to toggle UI visibility
// - Desktop (>= 1024px): Focus mode disabled (always show UI)
// - Panels open: Force UI visible
// - Smart event handling: Word holds and verse double-taps take priority
//
// BENEFITS:
// - No scroll direction tracking
// - No timing thresholds or accumulation logic
// - Predictable behavior regardless of content reflow
// - Works perfectly with infinite scroll

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTapFocusModeOptions {
  /** Force UI visible (e.g., when panel is open) */
  forceVisible?: boolean;
}

interface UseTapFocusModeResult {
  /** Whether UI should be hidden */
  isHidden: boolean;
  /** Toggle UI visibility */
  toggle: () => void;
  /** Manually show UI */
  show: () => void;
  /** Manually hide UI */
  hide: () => void;
  /** Props to attach to reading container for tap handling */
  containerProps: {
    onClick: (e: React.MouseEvent) => void;
  };
  /** Track when double-tap fires to prevent focus toggle */
  onDoubleTap: () => void;
}

export function useTapFocusMode({
  forceVisible = false,
}: UseTapFocusModeOptions = {}): UseTapFocusModeResult {
  const [isHidden, setIsHidden] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Track recent double-taps to avoid toggling focus when double-tap fires
  const lastDoubleTapTimeRef = useRef<number>(0);

  // Track pending toggle for verse taps (delayed to allow double-tap to fire)
  const toggleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    setIsHidden(false);
    // Clear any pending delayed toggle
    if (toggleTimerRef.current) {
      clearTimeout(toggleTimerRef.current);
      toggleTimerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    setIsHidden(true);
    // Clear any pending delayed toggle
    if (toggleTimerRef.current) {
      clearTimeout(toggleTimerRef.current);
      toggleTimerRef.current = null;
    }
  }, []);

  const toggle = useCallback(() => {
    setIsHidden((prev) => !prev);
    // Clear any pending delayed toggle
    if (toggleTimerRef.current) {
      clearTimeout(toggleTimerRef.current);
      toggleTimerRef.current = null;
    }
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

  // NOTE: We do NOT mutate isHidden when forceVisible changes.
  // The forceVisible prop only affects the RETURNED value, not internal state.
  // This preserves the user's focus mode preference across panel open/close cycles.

  // Called by double-tap handler to prevent focus toggle
  const onDoubleTap = useCallback(() => {
    lastDoubleTapTimeRef.current = Date.now();
    // Clear any pending delayed toggle since double-tap fired
    if (toggleTimerRef.current) {
      clearTimeout(toggleTimerRef.current);
      toggleTimerRef.current = null;
    }
  }, []);

  // Handle taps on the reading container
  const handleTap = useCallback((target: EventTarget | null) => {
    if (isDesktop || forceVisible) return;

    // Check if double-tap just fired (within 400ms) - if so, don't toggle
    const timeSinceDoubleTap = Date.now() - lastDoubleTapTimeRef.current;
    if (timeSinceDoubleTap < 400) {
      return;
    }

    // Clear any existing timer
    if (toggleTimerRef.current) {
      clearTimeout(toggleTimerRef.current);
      toggleTimerRef.current = null;
    }

    // Check what was tapped
    const element = target as HTMLElement;

    // 1. If tap is on or inside a word, ignore it (word hold gesture takes priority)
    const isWordTap = element.classList?.contains('chinese-word') ||
                      element.closest('.chinese-word');
    if (isWordTap) {
      return;
    }

    // 2. If tap is on a verse container, delay toggle to allow double-tap to fire
    const isVerseTap = element.classList?.contains('verse') ||
                       element.classList?.contains('verse-inline') ||
                       element.closest('.verse, .verse-inline');

    if (isVerseTap) {
      // Wait 350ms (slightly longer than double-tap window of 300ms)
      // If double-tap fires, onDoubleTap() will clear this timer
      toggleTimerRef.current = setTimeout(() => {
        // Check again if double-tap fired during our wait
        const recentDoubleTap = Date.now() - lastDoubleTapTimeRef.current < 100;
        if (!recentDoubleTap) {
          toggle();
        }
        toggleTimerRef.current = null;
      }, 350);
      return;
    }

    // 3. Otherwise (empty space, punctuation, margins, etc.) - toggle immediately
    toggle();
  }, [isDesktop, forceVisible, toggle]);

  // Only use onClick - it works for both mouse clicks AND touch taps
  // (touch events create a synthetic click event ~300ms after touchend)
  // Using both onClick and onTouchEnd causes double-toggling on mobile
  const onClick = useCallback((e: React.MouseEvent) => {
    handleTap(e.target);
  }, [handleTap]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (toggleTimerRef.current) {
        clearTimeout(toggleTimerRef.current);
      }
    };
  }, []);

  return {
    // Disable focus mode on desktop (always show UI) or when forceVisible is true
    isHidden: isDesktop || forceVisible ? false : isHidden,
    toggle,
    show,
    hide,
    containerProps: {
      onClick,
    },
    onDoubleTap,
  };
}
