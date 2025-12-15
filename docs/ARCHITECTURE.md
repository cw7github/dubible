# Architecture Documentation

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Build-time Pipeline                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  FHL Bible API  →  Gemini 2.5 Flash  →  Static JSON         │
│  (信望愛聖經)      (Word Segmentation)    (public/data/)     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Runtime Application                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Preprocessed Loader  →  Zustand Stores  →  React UI        │
│  (fallback: runtime)     (state mgmt)       (components)    │
│                                                               │
│  ↓                      ↓                    ↓               │
│  IndexedDB Cache        localStorage         Framer Motion  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
App.tsx
└── ReadingScreen.tsx                    # Root container
    ├── Header                           # Book/chapter title, nav buttons
    ├── BookNavigator                    # Sidebar for book selection
    ├── TranslationPanel                 # Floating panel (verse or word)
    │   ├── Verse mode: English text
    │   └── Word mode: WordDetailPanel   # Enhanced lexicon entry
    ├── InfiniteScroll                   # Main reading content
    │   └── VerseDisplay[]               # Individual verses
    │       └── ChineseWord[]            # Interactive word components
    ├── AudioPlayer                      # Bottom bar (TTS playback)
    ├── VocabularyScreen                 # Modal for saved words
    └── SettingsScreen                   # Modal for preferences
```

## Data Flow

### 1. Chapter Loading Flow

```
User scrolls/navigates
    ↓
InfiniteScroll detects chapter change
    ↓
Call preprocessedLoader.loadPreprocessedChapter(bookId, chapter)
    ↓
Check manifest.json for availability
    ↓
    ├─ If available: Fetch /data/preprocessed/{book}/chapter-{n}.json
    │       ↓
    │   Convert to Verse[] format
    │       ↓
    │   Add to readingStore.loadedChapters cache
    │       ↓
    │   Render VerseDisplay components
    │
    └─ If missing: Fall back to chineseProcessor.ts (runtime)
            ↓
        Fetch from FHL API
            ↓
        Segment with runtime processor (pinyin-pro + dictionary)
            ↓
        Cache in IndexedDB
            ↓
        Render
```

### 2. Word Interaction Flow

```
User long-presses ChineseWord component
    ↓
useLongPress hook triggers callback
    ↓
ReadingScreen.handleWordLongPress(word, verseRef)
    ↓
Set state:
  - selectedWord = word
  - selectedWordVerseRef = verseRef
  - panelMode = 'word'
    ↓
TranslationPanel renders in 'word' mode
    ↓
WordDetailPanel displays:
  - Chinese character (large)
  - Pinyin
  - Definition
  - Part of speech badge
  - Character breakdown (etymology)
  - Frequency indicator
  - Usage note
  - Save to vocabulary button
    ↓
User taps save
    ↓
vocabularyStore.addWord(word, verseRef)
    ↓
Persists to localStorage
    ↓
SRS scheduling begins (due immediately for first review)
```

### 3. Verse Translation Flow

```
User taps on verse number or verse text
    ↓
VerseDisplay.handleTap()
    ↓
ReadingScreen.handleVerseTap(verseRef)
    ↓
Set state:
  - selectedVerseRef = verseRef
  - panelMode = 'verse'
    ↓
TranslationPanel renders in 'verse' mode
    ↓
getEnglishVerse(bookId, chapter, verse)
    ↓
Returns BSB English text (bundled)
    ↓
Display with BSB attribution
```

## State Management

### Zustand Stores Architecture

```typescript
// readingStore.ts - Current reading position
{
  currentBookId: string;           // 'matthew'
  currentChapter: number;          // 1
  currentVerse: number | null;

  currentBook: Book | null;        // Book metadata
  loadedChapters: Map<string, Chapter>;  // Chapter cache

  isLoading: boolean;
  error: string | null;

  selectedWord: SegmentedWord | null;
  selectedWordVerse: VerseReference | null;

  isAudioPlaying: boolean;
  audioCurrentWord: number | null;
}

// vocabularyStore.ts - Saved words with SRS
{
  words: SavedWord[];  // Persisted to localStorage

  // SavedWord structure:
  {
    id: string;
    chinese: string;
    pinyin: string;
    definition: string;
    partOfSpeech?: string;
    hskLevel?: number;
    sourceVerse: VerseReference;
    srsData: {
      interval: number;        // Days until next review
      streak: number;          // Consecutive correct reviews
      lastReview: number | null;
      nextReview: number;      // Timestamp
      status: 'learning' | 'reviewing' | 'mastered';
    };
    createdAt: number;
    updatedAt: number;
  }
}

// settingsStore.ts - User preferences
{
  fontFamily: 'sans' | 'serif';
  textSize: 'sm' | 'base' | 'lg' | 'xl';
  showHskIndicators: boolean;
  theme: 'light' | 'sepia' | 'dark';
  showPinyin: boolean;
  // Persisted to localStorage
}

