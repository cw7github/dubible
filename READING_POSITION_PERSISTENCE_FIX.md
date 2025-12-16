# Reading Position Persistence Fix

## Problem
The app was not remembering the user's reading position across app restarts or phone restarts. It always defaulted back to Matthew 1, losing the user's place in the Bible.

## Root Cause
The `readingStore` was using plain Zustand without the `persist` middleware, meaning all reading position data was stored only in memory and lost when the app closed.

## Solution Implemented

### 1. Added Persistence to Reading Store
**File: `/src/stores/readingStore.ts`**

- Wrapped the store with Zustand's `persist` middleware
- Added `scrollPosition` field to track vertical scroll position within a chapter
- Configured `partialize` to only persist reading position data (not UI state or loaded chapters)
- Persistence key: `bilingual-bible-reading`

**What gets persisted:**
- `currentBookId` - The book being read (e.g., "john", "matthew")
- `currentChapter` - The chapter number
- `currentVerse` - The specific verse (if applicable)
- `scrollPosition` - The scroll offset within the chapter

### 2. Added Scroll Position Save/Restore
**File: `/src/components/reading/InfiniteScroll.tsx`**

#### Saving Scroll Position
- Added debounced scroll position saving (500ms after scroll stops)
- Prevents excessive writes to localStorage during active scrolling
- Calls `onScrollPositionChange` callback with current scroll position

#### Restoring Scroll Position
- Added effect to restore scroll position after initial chapter load
- Uses `requestAnimationFrame` to ensure DOM is fully rendered before restoring
- Only restores on first load, not during infinite scroll navigation

### 3. Integrated with Reading Screen
**File: `/src/components/reading/ReadingScreen.tsx`**

- Passes `scrollPosition` from store to `InfiniteScroll`
- Passes `setScrollPosition` callback for saving position
- Enables bidirectional sync between scroll position and persisted state

### 4. Smart Position Reset
When user intentionally navigates to a different chapter/book:
- Scroll position resets to 0 (top of chapter)
- Only preserves scroll position when returning to the same passage

## Technical Details

### Storage Format
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

### Persistence Layer
- Uses browser's `localStorage` API
- Automatic serialization/deserialization via Zustand persist middleware
- Storage key: `bilingual-bible-reading`

### Performance Considerations
1. **Debounced Writes**: Scroll position is saved 500ms after scrolling stops
2. **Selective Persistence**: Only reading position data is persisted, not UI state
3. **Passive Event Listeners**: Scroll events use passive listeners for better performance
4. **RAF for Restoration**: Uses requestAnimationFrame for smooth scroll position restoration

## Testing

### Manual Testing Steps
1. Open the app
2. Navigate to any book/chapter (e.g., John 3)
3. Scroll down several verses
4. Wait 2 seconds (for debounce to complete)
5. Close and reopen the app (or refresh the page)
6. **Expected**: App should open to John 3 at the same scroll position

### Verification
You can verify persistence is working by:
1. Opening browser DevTools
2. Going to Application → Local Storage
3. Looking for key `bilingual-bible-reading`
4. Observing the stored reading position data

## Files Modified
1. `/src/stores/readingStore.ts` - Added persistence and scroll position tracking
2. `/src/components/reading/ReadingScreen.tsx` - Integrated scroll position with store
3. `/src/components/reading/InfiniteScroll.tsx` - Implemented save/restore logic

## Benefits
- ✅ Reading position persists across app restarts
- ✅ Scroll position within chapter is preserved
- ✅ Works even if phone is restarted
- ✅ No server/cloud sync needed - all local
- ✅ Minimal performance impact due to debouncing
- ✅ Automatic and transparent to the user

## Future Enhancements
Potential improvements that could be added:
1. Cloud sync via Firebase (for cross-device sync)
2. Reading history with multiple positions
3. Per-book reading position tracking
4. Migration from old `settingsStore.lastReadingPosition` if present
