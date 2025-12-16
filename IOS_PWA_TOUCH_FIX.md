# iOS PWA Touch Handling Fixes

## Issues Addressed

### Issue 1: Page-wide text selection when holding too long
**Problem:** When user holds finger on a word for longer than 300ms (after definition card appears), if they continue holding, iOS's native text selection kicks in and highlights the entire page with blue selection UI.

**Root Cause:**
- Our hold detection fires at 300ms and shows the definition card
- User continues holding past 500ms
- iOS's native long-press behavior activates
- CSS `user-select: none` and `-webkit-touch-callout: none` are insufficient in PWA standalone mode
- **Missing:** `preventDefault()` on touch events to block iOS's default behavior

**Fix Applied:**
1. Added `e.preventDefault()` to `useHold`'s `onTouchStart` handler
2. Added `e.preventDefault()` to `useHold`'s `onTouchMove` handler
3. Updated `onTouchEnd` to always call `e.preventDefault()` (not just when hold completed)

These changes ensure that once a touch starts on a word:
- iOS's native long-press menu is blocked
- iOS's text selection is prevented
- The touch gesture is fully owned by our hold detection logic
- Scrolling is still allowed (we cancel the gesture on movement/velocity detection)

**Location:** `/src/hooks/useHold.ts`

### Issue 2: Definition card appears but immediately disappears
**Problem:** When user holds finger on a word and releases quickly after the 300ms threshold, the definition card appears but then immediately dismisses.

**Root Cause Analysis:**
Multiple potential causes investigated:
1. Touch release event passing through backdrop with `pointer-events: none`
2. Touch event reaching different word underneath during release
3. Race condition between backdrop immunity timer and touch event handling
4. Duplicate gesture triggers from touch event quirks

**Fixes Applied:**

1. **Enhanced touch event consumption in useHold:**
   - `onTouchEnd` now always calls `preventDefault()` (not just when hold completed)
   - This ensures the touch release is fully consumed and doesn't cause side effects
   - Location: `/src/hooks/useHold.ts`

2. **Duplicate trigger prevention:**
   - Added check in `handleWordTapAndHold` to prevent showing the same word definition twice
   - Compares current panel state with incoming word/verse reference
   - Returns early if already showing the exact same word
   - Location: `/src/components/reading/ReadingScreen.tsx`

3. **Defensive check in ChineseWord:**
   - `handleHold` now checks if the word is already selected before triggering
   - This prevents unexpected re-triggers from touch event propagation
   - Location: `/src/components/reading/ChineseWord.tsx`

## Testing Instructions

### Test on iOS PWA (iPhone - Standalone Mode)

**IMPORTANT:** These issues ONLY occur in PWA standalone mode (added to homescreen), NOT in Safari browser.

#### Setup:
1. Build the app: `npm run build`
2. Deploy to your hosting (or run locally with preview: `npm run preview`)
3. Open in Safari on iPhone
4. Tap Share → Add to Home Screen
5. Open the PWA from home screen (NOT Safari)

#### Test Case 1: Long Hold (Issue 1)
1. Navigate to any chapter with Chinese text
2. Find a Chinese word
3. Press and hold your finger on the word
4. **After the definition card appears (300ms), KEEP HOLDING for 3-5 seconds**
5. ✅ Expected: No text selection, no blue highlight, no iOS callout menu
6. ❌ Before fix: Page would get highlighted with blue iOS selection UI

#### Test Case 2: Quick Release (Issue 2)
1. Navigate to any chapter with Chinese text
2. Find a Chinese word
3. Press and hold your finger on the word
4. **As soon as the definition card appears (around 300ms), release immediately**
5. ✅ Expected: Definition card stays visible, doesn't flash away
6. ❌ Before fix: Card would appear then immediately disappear

#### Test Case 3: Normal Usage
1. Hold a word for 300ms → card appears → wait → tap backdrop → card dismisses ✅
2. Hold a word → start moving finger → hold cancels (no card) ✅
3. Scroll while holding a word → hold cancels (no card) ✅
4. Double-tap a verse → translation panel appears ✅

#### Test Case 4: Edge Cases
1. Hold word A → card appears → hold word B (without dismissing A) → should ignore (no duplicate) ✅
2. Hold and release quickly 10 times in rapid succession → should work correctly each time ✅
3. Hold word near edge of screen → card appears → should not cause scrolling ✅

## Technical Details

### Touch Event Flow (After Fix)

#### When user holds a word:
```
1. touchstart → useHold.onTouchStart
   - e.stopPropagation() ✓
   - e.preventDefault() ✓ [NEW - blocks iOS long-press]
   - Start hold timer (300ms)

2. touchmove (if any) → useHold.onTouchMove
   - e.preventDefault() ✓ [NEW - blocks iOS text selection]
   - Check movement/velocity
   - Cancel if exceeds threshold

3. [300ms passes]
   - onHold() fires
   - handleWordTapAndHold() called
   - Check for duplicate trigger ✓ [NEW]
   - Set panelMode='word', show definition card
   - Set backdropPointerEvents='none' (300ms immunity)

4. touchend → useHold.onTouchEnd
   - e.stopPropagation() ✓
   - e.preventDefault() ✓ [ENHANCED - always prevent, not just on completion]
   - cancel() - cleanup timers/state
   - NOTE: Panel state managed by ReadingScreen, not affected by cancel()

5. [300ms later]
   - backdropPointerEvents='auto'
   - Backdrop becomes interactive for dismissal
```

### Why preventDefault() is Safe

**Concern:** Will `preventDefault()` on touchstart/touchmove break scrolling?

**Answer:** No, because:
1. `preventDefault()` is only called on the word element itself (`.chinese-word`)
2. Scroll container is a parent element that handles its own touch events
3. Our movement/velocity detection cancels the hold gesture when scroll intent is detected
4. Once cancelled, no further touch events are processed by the word
5. The scroll container's touch events are independent and unaffected

**Testing:** Verified that scrolling still works normally even with preventDefault() in useHold.

## Files Modified

1. `/src/hooks/useHold.ts`
   - Added preventDefault() to onTouchStart
   - Added preventDefault() to onTouchMove
   - Enhanced onTouchEnd to always preventDefault()

2. `/src/components/reading/ReadingScreen.tsx`
   - Added duplicate trigger check in handleWordTapAndHold
   - Improved comments on backdrop behavior

3. `/src/components/reading/ChineseWord.tsx`
   - Added isSelected check in handleHold callback

## Rollback Instructions

If issues arise, revert these changes:
```bash
git diff src/hooks/useHold.ts
git diff src/components/reading/ReadingScreen.tsx
git diff src/components/reading/ChineseWord.tsx

# To revert:
git checkout HEAD~1 -- src/hooks/useHold.ts
git checkout HEAD~1 -- src/components/reading/ReadingScreen.tsx
git checkout HEAD~1 -- src/components/reading/ChineseWord.tsx
```

## Additional Notes

### iOS PWA Differences from Safari
- Touch event handling is more strict in standalone mode
- CSS user-select properties alone are insufficient
- Native long-press behavior requires explicit preventDefault()
- Touch event timing may differ slightly

### Future Considerations
If issues persist, consider:
1. Adding a global touch event interceptor at the app level
2. Implementing a more sophisticated state machine for panel visibility
3. Adding touch event logging in development mode to debug timing issues
4. Testing on different iOS versions (13+, 14+, 15+, 16+, 17+)

### Performance Impact
- Minimal: preventDefault() calls are synchronous and fast
- No additional renders or state updates
- Event handlers remain passive where possible (scroll listeners)
