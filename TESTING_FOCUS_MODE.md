# Testing Focus Mode Consistency

## Manual Testing Checklist

### Basic Behavior Tests

#### Test 1: Consistent Hiding
1. Start with UI visible
2. Scroll down slowly and steadily
3. **Expected**: UI hides after ~80px of downward scroll
4. **Repeat 5 times**: Should hide at approximately the same point each time

#### Test 2: Consistent Showing
1. Start with UI hidden (scroll down first)
2. Scroll up slowly
3. **Expected**: UI appears after ~30px of upward scroll
4. **Repeat 5 times**: Should show at approximately the same point each time

#### Test 3: Clean Reset After State Change
1. Scroll down 80px → UI hides
2. Continue scrolling down another 50px
3. Scroll up 30px → UI shows
4. **Immediately** scroll down again
5. **Expected**: Should require another 80px to hide (not less due to leftover accumulation)

### Direction Change Tests

#### Test 4: Small Corrective Scrolls
1. Start with UI visible
2. Scroll down 79px (just under threshold)
3. Make a small 5px upward scroll (corrective gesture)
4. Scroll down 6px more
5. **Expected**: UI should hide (total: 79 + 6 = 85px down, minus small decay)

#### Test 5: Large Direction Changes
1. Start with UI visible
2. Scroll down 79px
3. Scroll up 25px (significant opposite direction)
4. Scroll down again
5. **Expected**: Should require more than 1px to hide (decay was applied)

#### Test 6: Back-and-Forth Scrolling
1. Scroll down 40px
2. Scroll up 10px
3. Scroll down 40px
4. Scroll up 10px
5. Scroll down 20px
6. **Expected**: UI should hide around this point (gentle decay on small direction changes)

### Momentum Scrolling Tests

#### Test 7: Swipe Gesture (iOS/Android)
1. Make a quick swipe down gesture
2. Lift finger → momentum continues scrolling
3. **Expected**: UI hides during the intentional swipe, NOT from momentum tail
4. **Observe**: Momentum scrolling after finger lift should not affect UI state

#### Test 8: Slow Settling
1. Scroll down to hide UI
2. Content settles with very slow momentum
3. **Expected**: Settling motion (< 0.3px/ms velocity) should not trigger state change

#### Test 9: Flick Up
1. Start with UI hidden
2. Flick up quickly (high initial velocity)
3. **Expected**: UI shows quickly from intentional scroll, not from momentum

### Inactivity and Decay Tests

#### Test 10: Brief Pause
1. Scroll down 70px
2. Pause for 0.5 seconds (reading)
3. Scroll down 10px more
4. **Expected**: UI should hide (accumulation preserved during brief pause)

#### Test 11: Long Pause
1. Scroll down 70px
2. Pause for 2 seconds
3. Scroll down 10px
4. **Expected**: UI might not hide yet (decay reduced accumulation to ~17.5px, need more)

#### Test 12: Resume After Decay
1. Scroll down 70px
2. Pause for 2 seconds (decay happens)
3. Scroll down 70px again
4. **Expected**: UI should hide (new scroll accumulation reaches 80px)

### Panel Interaction Tests

#### Test 13: Force Visible Override
1. Scroll down to hide UI
2. Double-tap a verse to open translation panel
3. **Expected**: UI immediately becomes visible and stays visible
4. Close panel
5. **Expected**: Focus mode resumes (UI can hide again on scroll)

#### Test 14: Panel Prevents Focus Mode
1. Open translation panel (UI visible)
2. Try scrolling down
3. **Expected**: UI remains visible (forceVisible prevents hiding)
4. Close panel
5. Scroll down 80px
6. **Expected**: UI now hides normally

### Edge Cases

#### Test 15: Very Small Movements
1. Scroll down in 3px increments (15 times = 45px total)
2. **Expected**: UI should NOT hide (below MIN_DELTA threshold, filtered as jitter)

#### Test 16: Rapid Direction Changes
1. Quickly alternate: down 10px, up 5px, down 10px, up 5px (repeat 10 times)
2. **Expected**: Behavior should feel smooth, not jumpy or unpredictable
3. Eventually accumulation in one direction should win and trigger state change

