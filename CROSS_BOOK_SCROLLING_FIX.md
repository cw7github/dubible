# Cross-Book Scrolling Fix

## Problem
When scrolling up from Matthew 1, the app should smoothly scroll to the END of Malachi (chapter 4), but instead there was a delay and it would jump to the wrong position.

## Root Causes Identified

1. **Debounce Delay**: The 300ms debounce was causing a perceivable delay when triggering cross-book scrolling
2. **Scroll Position Restoration**: The scroll position restoration was not reliable due to:
   - Single `requestAnimationFrame` not waiting for full DOM update
   - CSS `scroll-behavior: smooth` interfering with programmatic scroll position changes
3. **Lack of Debugging**: No console logging made it difficult to diagnose issues

## Fixes Applied

### 1. Reduced Debounce (Line 71)
```typescript
// BEFORE
const LOAD_DEBOUNCE_MS = 300; // Minimum time between loads

// AFTER
const LOAD_DEBOUNCE_MS = 100; // Minimum time between loads - reduced for smoother experience
```
**Impact**: Reduces delay from 300ms to 100ms, making the experience feel more responsive while still preventing rapid cascade loads.

### 2. Added Debug Logging (Lines 186, 192)
```typescript
if (firstChapter > 1) {
  prevChapter = await loadChapter(firstBookId, firstChapter - 1);
  console.log(`[InfiniteScroll] Loading previous chapter in ${firstBookId}: ${firstChapter - 1}`);
} else {
  const prevBook = getPreviousBook(firstBookId);
  if (prevBook && prevBook.chapterCount > 0) {
    console.log(`[InfiniteScroll] Loading last chapter of previous book: ${prevBook.id} chapter ${prevBook.chapterCount}`);
    prevChapter = await loadChapter(prevBook.id, prevBook.chapterCount);
    // ...
  }
}
```
**Impact**: Provides visibility into which chapters are being loaded, confirming that Malachi 4 (not Malachi 1) is loaded when scrolling up from Matthew 1.

### 3. Improved Scroll Position Restoration (Lines 217-237)

#### Double requestAnimationFrame
```typescript
// BEFORE
requestAnimationFrame(() => {
  if (container) {
    const scrollHeightAfter = container.scrollHeight;
    container.scrollTop += scrollHeightAfter - scrollHeightBefore;
  }
});

// AFTER
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    if (container) {
      const scrollHeightAfter = container.scrollHeight;
      const heightDifference = scrollHeightAfter - scrollHeightBefore;
      const newScrollTop = scrollTopBefore + heightDifference;

      console.log(`[InfiniteScroll] After adding chapter: scrollHeight=${scrollHeightAfter}, heightDiff=${heightDifference}, newScrollTop=${newScrollTop}`);

      // Temporarily disable smooth scrolling for instant position restoration
      const originalScrollBehavior = container.style.scrollBehavior;
      container.style.scrollBehavior = 'auto';
      container.scrollTop = newScrollTop;
      // Restore smooth scrolling after a brief delay
      setTimeout(() => {
        container.style.scrollBehavior = originalScrollBehavior;
      }, 50);
    }
  });
});
```

**Key improvements**:
- **Double RAF**: Ensures DOM is fully updated before measuring `scrollHeight`
- **Disable smooth scroll**: Temporarily sets `scroll-behavior: auto` to prevent CSS smooth scrolling from interfering with instant position restoration
- **Restore smooth scroll**: After 50ms, restores the original `scroll-behavior` for normal user scrolling
- **Better logging**: Shows exact values for debugging scroll position calculations

### 4. Container Validation (Lines 204-208)
```typescript
const container = containerRef.current;
if (!container) {
  setIsLoadingTop(false);
  return;
}
```
**Impact**: Prevents errors if container is not available and ensures proper cleanup.

## Verification

The code already correctly loads the last chapter of the previous book:
```typescript
// Line 191-193
console.log(`[InfiniteScroll] Loading last chapter of previous book: ${prevBook.id} chapter ${prevBook.chapterCount}`);
prevChapter = await loadChapter(prevBook.id, prevBook.chapterCount);
```

For Malachi, `prevBook.chapterCount` is 4 (as defined in `src/data/bible/books.ts` line 44), so it correctly loads Malachi chapter 4.

## Testing

To verify the fix works:

1. Start the dev server: `npm run dev`
2. Navigate to Matthew chapter 1
3. Scroll up slowly to trigger cross-book loading
4. Check the browser console for logs like:
   ```
   [InfiniteScroll] Loading last chapter of previous book: malachi chapter 4
   [InfiniteScroll] Before adding chapter: scrollHeight=X, scrollTop=Y
   [InfiniteScroll] After adding chapter: scrollHeight=Z, heightDiff=W, newScrollTop=V
   ```
5. Observe that:
   - Malachi chapter 4 is loaded (not chapter 1)
   - The scroll position doesn't jump
   - The transition is smooth
   - Content appears naturally above as you scroll up

## Expected Behavior

When scrolling up from Matthew 1:
1. The intersection observer triggers when reaching the top sentinel
2. After 100ms debounce, `loadPreviousChapter` is called
3. It detects we're at chapter 1 and gets the previous book (Malachi)
4. It loads Malachi chapter 4 (the last chapter, per `chapterCount: 4`)
5. The scroll position is preserved by adjusting `scrollTop` by the height of new content
6. Smooth scrolling is temporarily disabled for instant position update
7. User can continue scrolling up naturally into Malachi 4

## Files Modified

- `/Users/charleswu/Desktop/+/bilingual_bib/src/components/reading/InfiniteScroll.tsx`
  - Line 71: Reduced debounce from 300ms to 100ms
  - Lines 186, 192, 213, 225: Added debug logging
  - Lines 204-208: Added container validation
  - Lines 217-237: Improved scroll position restoration with double RAF and smooth scroll toggle
