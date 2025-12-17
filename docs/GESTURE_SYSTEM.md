# Gesture System Design

## Overview

The bilingual Bible reading app uses a comprehensive, conflict-free gesture system optimized for **learners who frequently look up word definitions**. The system prioritizes fast word access while preventing accidental triggers and providing clear visual feedback.

## Design Philosophy

### Core Principles
1. **Fast word access** - Reduce hold duration for quicker definition lookups
2. **Clear visual feedback** - Show progress during gestures to prevent user uncertainty
3. **Prevent accidental triggers** - Use movement tolerance and intelligent timing
4. **Forgiving gestures** - Allow small movements during holds without cancelling
5. **Platform performance** - All touch listeners are passive for smooth scrolling

### Target User Profile
- **Primary use case**: Vocabulary learners who frequently tap words
- **Reading pattern**: Read Chinese text and look up unfamiliar words often
- **UX priority**: Quick, responsive word lookups without frustration

## Gesture Catalog

### 1. Word Hold (300ms)
**Purpose**: Show word definition popup

- **Trigger**: Hold finger on a Chinese word for 300ms
- **Hook**: `useHold`
- **Component**: `ChineseWord.tsx`
- **Movement tolerance**: 10px (allows small finger movement without cancelling)
- **Visual feedback**:
  - Subtle scale animation (1.0 → 1.05x) during hold
  - Opacity fade (1.0 → 0.85) during hold
  - Progress tracked at 60fps (16ms intervals)
  - Haptic pulse on completion (10ms vibration)
- **Rationale**: 300ms is faster than iOS standard (500ms), optimized for frequent use without being too sensitive

**Implementation details**:
```typescript
const holdHandlers = useHold({
  onHold: handleHold,
  onHoldStart: handleHoldStart,
  onHoldCancel: handleHoldCancel,
  onHoldProgress: handleHoldProgress,
  threshold: 300,
  movementTolerance: 10,
});
```

---

### 2. Verse Double-Tap (300ms window)
**Purpose**: Show English verse translation

- **Trigger**: Tap verse twice within 300ms
- **Hook**: `useDoubleTap`
- **Component**: `VerseDisplay.tsx`
- **Movement tolerance**: 20px (rejects swipes/drags)
- **Visual feedback**:
  - Very short haptic pulse (5ms vibration)
- **Conflict prevention**:
  - Does NOT use `preventDefault()` on touchstart (natural feel)
  - Validates taps weren't swipes before counting
  - Movement detection prevents scroll from triggering double-tap
- **Rationale**: Standard mobile double-tap timing, clearly separated from word hold gesture

**Implementation details**:
```typescript
const doubleTapHandlers = useDoubleTap({
  onDoubleTap: handleVerseDoubleTap,
  delay: 300,
  movementTolerance: 20,
});
```

---

### 3. Two-Finger Swipe (80px threshold)
**Purpose**: Navigate reading history (back/forward)

- **Trigger**: Swipe with two fingers horizontally
- **Hook**: `useTwoFingerSwipe`
- **Component**: `ReadingScreen.tsx`
- **Direction mapping**:
  - Swipe LEFT → Go back in history
  - Swipe RIGHT → Go forward in history
- **Threshold**: 80px minimum horizontal movement
- **Conflict prevention**:
  - Only triggers with exactly 2 fingers
  - Prevents default scroll when horizontal movement detected
  - Calculates midpoint between fingers for consistent tracking
- **Rationale**: Browser-style history navigation, won't interfere with single-finger gestures

**Implementation details**:
```typescript
useTwoFingerSwipe({
  onSwipeLeft: () => canGoBack && navigateBack(),
  onSwipeRight: () => canGoForward && navigateForward(),
  threshold: 80,
  enabled: true,
});
```

---

### 4. Scroll Dismiss (15px threshold)
**Purpose**: Auto-dismiss translation panel when scrolling

- **Trigger**: Scroll 15px while panel is visible
- **Hook**: `useScrollDismiss`
- **Component**: `ReadingScreen.tsx` (for TranslationPanel)
- **Thresholds**:
  - **Start fading**: 15px scroll
  - **Complete fade**: 40px additional scroll (55px total)
