# Architecture Documentation

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Build-time Pipeline                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  FHL Bible API  →  Gemini 2.5 Flash  →  Static JSON         │
│  (信望愛聖經)      (via OpenRouter)      (public/data/)      │
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
│  IndexedDB Cache        Firebase Sync        Framer Motion  │
│  (Dexie)                (Firestore)          (animations)   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Cloud Services                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Firebase Auth  →  Firestore Database  →  Cross-device Sync │
│  (Google/FB)       (vocabulary/settings)   (real-time)      │
│                                                               │
│  OpenAI TTS     →  Audio Pronunciation  →  Word Popups      │
│  (optional)        (fallback: Web Speech)                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
App.tsx
├── useSyncManager                       # Firebase sync orchestration
└── ReadingScreen.tsx                    # Root container
    ├── Header                           # Book/chapter title, nav buttons, sync status
    ├── BookNavigator                    # Full-screen book/chapter selection
    │   ├── OT/NT Testament tabs (舊約/新約 with pinyin)
    │   ├── Search with verse navigation (e.g., "2 Cor 11:6")
    │   └── Chapter grid with responsive sizing
    ├── TranslationPanel                 # Floating panel (verse or word)
    │   ├── Verse mode: English text (BSB)
    │   └── Word mode: WordDetailPanel   # Enhanced lexicon entry
    │       └── Audio pronunciation button (TTS)
    ├── InfiniteScroll                   # Main reading content
    │   ├── Scroll-to-verse on search navigation
    │   ├── Reading plan passage indicators
    │   └── VerseDisplay[]               # Individual verses
    │       └── ChineseWord[]            # Interactive word components
    │           └── Pinyin (conditional based on level)
    ├── AudioPlayer                      # Bottom bar (TTS playback)
    ├── VocabularyScreen                 # Modal for saved words
    │   ├── Word list (tap to open review card)
    │   └── FlashcardReview              # SRS-based review
    │       └── Clickable verse reference (navigate to source)
    ├── SettingsScreen                   # Modal for preferences
    │   ├── Account section (auth)
    │   ├── Pinyin level selector (6 levels)
    │   ├── Character set (traditional/simplified)
    │   └── Bible translation selector
    ├── LoginScreen                      # Google/Facebook OAuth
    └── ProfileScreen                    # User profile, sign out
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
// authStore.ts - Authentication state
{
  user: UserProfile | null;        // {uid, email, displayName, photoURL, provider}
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isSyncing: boolean;
  lastSyncTime: number | null;
  syncError: string | null;
  isFirebaseAvailable: boolean;

  // Actions
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signOut: () => Promise<void>;
}

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
  words: SavedWord[];  // Persisted to localStorage, synced to Firestore

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
  theme: 'light' | 'sepia' | 'dark';
  fontFamily: 'serif' | 'sans';
  textSize: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  pinyinLevel: 'all' | 'hsk2+' | 'hsk4+' | 'hsk5+' | 'hsk6+' | 'none';
  characterSet: 'traditional' | 'simplified';
  showHskIndicators: boolean;
  chineseVersion: string;          // 'cnv'
  englishVersion: string;          // 'bsb'
  audioSpeed: 0.75 | 1 | 1.25;
  lastReadingPosition: {...} | null;
  // Persisted to localStorage, synced to Firestore
}

// bookmarkStore.ts - Saved verses
{
  bookmarks: Bookmark[];           // With notes, synced to Firestore
}