#### Test 17: At Threshold Boundary
1. Scroll down exactly 80px
2. **Expected**: UI hides
3. Scroll up exactly 30px
4. **Expected**: UI shows
5. Repeat cycle 3 times
6. **Expected**: Consistent behavior every time

#### Test 18: Desktop Mode
1. Open app on desktop (>= 1024px width)
2. Try scrolling down
3. **Expected**: UI always visible (focus mode disabled on desktop)

### Performance Tests

#### Test 19: Rapid Scrolling
1. Scroll very quickly for 5 seconds
2. **Expected**: Smooth performance, no lag
3. UI state changes should feel instant
4. No visual jank or stuttering

#### Test 20: Long Reading Session
1. Read and scroll for 5 minutes
2. Test hiding/showing multiple times
3. **Expected**: Consistent behavior throughout session
4. No memory leaks or performance degradation

## Automated Testing Scenarios

### Unit Test Ideas

```typescript
describe('useFocusMode', () => {
  it('should hide UI after 80px downward scroll', () => {
    // Simulate scroll events with 10px deltas
    // After 8 events, isHidden should be true
  });

  it('should show UI after 30px upward scroll', () => {
    // Start hidden, simulate upward scroll
    // After 3 events of 10px each, isHidden should be false
  });

  it('should reset accumulation after state change', () => {
    // Scroll down to hide, continue scrolling, scroll up to show
    // Next hide should require full 80px
  });

  it('should ignore momentum scrolling', () => {
    // Simulate low-velocity small deltas
    // Should not affect accumulation
  });

  it('should apply gentle decay on small direction changes', () => {
    // Scroll down 70px, up 5px, check accumulation
    // Should be ~49px (70 * 0.7)
  });

  it('should apply strong decay after commitment', () => {
    // Scroll down 70px, up 20px, check accumulation
    // Should be ~21px (70 * 0.3)
  });

  it('should decay after inactivity', () => {
    // Scroll down 70px, wait 650ms, check accumulation
    // Should be ~17.5px (70 * 0.25)
  });
});
```

## Success Criteria

### Consistency Metrics
- [ ] 5 consecutive hiding tests trigger at 75-85px range
- [ ] 5 consecutive showing tests trigger at 25-35px range
- [ ] No unexpected state changes during momentum scrolling
- [ ] No accumulation carry-over between state changes

### User Experience
- [ ] Behavior feels predictable and natural
- [ ] Easy to trigger intentionally
- [ ] Hard to trigger accidentally
- [ ] Responsive to user input
- [ ] No fighting with the UI

### Performance
- [ ] No frame drops during rapid scrolling
- [ ] State changes feel instant
- [ ] No memory leaks over long sessions
- [ ] Works smoothly on low-end devices

## Known Limitations

1. **Velocity calculation accuracy**: Depends on browser's scroll event timing
2. **Momentum detection**: May vary across different browsers/devices
3. **Touch vs Mouse**: Different scroll patterns may feel slightly different
4. **Device-specific**: Each device has unique momentum scrolling characteristics

## Debugging Tips

If behavior still feels inconsistent:

1. **Add console logging**:
   ```typescript
   console.log('Scroll delta:', delta, 'velocity:', velocity);
   console.log('Accumulated down:', accumulatedScrollDown.current);
   console.log('Accumulated up:', accumulatedScrollUp.current);
   ```

2. **Visualize accumulation**:
   - Add a progress bar showing distance to threshold
   - Helps identify if accumulation is working correctly

3. **Check for external factors**:
   - Browser extensions
   - OS-level scroll modifications
   - Device-specific scroll behavior
   - CSS interference (overflow, scroll-snap, etc.)

4. **Test in different browsers**:
   - Chrome (Blink engine)
   - Safari (WebKit engine)
   - Firefox (Gecko engine)
   - Mobile browsers (iOS Safari, Chrome Mobile)

## Reporting Issues

If you find inconsistent behavior, please report:
- Device and OS version
- Browser and version
- Specific steps to reproduce
- Expected vs actual behavior
- Screenshots or screen recording if possible
- Console logs (if debugging enabled)
