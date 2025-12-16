# Focus Mode Behavior Fix

## Problem Statement

The focus mode (menus hiding/showing during scroll) felt inconsistent and unpredictable. Users reported that:
- Menus would hide at seemingly random times
- Sometimes menus wouldn't hide when expected
- Showing menus back felt inconsistent

## Root Causes Identified

### 1. **Velocity-Based Threshold Switching**
The original implementation used scroll velocity to switch between two different thresholds:
- Fast scrolling (>0.5 px/ms): 30px threshold
- Slow scrolling: 60px threshold

**Problem**: This created unpredictable behavior because:
- Small variations in scroll speed would flip between thresholds
- Velocity calculation (`delta / timeDelta`) was very sensitive to frame timing
- Users don't consciously control their exact scroll velocity
- What feels like "the same gesture" could trigger different thresholds

### 2. **Abrupt Accumulation Resets**
When changing scroll direction, the opposite direction's accumulation would reset to 0 immediately.

**Problem**: Natural scrolling involves small back-and-forth movements. Abrupt resets meant users would lose all "progress" toward triggering focus mode, making it feel like the feature wasn't responding.

### 3. **Too-Short Inactivity Timeout**
300ms timeout before resetting accumulation was too aggressive.

**Problem**: Users naturally pause while scrolling. A 300ms timeout would reset their progress, requiring them to "start over" if they paused to read.

### 4. **Insufficient Jitter Filtering**
Only 3px movements were filtered as jitter.

**Problem**: Mobile devices have momentum scrolling and rubber-banding effects that can create 3-5px movements. These were being counted as intentional scrolling.

### 5. **Missing Dependency in useEffect**
The `isHidden` state wasn't included in the dependency array of the forceVisible effect.

**Problem**: Could cause stale closure issues where the effect doesn't run when it should.

## Solution Implemented

### 1. **Single, Consistent Threshold**
- **Hide threshold**: Fixed at 80px of accumulated downward scroll
- **Show threshold**: Fixed at 30px of accumulated upward scroll
- **No velocity calculations**: Behavior is now purely distance-based

**Benefit**: Users get a consistent, predictable mental model. "Scroll down about this much and menus hide" - every time.

### 2. **Gradual Decay Instead of Reset**
When direction changes:
- Opposite accumulation decays by 50% (not reset to 0)
- After 500ms of inactivity, accumulation decays by 75%
- Only fully resets when accumulation drops below 5px

**Benefit**: Natural back-and-forth scrolling feels smooth. Users can pause briefly without losing their "progress" toward triggering focus mode.

### 3. **Improved Jitter Filtering**
- Increased MIN_DELTA from 3px to 5px
- Better filters momentum scrolling and rubber-banding

**Benefit**: Only intentional scroll gestures affect focus mode state.

### 4. **Extended Inactivity Timer**
- Increased from 300ms to 500ms
- Applies decay instead of reset

**Benefit**: More forgiving of natural reading pauses. Users won't accidentally reset their progress.

### 5. **Fixed Dependencies**
- Added `isHidden` to the forceVisible effect's dependency array
- Added `isHidden` to the main scroll effect's dependency array

**Benefit**: Ensures effects run when they should, preventing stale closures.

## New Behavior Summary

### Hiding Menus (Entering Focus Mode)
1. User scrolls down continuously
2. After accumulating **80px** of downward scroll, menus hide
3. If user pauses or scrolls up a bit, accumulation decays gradually (not reset)
4. Consistent behavior regardless of scroll speed

### Showing Menus (Exiting Focus Mode)
1. User scrolls up
2. After just **30px** of upward scroll, menus appear
3. Lower threshold makes it easy to access controls
4. If user scrolls down a bit, accumulation decays gradually

### Edge Cases Handled
- **Brief pauses**: 500ms grace period before decay
- **Small back-and-forth**: Decay instead of reset maintains progress
- **Momentum scrolling**: 5px filter ignores unintentional movements
- **Rubber-banding**: Larger MIN_DELTA prevents false triggers
- **Forced visibility**: Panels opening immediately override focus mode

## Testing Recommendations

1. **Consistent hiding**: Scroll down smoothly - menus should hide at ~80px every time
2. **Quick showing**: Scroll up briefly - menus should appear at ~30px
3. **Pause tolerance**: Pause mid-scroll for 0.5s - progress should mostly maintain
4. **Direction changes**: Scroll down, then up slightly - should feel smooth, not jumpy
5. **Panel opening**: Open translation panel - menus should immediately appear and stay visible

## Technical Details

### Key Constants
```typescript
const MIN_DELTA = 5;                           // Ignore movements smaller than 5px
const hideAccumulationThreshold = 80;          // 80px to hide (scrollThreshold * 5.33)
const showAccumulationThreshold = 30;          // 30px to show (scrollThreshold * 2)
const decayTimeout = 500;                      // 500ms before decay starts
const directionChangeDecay = 0.5;              // 50% decay when changing direction
const inactivityDecay = 0.25;                  // 75% decay after timeout (keep 25%)
```

### State Management
- `accumulatedScrollDown`: Accumulates downward scroll distance
- `accumulatedScrollUp`: Accumulates upward scroll distance
- `lastDirection`: Tracks last scroll direction for decay logic
- `decayTimer`: Timer for gradual accumulation decay

### Performance
- Uses `requestAnimationFrame` for smooth updates
- Passive scroll listeners for non-blocking scroll
- Minimal state updates (only when crossing thresholds)

## Files Modified

- `/Users/charleswu/Desktop/+/bilingual_bib/src/hooks/useFocusMode.ts`
  - Removed velocity-based threshold switching
  - Implemented decay-based accumulation system
  - Increased jitter filtering
  - Extended inactivity timeout
  - Fixed effect dependencies

## Backward Compatibility

The changes are fully backward compatible:
- Same API surface (no breaking changes)
- Same props and return values
- Can be deployed without other changes
- Works with existing ReadingScreen and InfiniteScroll components

## Future Enhancements (Optional)

1. **Visual feedback**: Show progress indicator as user approaches threshold
2. **Haptic feedback**: Vibrate when entering/exiting focus mode
3. **User customization**: Allow users to adjust thresholds in settings
4. **Gesture-based**: Add swipe-down gesture to manually toggle focus mode