- **Visual feedback**:
  - Smooth opacity transition (linear over 40px)
  - Panel dismisses at 0.1 opacity
- **Rationale**: Quick, responsive dismissal feels natural without being too sensitive

**Implementation details**:
```typescript
const { opacity } = useScrollDismiss({
  isVisible: panelMode !== null,
  onDismiss: handleClosePanel,
  scrollContainerRef: scrollRef,
  scrollThreshold: 15,
  dismissDelay: 150,
});
```

---

## Gesture Conflicts & Resolution

### Word Hold vs. Scroll
**Conflict**: Holding a word while starting to scroll
**Resolution**:
- Hold cancels if movement exceeds 10px
- Scroll listeners are passive (don't block)
- Visual feedback immediately stops on cancellation

### Double-Tap vs. Word Hold
**Conflict**: First tap of double-tap could trigger hold
**Resolution**:
- Double-tap completes in ~100-150ms (user taps quickly)
- Word hold requires 300ms sustained press
- In practice, users don't hold during double-tap
- Movement tolerance (20px) rejects accidental taps during scrolling

### Double-Tap vs. Scroll
**Conflict**: Tapping while scrolling could register as tap
**Resolution**:
- Movement detection invalidates taps if user moved >20px
- No preventDefault on touchstart (scroll starts immediately)
- Only valid, stationary taps count toward double-tap

### Two-Finger Swipe vs. Pinch-Zoom
**Conflict**: Two-finger gestures could interfere
**Resolution**:
- App doesn't use pinch-zoom (text scaling via settings)
- Two-finger swipe only triggers on horizontal movement
- Vertical two-finger movement is normal scroll

---

## Visual Feedback Summary

| Gesture | Visual Feedback | Haptic Feedback |
|---------|----------------|-----------------|
| **Word Hold** | Scale 1.0→1.05x, Opacity 1.0→0.85 at 60fps | 10ms pulse on completion |
| **Verse Double-Tap** | None (panel appears immediately) | 5ms pulse on completion |
| **Two-Finger Swipe** | None (page transition handles animation) | None |
| **Scroll Dismiss** | Linear opacity fade over 40px | None |

---

## Performance Optimizations

### Passive Event Listeners
All touch and scroll listeners use `{ passive: true }` to avoid blocking main thread:
- Scroll events can't use `preventDefault()` (browser scrolls immediately)
- Touch events only preventDefault when necessary (e.g., after hold completes)
- Massive improvement in scroll performance on mobile

### RequestAnimationFrame Batching
- Hold progress updates use 16ms intervals (60fps)
- Scroll position tracking uses RAF to batch updates
- Focus mode scroll detection debounced with RAF

### Movement Tolerance
- Prevents unnecessary gesture cancellations
- Reduces re-renders from tiny finger movements
- Improves battery life on mobile devices

---

## Hook Architecture

### useHold (unified hold gesture)
**Replaces**: `useTapAndHold` (350ms) and `useLongPress` (400ms)

**Features**:
- Progress callbacks for visual feedback
- Configurable threshold and movement tolerance
- Haptic feedback support
- Automatic cleanup and cancellation

**Benefits**:
- Single implementation reduces code duplication
- Consistent behavior across all hold gestures
- Easier to maintain and test

### useDoubleTap (improved)
**Changes from original**:
- Removed `preventDefault()` on touchstart
- Added movement tolerance (20px)
- Added tap validation (rejects swipes)
- Added haptic feedback

**Benefits**:
- More natural feel (doesn't block text selection)
- Better conflict resolution with scroll
- Clearer user feedback

---

## Platform Conventions

### iOS vs Android
- **iOS standard**: Long press is 500ms
- **Android standard**: Long press is 400-500ms
- **Our choice**: 300ms for word holds
  - Faster than platform standard
  - Optimized for frequent use
  - Still feels deliberate (not accidental)

### Movement Tolerance
- **iOS**: ~10-15px typical
- **Android**: ~10-20px typical
- **Our choice**: 10px for holds, 20px for taps
  - Conservative for holds (more precision)
  - Forgiving for taps (rejects swipes)

---

## Accessibility Considerations

### Keyboard Access
- All interactive words have `tabIndex={0}` and `role="button"`
- Keyboard handlers support Enter and Space
- Triggers same callbacks as touch gestures

### Alternative Access Methods
- Settings screen provides alternative to all gestures
- Verse translations: Double-tap or use settings toggle
- Word definitions: Hold or use vocabulary screen
- Navigation: Two-finger swipe or use navigation buttons

### Visual Feedback
- Hold progress animation provides non-haptic feedback
- Clear state changes (highlighted, pending, saved)
- High contrast between states

---

## Testing Guidelines

### Manual Testing Checklist
- [ ] Hold word for 300ms → Definition appears
- [ ] Hold word then scroll → Hold cancels, no definition
- [ ] Double-tap verse → Translation appears
- [ ] Double-tap while scrolling → No translation (movement rejected)
- [ ] Two-finger swipe left → Navigate back
- [ ] Two-finger swipe right → Navigate forward
- [ ] Scroll down 80px → UI hides
- [ ] Scroll up 30px → UI shows
- [ ] Open panel, scroll 55px → Panel dismisses
- [ ] Verify haptic feedback works on supported devices

### Edge Cases
- [ ] Hold word at edge of scroll container
- [ ] Double-tap during momentum scroll
- [ ] Two-finger swipe at boundary (no more history)
- [ ] Rapid hold-cancel-hold sequences
- [ ] Panel dismiss during active hold gesture

---

## Future Improvements

### Potential Enhancements
1. **Adjustable hold duration** - Setting to customize 300ms threshold
2. **Gesture hints** - Tutorial overlay for first-time users
3. **Smart thresholds** - Adapt based on user accuracy/speed
4. **Audio feedback** - Optional click sounds for gestures
5. **Gesture recording** - Analytics to optimize timing

### Known Limitations
1. No pinch-to-zoom (by design - use settings instead)
2. Haptic feedback requires browser support (not all devices)
3. Two-finger swipe may conflict with browser gestures on some devices

---

## Migration Notes

### Deprecated Hooks
- `useTapAndHold` → Use `useHold` instead (same API, better performance)
- `useLongPress` → Use `useHold` instead (not currently used in app)

### Breaking Changes
- None (new hooks maintain backward compatibility)

### Component Updates Required
- ✅ `ChineseWord.tsx` - Updated to use `useHold`
- ✅ `VerseDisplay.tsx` - Already using improved `useDoubleTap`
- ✅ `ReadingScreen.tsx` - No changes needed

---

## Code Examples

### Basic Word Hold
```typescript
import { useHold } from '../../hooks';

const [holdProgress, setHoldProgress] = useState(0);

const holdHandlers = useHold({
  onHold: () => showDefinition(),
  onHoldStart: () => setIsHolding(true),
  onHoldCancel: () => setIsHolding(false),
  onHoldProgress: (progress) => setHoldProgress(progress),
  threshold: 300,
  movementTolerance: 10,
});

return (
  <span
    {...holdHandlers}
    style={{
      transform: `scale(${1 + holdProgress * 0.05})`,
      opacity: 1 - holdProgress * 0.15,
    }}
  >
    {word}
  </span>
);
```

### Verse Double-Tap
```typescript
import { useDoubleTap } from '../../hooks';

const doubleTapHandlers = useDoubleTap({
  onDoubleTap: () => showTranslation(),
  delay: 300,
  movementTolerance: 20,
});

return <div {...doubleTapHandlers}>{verseText}</div>;
```

---

## References

- [MDN Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)
- [iOS Human Interface Guidelines - Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures)
- [Material Design - Gestures](https://m3.material.io/foundations/interaction/gestures)
- [React Event Handling](https://react.dev/learn/responding-to-events)

---

**Last Updated**: 2025-12-16
**Version**: 1.1
**Author**: Claude Code
