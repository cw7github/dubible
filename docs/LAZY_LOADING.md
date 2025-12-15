# Lazy Loading Implementation for Preprocessed Bible Data

This document describes the lazy loading system for preprocessed Bible data in the Bilingual Bible app.

## Overview

The app now supports lazy loading of preprocessed Bible chapters on a per-book basis. This allows the app to work efficiently with partial preprocessed data (only some books or chapters available) while falling back to runtime processing when needed.

## Key Features

1. **Manifest-based discovery**: A `manifest.json` file tracks which books and chapters have preprocessed data available
2. **Lazy loading**: Chapters are only fetched when actually needed (no preloading)
3. **Graceful fallback**: If preprocessed data isn't available, the app falls back to runtime processing
4. **Loading indicators**: Subtle UI feedback when fetching preprocessed data
5. **Offline download**: Users can download entire books for offline use with progress tracking

## Architecture

### 1. Manifest System (`public/data/preprocessed/manifest.json`)

The manifest file provides a registry of available preprocessed data:

```json
{
  "version": "1.0.0",
  "generatedAt": "2024-01-01T00:00:00.000Z",
  "books": {
    "matthew": {
      "bookId": "matthew",
      "bookName": "Matthew",
      "chapterCount": 28,
      "chapters": [1, 2, 3, 4]
    }
  }
}
```

**Generating the manifest:**
```bash
npm run generate-manifest
```

This scans `public/data/preprocessed/` and generates the manifest automatically.

### 2. Preprocessed Loader (`src/services/preprocessedLoader.ts`)

The loader provides functions for:

- **Manifest loading**: `loadManifest()` - fetches and caches the manifest
- **Chapter checking**: `hasPreprocessedData(bookId, chapter)` - checks if a chapter exists
- **Book info**: `getPreprocessedBookInfo(bookId)` - gets metadata for a book
- **Chapter loading**: `loadPreprocessedChapter(bookId, chapter)` - fetches chapter data
- **Offline download**: `downloadBookForOffline(bookId, onProgress)` - downloads entire book
- **Download status**: `isBookDownloaded(bookId)` - checks if book is downloaded

#### Key Design Decisions

1. **Manifest caching**: The manifest is loaded once and cached in memory
2. **Chapter caching**: Loaded chapters are cached in a Map for instant re-access
3. **Graceful degradation**: All functions return null/false on error, allowing fallback
4. **No preloading**: Chapters are only fetched when `loadPreprocessedChapter()` is called

### 3. Bible Cache Integration (`src/services/bibleCache.ts`)

The cache service tries preprocessed data first before falling back to the API:

```typescript
// Try preprocessed data first (highest quality)
const preprocessedVerses = await loadPreprocessedChapter(bookId, chapterNum);
if (preprocessedVerses && preprocessedVerses.length > 0) {
  // Use preprocessed data
  return { number: chapterNum, verses: preprocessedVerses };
}

// Fall back to API if no preprocessed data
const apiRecords = await fetchChapter(bookId, chapterNum);
// ... process API data
```

### 4. UI Loading States (`src/components/reading/InfiniteScroll.tsx`)

A subtle loading indicator appears when fetching preprocessed data:

- Fixed position overlay at top of screen
- Shows only during data fetch (typically very fast)
- Automatically hidden when data loads or on error
- Doesn't block user interaction

### 5. Offline Download Feature (`src/components/navigation/OfflineDownload.tsx`)

Each book in the navigator shows a download button if preprocessed data is available:

- **Download button**: Fetches all chapters for the book
- **Progress indicator**: Shows current/total chapters during download
- **Downloaded status**: Shows checkmark when complete
- **Remove option**: Tap downloaded status to clear from localStorage
- **Persistence**: Download status stored in localStorage

## Data Flow

```
User navigates to chapter
         ↓
InfiniteScroll.loadChapter()
         ↓
bibleCache.getChapter()
         ↓
preprocessedLoader.loadPreprocessedChapter()
         ↓
   Checks manifest
         ↓
    ┌─────────────────┐
    ↓                 ↓
  Found            Not Found
    ↓                 ↓
Fetch JSON       Return null
    ↓                 ↓
Cache result    Fall back to
    ↓            runtime API
Return verses        ↓
         ↓            ↓
    Display chapter
```

