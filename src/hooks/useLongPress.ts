// useLongPress hook - Detects long press vs regular tap
// Returns handlers for onTouchStart, onTouchEnd, onMouseDown, onMouseUp

import { useCallback, useRef } from 'react';

interface UseLongPressOptions {
  onLongPress: () => void;
  onTap?: () => void;
  onLongPressStart?: () => void; // Called when long press timer starts
  onLongPressCancel?: () => void; // Called when long press is cancelled
  threshold?: number; // ms to trigger long press (default 400ms)
}

interface LongPressHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
}

export function useLongPress({
  onLongPress,
  onTap,
  onLongPressStart,
  onLongPressCancel,
  threshold = 400,
}: UseLongPressOptions): LongPressHandlers {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const start = useCallback(
    (x: number, y: number) => {
      isLongPressRef.current = false;
      startPosRef.current = { x, y };

      // Notify that long press has started
      if (onLongPressStart) {
        onLongPressStart();
      }

      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        onLongPress();
      }, threshold);
    },
    [onLongPress, onLongPressStart, threshold]
  );

  const cancel = useCallback(
    (triggerTap: boolean = false) => {
      const wasLongPressStarted = timerRef.current !== null && !isLongPressRef.current;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (triggerTap && !isLongPressRef.current && onTap) {
        onTap();
      }

      // Notify that long press was cancelled (only if it was started but not completed)
      if (wasLongPressStarted && onLongPressCancel) {
        onLongPressCancel();
      }

      startPosRef.current = null;
    },
    [onTap, onLongPressCancel]
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      start(touch.clientX, touch.clientY);
    },
    [start]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      // Prevent ghost click on mobile
      if (isLongPressRef.current) {
        e.preventDefault();
      }
      cancel(!isLongPressRef.current);
    },
    [cancel]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // Cancel if moved too far (prevents scroll from triggering long press)
      if (startPosRef.current) {
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - startPosRef.current.x);
        const dy = Math.abs(touch.clientY - startPosRef.current.y);
        if (dx > 10 || dy > 10) {
          cancel(false);
        }
      }
    },
    [cancel]
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only left click
      if (e.button !== 0) return;
      start(e.clientX, e.clientY);
    },
    [start]
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      cancel(!isLongPressRef.current);
    },
    [cancel]
  );

  const onMouseLeave = useCallback(() => {
    cancel(false);
  }, [cancel]);

  return {
    onTouchStart,
    onTouchEnd,
    onTouchMove,
    onMouseDown,
    onMouseUp,
    onMouseLeave,
  };
}
