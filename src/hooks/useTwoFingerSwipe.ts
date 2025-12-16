import { useCallback, useRef, useEffect } from 'react';

export type SwipeDirection = 'left' | 'right';

interface UseTwoFingerSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number; // Minimum horizontal distance in pixels (default: 80)
  enabled?: boolean; // Allow disabling the hook (default: true)
}

/**
 * Hook for detecting two-finger horizontal swipe gestures
 *
 * Typical usage:
 * - Two-finger swipe LEFT = navigate back
 * - Two-finger swipe RIGHT = navigate forward
 */
export function useTwoFingerSwipe({
  onSwipeLeft,
  onSwipeRight,
  threshold = 80,
  enabled = true,
}: UseTwoFingerSwipeOptions) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isTwoFingerRef = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;

      // Check if exactly two fingers are touching
      if (e.touches.length === 2) {
        isTwoFingerRef.current = true;

        // Calculate midpoint between the two fingers
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const midX = (touch1.clientX + touch2.clientX) / 2;
        const midY = (touch1.clientY + touch2.clientY) / 2;

        touchStartRef.current = { x: midX, y: midY };

        // Prevent default behavior to avoid scrolling during two-finger swipe
        // e.preventDefault(); // Commented out to allow normal scrolling initially
      } else {
        // Reset if not two fingers
        isTwoFingerRef.current = false;
        touchStartRef.current = null;
      }
    },
    [enabled]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !isTwoFingerRef.current || !touchStartRef.current) return;

      // Only prevent default if we're still detecting two fingers
      if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const midX = (touch1.clientX + touch2.clientX) / 2;
        const midY = (touch1.clientY + touch2.clientY) / 2;

        const deltaX = midX - touchStartRef.current.x;
        const deltaY = midY - touchStartRef.current.y;

        // If horizontal movement is more significant than vertical, prevent scroll
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
          e.preventDefault();
        }
      }
    },
    [enabled]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !isTwoFingerRef.current || !touchStartRef.current) {
        isTwoFingerRef.current = false;
        touchStartRef.current = null;
        return;
      }

      // Get the last position before fingers were lifted
      // Use changedTouches to get the positions of the fingers that were just removed
      if (e.changedTouches.length >= 2) {
        const touch1 = e.changedTouches[0];
        const touch2 = e.changedTouches[1];
        const endMidX = (touch1.clientX + touch2.clientX) / 2;
        const endMidY = (touch1.clientY + touch2.clientY) / 2;

        const deltaX = endMidX - touchStartRef.current.x;
        const deltaY = endMidY - touchStartRef.current.y;

        // Check if horizontal movement exceeds threshold and is more significant than vertical
        if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX > 0 && onSwipeRight) {
            // Swiped right
            onSwipeRight();
          } else if (deltaX < 0 && onSwipeLeft) {
            // Swiped left
            onSwipeLeft();
          }
        }
      }

      // Reset state
      isTwoFingerRef.current = false;
      touchStartRef.current = null;
    },
    [enabled, threshold, onSwipeLeft, onSwipeRight]
  );

  const handleTouchCancel = useCallback(() => {
    // Reset state if touch is cancelled
    isTwoFingerRef.current = false;
    touchStartRef.current = null;
  }, []);

  // Set up event listeners on document
  useEffect(() => {
    if (!enabled) return;

    // Use passive: false to allow preventDefault on touchmove
    const options = { passive: false };

    document.addEventListener('touchstart', handleTouchStart, options);
    document.addEventListener('touchmove', handleTouchMove, options);
    document.addEventListener('touchend', handleTouchEnd, options);
    document.addEventListener('touchcancel', handleTouchCancel, options);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);
}