## File Structure

```
public/data/preprocessed/
├── manifest.json           # Registry of available data
└── matthew/
    ├── chapter-1.json
    ├── chapter-2.json
    ├── chapter-3.json
    └── chapter-4.json

src/services/
├── preprocessedLoader.ts   # Main loader service
└── bibleCache.ts          # Cache integration

src/components/
├── reading/
│   └── InfiniteScroll.tsx # Loading states
└── navigation/
    ├── BookNavigator.tsx  # Download UI integration
    └── OfflineDownload.tsx # Download component

scripts/
└── generate-manifest.cjs  # Manifest generator
```

## Adding New Preprocessed Data

1. Run the preprocessing script to generate chapter files:
   ```bash
   # (Preprocessing script not modified by this implementation)
   ```

2. Generate the manifest to register the new data:
   ```bash
   npm run generate-manifest
   ```

3. The app will automatically detect and use the new preprocessed data

## Offline Download Workflow

### User Flow:
1. Open book navigator
2. Expand a book
3. Click "Download" button
4. See progress (e.g., "3/28")
5. Button changes to "Offline" with checkmark
6. Data persists in browser cache

### Technical Flow:
```typescript
User clicks Download
         ↓
downloadBookForOffline(bookId)
         ↓
Get book info from manifest
         ↓
For each chapter:
  - loadPreprocessedChapter()
  - Cache in Map
  - Update progress callback
         ↓
Store status in localStorage
```

### Storage:
```javascript
localStorage.setItem('preprocessed_downloads', JSON.stringify({
  matthew: {
    downloadedAt: 1234567890,
    chapterCount: 28
  }
}));
```

## Performance Considerations

1. **Manifest**: ~1-2 KB, loaded once per session
2. **Chapter files**: ~5-20 KB each, loaded on demand
3. **Memory cache**: Chapters stay in memory until page reload
4. **IndexedDB**: Preprocessed data also cached in Dexie for offline use
5. **Network**: Only fetches what's needed, no bulk downloads unless user requests

## Backward Compatibility

The implementation is fully backward compatible:

- Works with no preprocessed data (falls back to runtime)
- Works with partial preprocessed data (mixed books)
- Existing runtime processing remains unchanged
- No breaking changes to existing APIs

## Error Handling

All errors are handled gracefully:

1. **Missing manifest**: App works with runtime processing only
2. **Missing chapter**: Falls back to runtime processing
3. **Network errors**: Returns null, cache may serve stale data
4. **Parse errors**: Logged to console, falls back to runtime

## Testing

To test the lazy loading implementation:

1. **Check manifest loading**:
   - Open DevTools Network tab
   - Load the app
   - Verify `manifest.json` is fetched once

2. **Check chapter loading**:
   - Navigate to a preprocessed chapter (e.g., Matthew 1)
   - Verify `chapter-1.json` is fetched
   - Navigate away and back
   - Verify chapter is served from cache (no network request)

3. **Check fallback**:
   - Navigate to a non-preprocessed chapter
   - Verify app falls back to API without errors

4. **Check offline download**:
   - Open book navigator
   - Expand Matthew
   - Click Download
   - Watch progress indicator
   - Verify "Offline" status appears

## Future Enhancements

Potential improvements for future versions:

1. **Batch downloads**: Download multiple books at once
2. **Auto-download**: Download adjacent chapters automatically
3. **Progress notifications**: Toast notifications for download completion
4. **Storage management**: Show storage usage in settings
5. **Smart prefetch**: Predict next chapter and prefetch
6. **Service worker**: Cache preprocessed data with service worker
7. **Compression**: Use gzip/brotli for smaller chapter files

## Developer Notes

- The manifest must be regenerated after adding new preprocessed data
- Chapter files must follow the naming pattern: `chapter-{num}.json`
- Book directories must match book IDs from `src/data/bible/books.ts`
- The loader is resilient to missing files (development-friendly)
- localStorage is used for download tracking (simple, synchronous)
- Consider adding compression if chapter files grow large (>50 KB)
