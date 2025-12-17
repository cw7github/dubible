# Gesture System Quick Reference

## Visual Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    BILINGUAL BIBLE GESTURES                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 1. WORD HOLD (300ms)                                            │
│                                                                 │
│    👆 Hold word                                                 │
│    ├─ 0ms   : Touch starts, progress tracking begins           │
│    ├─ 100ms : Scale 1.02x, opacity 0.95 (subtle feedback)      │
│    ├─ 200ms : Scale 1.03x, opacity 0.90 (growing feedback)     │
│    └─ 300ms : ✨ TRIGGER! Definition appears, haptic pulse     │
│                                                                 │
│    Movement tolerance: 10px (cancel if finger moves too much)  │
│    Hook: useHold                                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 2. VERSE DOUBLE-TAP (300ms window)                             │
│                                                                 │
│    👆👆 Tap twice                                               │
│    ├─ Tap 1  : Timer starts (300ms window)                     │
│    └─ Tap 2  : ✨ TRIGGER! Translation appears, haptic pulse   │
│                                                                 │
│    If taps > 300ms apart: Reset, wait for new first tap        │
│    Movement tolerance: 20px (reject swipes)                     │
│    Hook: useDoubleTap                                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 3. TWO-FINGER SWIPE (80px threshold)                            │
│                                                                 │
│    👆👆 ← Swipe left  : Go back in history                      │
│    👆👆 → Swipe right : Go forward in history                   │
│                                                                 │
│    Requires: Exactly 2 fingers, horizontal movement            │
│    Hook: useTwoFingerSwipe                                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 4. SCROLL DISMISS (15px start, 55px complete)                   │
│                                                                 │
│    📜 Panel open + scroll                                       │
│    ├─ 0-15px  : No change (dead zone)                          │
│    ├─ 15-55px : Linear fade (opacity 1.0 → 0.0)                │
│    └─ 55px+   : Panel dismissed                                │
│                                                                 │
│    Hook: useScrollDismiss                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Conflict Resolution Matrix

```
┌─────────────────┬──────────────┬──────────────┬──────────────┐
│                 │ Word Hold    │ Double-Tap   │ Scroll       │
├─────────────────┼──────────────┼──────────────┼──────────────┤
│ Word Hold       │      -       │   No conflict│   Cancels    │
│                 │              │  (different  │   hold if    │
│                 │              │   timing)    │   >10px      │
├─────────────────┼──────────────┼──────────────┼──────────────┤
│ Double-Tap      │ No conflict  │      -       │   Rejects    │
│                 │ (different   │              │   tap if     │
│                 │  timing)     │              │   >20px move │
├─────────────────┼──────────────┼──────────────┼──────────────┤
│ Scroll          │ Cancels hold │ Rejects tap  │      -       │
│                 │ if >10px     │ if >20px     │              │
└─────────────────┴──────────────┴──────────────┴──────────────┘
```

---

## Timing Diagram

```
Timeline: 0ms ──────> 100ms ──────> 200ms ──────> 300ms ──────>

Word Hold:
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│                                                   ✨ TRIGGER │
│← Visual feedback progresses (scale + opacity) ───────────→  │

Double-Tap:
│👆               👆                                           │
│Tap1 ────────────Tap2──────────────────────────────────────→ │
│                 ✨ TRIGGER                                   │
│←── 300ms window ──→                                          │
│                                                              │
│👆                            👆                              │
│Tap1 ────────────────────────Tap2─────────────────────────→  │
│                             ❌ Too slow, reset               │
│←──── > 300ms ────────→                                       │

Two-Finger Swipe:
│👆👆 ──────────────────────────────────────────────────────→ │
│Start                                              ✨ TRIGGER │
│←────────── 80px horizontal movement ──────────→              │
```

---

## State Flow

```
Word Hold State Machine:
┌─────────┐
│  IDLE   │
└────┬────┘
     │ touchStart
     ↓
┌─────────────┐    movement >10px     ┌──────────┐
│  TRACKING   │──────────────────────→│ CANCELED │
│ (0-300ms)   │                       └──────────┘
└──────┬──────┘
       │ 300ms elapsed
       ↓
┌─────────────┐    touchEnd           ┌──────────┐
│ COMPLETED   │──────────────────────→│  IDLE    │
└─────────────┘                       └──────────┘
```

---

## Performance Characteristics

| Gesture | Event Type | Passive? | RAF? | Update Frequency |
|---------|-----------|----------|------|------------------|
| Word Hold | Touch | Yes | Yes | 16ms (60fps) |
| Double-Tap | Touch | Yes | No | Event-based |
| Two-Finger | Touch | No* | No | Event-based |
| Scroll Dismiss | Scroll | Yes | Yes | RAF-batched |

\* Two-finger swipe uses `passive: false` to prevent default when horizontal movement detected

---

## Visual Feedback Reference

### Word Hold Progress
```
Progress:  0%      25%      50%      75%     100%
           │        │        │        │        │
Scale:    1.00x   1.0125x  1.025x   1.0375x  1.05x
Opacity:  1.00    0.9625   0.925    0.8875   0.85
```

### Scroll Dismiss Opacity
```
Scroll:    0px     15px     35px     55px
           │        │        │        │
Opacity:  1.00     1.00     0.50     0.00
Status:   [  OK  ][    FADING     ][DISMISSED]
```

---

## Quick Troubleshooting

### "Hold gesture not working"
- Check movement < 10px during hold
- Verify 300ms duration reached
- Ensure scroll container not cancelling

### "Double-tap triggering accidentally"
- Check movement < 20px during taps
- Verify taps within 300ms window
- Ensure not scrolling during taps

### "Scroll feels laggy"
- Verify all listeners are passive
- Check RAF batching is working
- Monitor for excessive re-renders

---

## Hook Usage Examples

### Basic Hold
```typescript
const handlers = useHold({
  onHold: () => console.log('Hold complete!'),
  threshold: 300,
});
return <span {...handlers}>Hold me</span>;
```

### Hold with Progress
```typescript
const [progress, setProgress] = useState(0);
const handlers = useHold({
  onHold: () => showDefinition(),
  onHoldProgress: setProgress,
  threshold: 300,
});
return (
  <span
    {...handlers}
    style={{
      transform: `scale(${1 + progress * 0.05})`,
      opacity: 1 - progress * 0.15,
    }}
  >
    Word
  </span>
);
```

### Double-Tap
```typescript
const handlers = useDoubleTap({
  onDoubleTap: () => showTranslation(),
  delay: 300,
  movementTolerance: 20,
});
return <div {...handlers}>Verse text</div>;
```

### Two-Finger Swipe
```typescript
useTwoFingerSwipe({
  onSwipeLeft: goBack,
  onSwipeRight: goForward,
  threshold: 80,
});
```

---

## Keyboard Shortcuts

All gestures have keyboard equivalents for accessibility:

| Gesture | Keyboard | Notes |
|---------|----------|-------|
| Word Hold | Enter or Space on focused word | Requires tabbing to word |
| Double-Tap | (No keyboard equivalent) | Use settings toggle instead |
| Two-Finger | Browser back/forward | Standard browser shortcuts |
| Focus Mode | (No keyboard equivalent) | UI always visible on desktop |

---

**Quick Tip**: For the best experience, use the app on a touch device. Desktop mouse interactions work but lack haptic feedback and some gestures feel less natural.

---

**Last Updated**: 2025-12-16
**See Also**: `GESTURE_SYSTEM.md` for comprehensive documentation
