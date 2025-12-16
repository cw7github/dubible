# Focus Mode: Before vs After Comparison

## Behavioral Comparison

| Aspect | Before (Inconsistent) | After (Predictable) |
|--------|----------------------|---------------------|
| **Hide Threshold** | 30px (fast) or 60px (slow) - varies by scroll velocity | Always 80px - consistent |
| **Show Threshold** | 22.5px | 30px |
| **Velocity Detection** | Yes - creates unpredictability | No - purely distance-based |
| **Direction Change** | Instant reset to 0 | 50% decay - maintains progress |
| **Inactivity Reset** | 300ms - too aggressive | 500ms with 75% decay - forgiving |
| **Jitter Filter** | 3px - too small | 5px - better filtering |
| **User Mental Model** | "Sometimes it hides, sometimes it doesn't" | "Scroll down ~80px to hide" |

## Example Scenarios

### Scenario 1: Casual Reading with Pauses

**Before:**
```
User scrolls down 25px → stops to read (300ms) → accumulation resets
User scrolls down 25px → stops to read (300ms) → accumulation resets
User scrolls down 25px → menus never hide (frustrating!)
```

**After:**
```
User scrolls down 25px → stops to read (500ms) → accumulation decays to 6px
User scrolls down 25px → now at 31px → stops to read → decays to 8px
User scrolls down 25px → now at 33px → continues
User scrolls down 25px → now at 58px → continues
User scrolls down 25px → now at 83px → menus hide! (predictable)
```

### Scenario 2: Variable Scroll Speed

**Before:**
```
User scrolls fast (0.6 px/ms) → threshold = 30px → hides quickly
User scrolls slow (0.3 px/ms) → threshold = 60px → doesn't hide
Same gesture feels different → confusing!
```

**After:**
```
User scrolls fast → accumulates toward 80px → hides consistently
User scrolls slow → accumulates toward 80px → hides consistently
Same gesture = same result → predictable!
```

### Scenario 3: Natural Back-and-Forth Scrolling

**Before:**
```
User scrolls down 50px
User scrolls up 10px (to re-read) → down accumulation resets to 0
User scrolls down 50px → menus still don't hide (needs 60px total)
User gets frustrated
```

**After:**
```
User scrolls down 50px → accumulation = 50px
User scrolls up 10px (to re-read) → down accumulation decays to 25px
User scrolls down 40px → accumulation = 65px (25 + 40)
User scrolls down 20px → accumulation = 85px → menus hide!
Natural scrolling pattern works smoothly
```

### Scenario 4: Trying to Show Menus

**Before:**
```
User scrolls up 20px → accumulation = 20px (needs 22.5px)
User scrolls up 5px more → accumulation = 25px → menus appear
Close threshold but reasonable
```

**After:**
```
User scrolls up 25px → accumulation = 25px (needs 30px)
User scrolls up 10px more → accumulation = 35px → menus appear
Slightly higher threshold but still quick and responsive
```

## Code Changes Summary

### Before: Complex Velocity Logic
```typescript
// Calculate scroll velocity (pixels per millisecond)
scrollVelocity.current = timeDelta > 0 ? Math.abs(delta) / timeDelta : 0;

// Fast scrolling requires less accumulation
// Slow scrolling requires more accumulation
const hideAccumulationThreshold = scrollVelocity.current > 0.5
  ? scrollThreshold * 2      // 30px for fast scrolling
  : scrollThreshold * 4;     // 60px for slow scrolling
```

### After: Simple Distance Logic
```typescript
// Consistent threshold: 80px of accumulated downward scroll
// This is predictable and gives users a clear mental model
const hideAccumulationThreshold = scrollThreshold * 5.33; // 80px
```

### Before: Instant Reset
```typescript
// Reset accumulated scroll in the opposite direction
if (delta > 0) {
  accumulatedScrollUp.current = 0;  // Instant reset
} else {
  accumulatedScrollDown.current = 0;  // Instant reset
}
```

### After: Gradual Decay
```typescript
// If direction changed, apply decay to opposite accumulator
if (lastDirection.current && lastDirection.current !== currentDirection) {
  if (currentDirection === 'down') {
    accumulatedScrollUp.current *= 0.5;  // 50% decay
  } else {
    accumulatedScrollDown.current *= 0.5;  // 50% decay
  }
}
```

### Before: Aggressive Reset Timer
```typescript
resetAccumulationTimer.current = setTimeout(() => {
  accumulatedScrollDown.current = 0;  // Full reset
  accumulatedScrollUp.current = 0;    // Full reset
}, 300);
```

### After: Gentle Decay Timer
```typescript
decayTimer.current = setTimeout(() => {
  accumulatedScrollDown.current *= 0.25;  // Keep 25%
  accumulatedScrollUp.current *= 0.25;    // Keep 25%
  
  // Only fully clear if very small
  if (accumulatedScrollDown.current < 5) accumulatedScrollDown.current = 0;
  if (accumulatedScrollUp.current < 5) accumulatedScrollUp.current = 0;
}, 500);
```

## User Experience Impact

### Improvements
1. **Predictability**: Users know exactly how much to scroll to hide/show menus
2. **Forgiveness**: Small pauses and direction changes don't reset progress
3. **Consistency**: Same scroll gesture = same result every time
4. **Smoothness**: Decay-based system feels natural and fluid
5. **Reliability**: Jitter filtering prevents accidental triggers

### Trade-offs
- Slightly higher threshold to hide (80px vs 30-60px)
  - *Rationale: Better to be intentional than accidental*
- Slightly higher threshold to show (30px vs 22.5px)
  - *Rationale: Still very responsive, more consistent*

## Metrics to Track (Post-Deployment)

1. **User Satisfaction**: Survey ratings on menu behavior
2. **Accidental Hides**: How often users immediately show menus after hiding
3. **Interaction Frequency**: How often users interact with focus mode
4. **Session Duration**: Whether users spend more time in focus mode
5. **Complaint Frequency**: Reduction in "menus are buggy" feedback

## Recommended Next Steps

1. **A/B Test** (if possible): Compare old vs new behavior with real users
2. **Collect Feedback**: Monitor user comments on the new behavior
3. **Fine-tune**: Adjust thresholds based on actual usage data
4. **Document**: Update user-facing docs to explain focus mode clearly
