# Testing Guide: Reading Position Persistence

## Quick Test (5 minutes)

### Test 1: Basic Position Persistence
1. **Start the app**: `npm run dev`
2. **Navigate**: Go to any book/chapter (e.g., John 3)
3. **Scroll**: Scroll down about halfway through the chapter
4. **Wait**: Wait 2-3 seconds (for auto-save to complete)
5. **Refresh**: Hit F5 or refresh the browser
6. **Verify**: The app should return to John 3 at the same scroll position

**Expected Result**: ✅ Same book, chapter, and scroll position

### Test 2: Cross-Session Persistence
1. **Navigate**: Go to Romans 8
2. **Scroll**: Scroll to verse 28
3. **Wait**: 2-3 seconds
4. **Close**: Close the browser tab completely
5. **Reopen**: Open a new tab to `http://localhost:5173`
6. **Verify**: Should open to Romans 8 at the same scroll position

**Expected Result**: ✅ Position persisted across browser sessions

### Test 3: Intentional Navigation Resets Scroll
1. **Current**: You're at Romans 8 (scrolled down)
2. **Navigate**: Use the book navigator to go to Matthew 1
3. **Verify**: Should be at the TOP of Matthew 1 (scroll position reset)
4. **Scroll**: Scroll down in Matthew 1
5. **Navigate**: Go to John 1
6. **Go Back**: Use browser back or navigate back to Matthew 1
7. **Verify**: Should be at TOP of Matthew 1 (not the previous scroll position)

**Expected Result**: ✅ Scroll position resets when intentionally changing chapters

### Test 4: Infinite Scroll Preserves Context
1. **Start**: At Matthew 5 (scrolled to verse 20)
2. **Scroll Down**: Continue scrolling until you reach Matthew 6
3. **Wait**: 2-3 seconds
4. **Refresh**: Refresh the page
5. **Verify**: Should open to Matthew 6 (the chapter you scrolled to)

**Expected Result**: ✅ Infinite scroll updates persisted position

## Developer Tools Verification

### Check LocalStorage
1. Open Chrome DevTools (F12)
2. Go to **Application** → **Local Storage** → `http://localhost:5173`
3. Look for key: `bilingual-bible-reading`
4. Value should look like:
```json
{
  "state": {
    "currentBookId": "john",
    "currentChapter": 3,
    "currentVerse": null,
    "scrollPosition": 1234
  },
  "version": 0
}
```

### Watch Auto-Save in Action
1. Open DevTools Console
2. Add `?debugScroll` to the URL: `http://localhost:5173?debugScroll`
3. Scroll around - you should see console logs:
   - `[InfiniteScroll] Saved scroll position: XXX`
   - `[InfiniteScroll] Restored scroll position: XXX`

## Testing on Mobile/PWA

### iOS Safari Test
1. Open Safari on iPhone
2. Navigate to the app
3. Go to John 3, scroll down
4. **Force close** Safari (swipe up from app switcher)
5. Wait 5 seconds
6. Reopen Safari
7. Navigate back to the app
8. **Verify**: Should return to John 3 at the same scroll position

### PWA Test (Add to Home Screen)
1. Add the app to home screen
2. Open the PWA
3. Navigate and scroll
4. **Force close** the PWA
5. Reopen from home screen
6. **Verify**: Position is preserved

### Phone Restart Test
1. Navigate to a specific position
2. Wait for auto-save
3. **Restart the phone** (full power off/on)
4. Open the app
5. **Verify**: Position is preserved even after device restart

**Expected Result**: ✅ Position persists through all these scenarios

## Edge Cases to Test

### Edge Case 1: First Time User
- **Action**: Clear localStorage and open app
- **Expected**: Opens to Matthew 1 (default)

### Edge Case 2: Invalid Stored Data
1. Open DevTools → Application → Local Storage
2. Modify `bilingual-bible-reading` to invalid JSON
3. Refresh app
4. **Expected**: Falls back to Matthew 1, no error

### Edge Case 3: Rapid Navigation
1. Quickly navigate between multiple chapters
2. Don't wait for auto-save
3. Refresh
4. **Expected**: Saves the last chapter you stopped on

### Edge Case 4: Character Set Change
1. Navigate to John 3, scroll down
2. Settings → Change Traditional ↔ Simplified
3. **Expected**: Stays in John 3, maintains scroll position

## Performance Testing

### Auto-Save Debounce Test
1. Open DevTools Console with `?debugScroll`
2. Scroll continuously for 5 seconds
3. Stop scrolling
4. **Verify**: Only ONE "Saved scroll position" log appears ~500ms after stopping
5. **Expected**: No excessive localStorage writes during active scrolling

### Memory Leak Test
1. Navigate through 10+ chapters
2. Open DevTools → Memory → Take heap snapshot
3. Continue navigating for 5 minutes
4. Take another heap snapshot
5. **Expected**: No significant memory growth from persistence logic

## Troubleshooting

### Position Not Saving?
1. Check browser supports localStorage: Open console, run `localStorage.setItem('test', '1')`
2. Check for browser extensions blocking localStorage
3. Verify auto-save timeout completes (wait 2+ seconds after scrolling)

### Position Not Restoring?
1. Check DevTools → Application → Local Storage for the data
2. Try with `?debugScroll` to see restore logs
3. Check browser console for errors during hydration

### Scroll Jumps or Glitches?
1. Verify only ONE scroll restoration happens (check console with `?debugScroll`)
2. Check if scroll position value is reasonable (not negative or extremely large)
3. Try clearing localStorage and restarting fresh

## Automated Testing (Future)

```javascript
// Example Playwright test
test('reading position persists across page refresh', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Navigate to John 3
  await page.click('[data-testid="book-navigator"]');
  await page.click('text=John');
  await page.click('text=Chapter 3');

  // Scroll down
  await page.evaluate(() => window.scrollTo(0, 500));

  // Wait for auto-save
  await page.waitForTimeout(2000);

  // Refresh page
  await page.reload();

  // Verify position
  const scrollPosition = await page.evaluate(() => window.scrollY);
  expect(scrollPosition).toBeGreaterThan(400);
  expect(scrollPosition).toBeLessThan(600);
});
```

## Success Criteria

All tests pass if:
- ✅ Reading position persists across page refreshes
- ✅ Scroll position within chapter is preserved
- ✅ Works after closing and reopening browser
- ✅ Works after phone restart
- ✅ Intentional navigation resets scroll position appropriately
- ✅ No excessive localStorage writes (debouncing works)
- ✅ No errors in console
- ✅ Works in Chrome, Safari, Firefox
- ✅ Works on iOS and Android