// historyStore.ts - Reading history navigation
{
  entries: HistoryEntry[];         // [{bookId, chapter, timestamp}]
  currentIndex: number;            // For back/forward navigation

  // Actions
  pushEntry: (bookId, chapter) => void;
  goBack: () => HistoryEntry | null;
  goForward: () => HistoryEntry | null;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
}
```

### Store Persistence & Sync

| Store | localStorage | Firestore Sync |
|-------|--------------|----------------|
| authStore | No | N/A (manages auth state) |
| readingStore | No (ephemeral) | No |
| vocabularyStore | Yes | Yes (when authenticated) |
| settingsStore | Yes | Yes (when authenticated) |
| bookmarkStore | Yes | Yes (when authenticated) |
| historyStore | Yes | Yes (when authenticated) |

**Sync Behavior:**
- When signed out: Data stored locally only
- On first sign-in: Local data automatically migrates to Firestore
- When signed in: Changes sync in real-time across devices
- Offline: Changes cached locally and synced when online

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

### useHold
**Purpose**: Unified hold gesture with visual feedback and progress tracking
**Params**: `{ onHold, onHoldStart, onHoldCancel, onHoldProgress, threshold, movementTolerance }`
**Returns**: Touch event handlers for the target element
**Features**: 60fps progress updates, haptic feedback, 10px movement tolerance

### useScrollDismiss
**Purpose**: Dismiss panels when user scrolls
**Params**: `isVisible`, `onDismiss`, `scrollContainerRef`, `scrollThreshold`
**Returns**: `{ opacity }` for smooth fade

### useAudioPlayer
**Purpose**: Text-to-speech audio playback with word highlighting
**Params**: `bookId`, `chapter`, `onVerseChange`
**Returns**: Play controls, timing data, current word index

### useTwoFingerSwipe
**Purpose**: Detect two-finger horizontal swipe gestures for navigation
**Params**: `{ onSwipeLeft, onSwipeRight, threshold, enabled }`
**Usage**: Navigate back/forward through passage history
**Logic**: Track two-finger touch midpoint, fire callback on horizontal swipe exceeding threshold

### usePassageHistory
**Purpose**: Manage passage viewing history with back/forward navigation
**Params**: `{ currentBookId, currentChapter, onNavigate }`
**Returns**: `{ goBack, goForward, canGoBack, canGoForward, trackCurrentPassage }`
**Integration**: Works with historyStore for persistence

### useSyncManager
**Purpose**: Orchestrate Firebase sync between local stores and Firestore
**Behavior**:
- Monitors auth state changes
- On sign-in: Migrates local data to cloud, then syncs
- On sign-out: Keeps local copy
- Handles real-time sync for vocabulary, bookmarks, history, settings

## Services Layer (Additional)

### ttsService.ts
**Purpose**: Text-to-speech for Chinese word pronunciation

**Features**:
- OpenAI TTS integration (high-quality "nova" voice)
- Web Speech API fallback (browser built-in)
- Audio caching to reduce API calls
- Automatic provider detection

**Usage**:
```typescript
import { ttsService } from './services';

// Speak a word
await ttsService.speak({
  text: '耶穌',
  lang: 'zh-CN',
  onStart: () => setIsPlaying(true),
  onEnd: () => setIsPlaying(false),
  onError: (err) => console.error(err),
});

// Stop playback
ttsService.stop();

// Check provider info
const { provider, quality } = ttsService.getProviderInfo();
// { provider: 'openai', quality: 'high' } or
// { provider: 'webspeech', quality: 'low' }
```

**Configuration**: Set `VITE_OPENAI_API_KEY` in `.env.local` for OpenAI TTS

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
1. Parse CLI args (--book, --chapter, --start, --all)
    ↓
2. Validate OpenRouter API key (OPENROUTER_API_KEY env var)
    ↓
3. For each chapter:
    ├─ Fetch verses from FHL API (using Chinese abbreviation)
    ├─ Strip cross-references and HTML from verse text
    ├─ Batch into groups of 5 verses
    ├─ For each batch:
    │   ├─ Build prompt with segmentation rules
    │   ├─ Call OpenRouter API (google/gemini-2.5-flash)
    │   ├─ Parse JSON response (clean markdown if present)
    │   ├─ Retry on failure (max 3 times with exponential backoff)
    │   └─ Rate limit delay (1000ms between batches)
    └─ Save to public/data/preprocessed/{book}/chapter-{n}.json
    ↓
4. Run `npm run generate-manifest` to update manifest.json
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