// bookmarkStore.ts - Saved verses
{
  bookmarks: Bookmark[];
  // Persisted to localStorage
}
```

### Store Persistence

- **readingStore**: Not persisted (ephemeral)
- **vocabularyStore**: Persisted via Zustand middleware → localStorage key: `bilingual-bible-vocabulary`
- **settingsStore**: Persisted → localStorage key: `bilingual-bible-settings`
- **bookmarkStore**: Persisted → localStorage key: `bilingual-bible-bookmarks`

## Services Layer

### bibleApi.ts
**Purpose**: Fetch Chinese Bible text from 信望愛 (FHL) API

**Key Functions**:
- `fetchChapter(bookId, chapter)`: Get all verses
- `fetchVerseRange(bookId, chapter, start, end)`: Get verse range
- `getChineseAbbreviation(bookId)`: Map ID to Chinese (太, 約, etc.)

**API Endpoint**: `https://bible.fhl.net/json/qb.php`
**Version**: CNV (新譯本)

### preprocessedLoader.ts
**Purpose**: Load pre-computed word segmentation from static JSON

**Key Functions**:
- `loadPreprocessedChapter(bookId, chapter)`: Fetch preprocessed JSON
- `hasPreprocessedData(bookId, chapter)`: Check manifest
- `getPreprocessedBookInfo(bookId)`: Get book metadata
- `downloadBookForOffline(bookId, onProgress)`: Bulk download

**Data Source**: `/data/preprocessed/{bookId}/chapter-{n}.json`
**Manifest**: `/data/preprocessed/manifest.json`

**Caching**: In-memory `Map<string, PreprocessedChapter>`

### chineseProcessor.ts
**Purpose**: Runtime fallback for Chinese word segmentation

**Libraries Used**:
- `pinyin-pro`: Pinyin generation with tones
- `opencc-js`: Traditional ↔ Simplified conversion

**Process**:
1. Segment text using jieba-style algorithm
2. Generate pinyin for each word
3. Look up definitions in bundled dictionary
4. Assign HSK levels
5. Calculate character positions

**Note**: Quality lower than Gemini preprocessing, but provides coverage

### bibleCache.ts
**Purpose**: IndexedDB caching for Bible data

**Database**: `bilingual-bible-db`
**Stores**:
- `chapters`: Cached chapter data
- `verses`: Cached verse data

**Operations**:
- `cacheChapter(bookId, chapter, verses)`
- `getCachedChapter(bookId, chapter)`
- `clearCache()`

## Type System

### Core Bible Types

```typescript
// Verse with segmented words
interface Verse {
  number: number;
  text: string;
  words?: SegmentedWord[];
}

// Word with enhanced linguistic data
interface SegmentedWord {
  chinese: string;
  pinyin: string;
  definition?: string;
  partOfSpeech?: string;         // POS code
  hskLevel?: number;              // 1-6
  isName?: boolean;               // Biblical names
  nameType?: 'person' | 'place' | 'group';
  breakdown?: CharacterBreakdown[];  // Etymology
  freq?: 'common' | 'uncommon' | 'rare' | 'biblical';
  note?: string;                  // Usage insight
  startIndex: number;
  endIndex: number;
}

// Character breakdown for compounds
interface CharacterBreakdown {
  c: string;  // Character
  m: string;  // Meaning
}

// Chapter container
interface Chapter {
  number: number;
  verses: Verse[];
}

// Book metadata
interface Book {
  id: string;                     // 'matthew'
  name: {
    chinese: string;              // '馬太福音'
    english: string;              // 'Matthew'
    pinyin: string;               // 'Mǎtài Fúyīn'
  };
  testament: 'old' | 'new';
  chapterCount: number;           // 28
  chapters?: Chapter[];
}

// Reference for bookmarks/vocabulary
interface VerseReference {
  bookId: string;
  chapter: number;
  verse: number;
}
```

## Custom Hooks

### useLongPress
**Purpose**: Detect long press gestures on mobile
**Usage**: Word selection in `ChineseWord.tsx`
**Params**: `callback`, `delay` (default 500ms)

### useFocusMode
**Purpose**: Hide UI chrome when scrolling down for immersive reading
**Returns**: `{ isHidden, scrollRef }`
**Logic**: Track scroll direction, hide on down-scroll, show on up-scroll

### useScrollDismiss
**Purpose**: Dismiss panels when user scrolls
**Params**: `isVisible`, `onDismiss`, `scrollContainerRef`, `scrollThreshold`
**Returns**: `{ opacity }` for smooth fade

### useAudioPlayer
**Purpose**: Text-to-speech audio playback with word highlighting
**Params**: `bookId`, `chapter`, `onVerseChange`
**Returns**: Play controls, timing data, current word index

## Animation System (Framer Motion)

### Key Patterns

**Panel transitions**:
```tsx
<motion.div
  initial={{ y: -20, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  exit={{ y: -20, opacity: 0 }}
  transition={{ type: 'spring', damping: 28, stiffness: 400 }}
>
```

**Focus mode**:
```tsx
<motion.nav
  animate={{ y: isFocusMode ? 80 : 0 }}
  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
>
```

**Chapter transitions**:
```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>
```

## Preprocessing Architecture

### Script Flow

```
1. Parse CLI args (--book, --chapter, --all)
    ↓
2. Initialize Gemini API client
    ↓
3. For each chapter:
    ├─ Fetch verses from FHL API
    ├─ Batch into groups of 5 verses
    ├─ For each batch:
    │   ├─ Build prompt with segmentation rules
    │   ├─ Call Gemini generateContent()
    │   ├─ Parse JSON response
    │   ├─ Retry on failure (max 3 times)
    │   └─ Rate limit delay (1000ms)
    └─ Save to public/data/preprocessed/{book}/chapter-{n}.json
    ↓
4. Update manifest.json
```

### Gemini Prompt Structure

**Input**:
```
SEGMENTATION RULES:
  - Keep names together (亞伯拉罕)
  - Keep compounds together (天國)
  - Punctuation as separate entries

FOR EACH WORD, PROVIDE:
  1. chinese
  2. pinyin (with tones: Yēsū)
  3. definition (1-5 words)
  4. pos (n, v, adj, ...)
  5. isName (boolean)
  6. nameType (person/place/group)
  7. breakdown (character meanings)
  8. freq (common/uncommon/rare/biblical)
  9. note (optional, <15 words)

VERSES:
  1. 耶穌基督的家譜...
  2. 亞伯拉罕生以撒...

EXAMPLE OUTPUT FORMAT:
  [{"verse": 1, "words": [...]}]
```

**Output**: JSON array of verses with segmented words

### Data Format

**Preprocessed chapter JSON**:
```json
{
  "book": "Matthew",
  "bookId": "matthew",
  "chapter": 1,
  "verses": [
    {
      "number": 1,
      "text": "耶穌基督的家譜...",
      "words": [
        {
          "chinese": "耶穌基督",
          "pinyin": "Yēsū Jīdū",
          "definition": "Jesus Christ",
          "pos": "prop",
          "isName": true,
          "nameType": "person",
          "freq": "biblical",
          "note": "Transliteration of Jesus Christ"
        }
      ]
    }
  ],
  "processedAt": "2024-12-14T20:00:00.000Z"
}
```

**Manifest JSON**:
```json
{
  "version": "1.0.0",
  "generatedAt": "2024-12-14T20:00:00.000Z",
  "books": {
    "matthew": {
      "bookId": "matthew",
      "bookName": "Matthew",
      "chapterCount": 28,
      "chapters": [1, 2, 3]
    }
  }
}
```

## PWA Configuration

### Service Worker (Workbox)

**Cache Strategies**:
- **Precache**: HTML, JS, CSS, fonts
- **Runtime Cache**: Google Fonts (CacheFirst, 1 year)
- **Max file size**: 6MB (for bundled data)

**Offline Support**:
- Preprocessed JSON files cached by service worker
- IndexedDB for dynamic data
- localStorage for user data (vocabulary, settings)

### Manifest

```json
{
  "name": "Bilingual Bible",
  "short_name": "BilingualBible",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#FDFCFA",
  "background_color": "#FDFCFA"
}
```

## Performance Optimizations

1. **Static JSON**: Preprocessed data loaded directly, no computation
2. **Lazy Loading**: Chapters loaded on-demand via infinite scroll
3. **Caching**: Multi-layer (in-memory → IndexedDB → service worker)
4. **Virtual Scrolling**: Only render visible verses
5. **Code Splitting**: Route-based chunks (via Vite)
6. **Font Optimization**: Preload Chinese fonts, subsetting

## Design System

### Color Variables (CSS Custom Properties)

```css
--bg-primary: #FDFCFA
--bg-secondary: #F5F3EF
--text-primary: #2C2822
--text-secondary: #6B665F
--text-tertiary: #9B9690
--accent: #C9A871
--border: #E5E2DD
```

### Typography

- **Chinese Serif**: Noto Serif TC (elegant, traditional)
- **Chinese Sans**: Noto Sans TC (clean, modern)
- **English Body**: Inter (readable, professional)
- **Pinyin**: Italic Inter (distinguished from definitions)

### Spacing Scale

Tailwind default + Chinese-specific adjustments:
- Verse spacing: `py-4` (1rem)
- Word spacing: `px-1` (0.25rem)
- Panel padding: `px-5 py-4`

## Security Considerations

1. **API Keys**: Gemini API key never exposed to client (build-time only)
2. **XSS Prevention**: React's built-in escaping
3. **CSP**: Content Security Policy headers recommended for production
4. **Input Sanitization**: Bible text trusted (from FHL API), no user input

## Scalability

**Current**:
- 66 books × ~30 avg chapters = ~2000 chapters
- ~5KB per chapter JSON = ~10MB total preprocessed data

**Future**:
- Additional translations (parallel text)
- Audio files (streaming vs. bundled)
- User annotations (cloud sync)

## Browser Compatibility

**Target**: Modern mobile browsers (iOS Safari 14+, Chrome Android 90+)

**Features Used**:
- CSS Grid / Flexbox
- IntersectionObserver (infinite scroll)
- Service Workers (PWA)
- IndexedDB (caching)
- Web Audio API (future TTS)

**Not Supported**: IE11, older Android WebView
