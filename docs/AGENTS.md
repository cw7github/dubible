# AI Agent Guide - Bilingual Bible PWA

This document helps AI agents (Claude Code, Cursor, etc.) understand and contribute to this project effectively.

## Project Overview

A Progressive Web App (PWA) for Chinese learners reading the Bible in Chinese with English translations. The app provides word-level Chinese segmentation, pinyin, definitions, and vocabulary building features.

**Key Innovation**: Uses Gemini 2.5 Flash API at build-time to preprocess all Bible text with high-quality word segmentation, linguistic metadata, and definitions - eliminating the need for runtime dictionary lookups.

**Tech Stack**: React 19, TypeScript, Zustand (state), Vite, TailwindCSS, Framer Motion

## Directory Structure

```
bilingual_bib/
├── src/
│   ├── components/
│   │   ├── reading/          # Main reading interface
│   │   │   ├── ReadingScreen.tsx      # Root component with infinite scroll
│   │   │   ├── TranslationPanel.tsx   # Shows English verse translation
│   │   │   ├── WordDetailPanel.tsx    # Enhanced word definitions
│   │   │   ├── VerseDisplay.tsx       # Individual verse rendering
│   │   │   ├── ChineseWord.tsx        # Interactive word component
│   │   │   └── InfiniteScroll.tsx     # Chapter continuity
│   │   ├── vocabulary/       # Vocabulary and flashcard review
│   │   ├── navigation/       # Book navigator, header
│   │   └── settings/         # App settings
│   ├── stores/               # Zustand state management
│   │   ├── readingStore.ts           # Current position, loaded chapters
│   │   ├── vocabularyStore.ts        # Saved words with SRS
│   │   ├── settingsStore.ts          # User preferences
│   │   └── bookmarkStore.ts          # Bookmarks
│   ├── services/
│   │   ├── bibleApi.ts               # FHL Bible API client
│   │   ├── preprocessedLoader.ts     # Load preprocessed JSON
│   │   ├── chineseProcessor.ts       # Runtime fallback processor
│   │   └── bibleCache.ts             # IndexedDB caching
│   ├── types/                # TypeScript definitions
│   │   ├── bible.ts                  # Verse, SegmentedWord, Chapter
│   │   ├── vocabulary.ts             # SavedWord, SRS data
│   │   └── settings.ts
│   ├── data/
│   │   ├── bible/books.ts            # 66-book Bible metadata
│   │   └── english/                  # Bundled BSB translation
│   └── hooks/                # Custom React hooks
├── scripts/
│   ├── preprocess-bible.ts           # Gemini-powered preprocessor
│   └── generate-manifest.cjs         # Manifest generator
├── public/data/preprocessed/
│   ├── manifest.json                 # Available preprocessed data
│   └── {bookId}/chapter-{n}.json    # Preprocessed chapters
└── dist/                     # Build output
```

## Core Data Flow

### 1. Preprocessing Pipeline (Build-time)

```
FHL Bible API → Gemini 2.5 Flash → Static JSON → Served to App
```

**Script**: `/Users/charleswu/Desktop/+/bilingual_bib/scripts/preprocess-bible.ts`

**What it does**:
- Fetches Chinese text from 信望愛 (FHL) Bible API
- Sends verses to Gemini with detailed linguistic prompt
- Gemini segments text into words and provides:
  - `chinese`: Word text
  - `pinyin`: Pronunciation with tones
  - `definition`: Concise English meaning
  - `pos`: Part of speech (n, v, adj, adv, prep, conj, part, mw, pron, num, prop)
  - `isName`: Boolean for biblical names
  - `nameType`: 'person' | 'place' | 'group'
  - `breakdown`: Character-by-character etymology [{c: '福', m: 'blessing'}]
  - `freq`: 'common' | 'uncommon' | 'rare' | 'biblical'
  - `note`: Optional usage insight (max 15 words)
- Saves to `/public/data/preprocessed/{bookId}/chapter-{n}.json`

**Run preprocessing**:
```bash
# Single chapter
npx tsx scripts/preprocess-bible.ts --book matthew --chapter 1

# Entire book
npx tsx scripts/preprocess-bible.ts --book matthew

# All 66 books (expensive!)
npx tsx scripts/preprocess-bible.ts --all
```

**After preprocessing**, regenerate the manifest:
```bash
npm run generate-manifest
```

### 2. Runtime Data Loading

```
App → preprocessedLoader → Static JSON (preferred)
        ↓ (fallback)
    chineseProcessor → Runtime segmentation
```

**Service**: `/Users/charleswu/Desktop/+/bilingual_bib/src/services/preprocessedLoader.ts`

- Checks `manifest.json` for available preprocessed data
- Fetches from `/data/preprocessed/{bookId}/chapter-{n}.json`
- Falls back to runtime `chineseProcessor.ts` if data missing
- Converts to `Verse[]` format consumed by app

### 3. Component Rendering

```
ReadingScreen → InfiniteScroll → VerseDisplay → ChineseWord
                                              ↓
                                    (long press)
                                              ↓
                                    WordDetailPanel
```

## Enhanced Word Data Format

The `SegmentedWord` type contains rich linguistic metadata:

```typescript
interface SegmentedWord {
  chinese: string;              // "耶穌基督"
  pinyin: string;               // "Yēsū Jīdū"
  definition?: string;          // "Jesus Christ"
  partOfSpeech?: string;        // "prop" (proper noun)
  hskLevel?: number;            // HSK level (1-6)
  isName?: boolean;             // true for biblical names
  nameType?: 'person' | 'place' | 'group';
  breakdown?: CharacterBreakdown[];  // [{c: '耶', m: 'Jesus'}, {c: '穌', m: 'Christ'}]
  freq?: 'common' | 'uncommon' | 'rare' | 'biblical';
  note?: string;                // "Transliteration of Jesus Christ"
  startIndex: number;           // Position in verse
  endIndex: number;
}
```

This data powers:
- **WordDetailPanel**: Beautiful lexicon entry UI
- **VocabularyStore**: SRS-based word learning
- **Character breakdown**: Etymology insights

## Key Components

### ReadingScreen.tsx
Root component orchestrating:
- Infinite scroll chapter loading
- Header with book/chapter navigation
- Translation panel (verse or word mode)
- Audio player integration
- Vocabulary screen modal
- Focus mode (hide UI while scrolling)

**State managed locally**:
- `panelMode`: 'verse' | 'word' | null
- `selectedWord`, `selectedVerseRef`

### TranslationPanel.tsx
Floating panel below header showing:
- **Verse mode**: English translation (BSB)
- **Word mode**: Delegates to `WordDetailPanel`

**Triggers**:
- Verse tap → Verse mode
- Word long-press → Word mode
- Scroll dismissal via `useScrollDismiss` hook

### WordDetailPanel.tsx
Scholarly lexicon entry design:
- Large Chinese character with pinyin
- Color-coded POS badge
- Character breakdown (etymology)
- Frequency indicator (●●● / ●●○ / ●○○ / ✝)
- Usage notes in italics
- Save to vocabulary button (heart icon)

### InfiniteScroll.tsx
Continuous reading experience:
- Loads previous/next chapters automatically
- Virtual scrolling with chapter transitions
- Syncs `displayChapter` with scroll position
- Smooth animations via Framer Motion

## State Management (Zustand)

### readingStore.ts
```typescript
{
  currentBookId: string;        // 'matthew'
  currentChapter: number;       // 1
  loadedChapters: Map<string, Chapter>;  // Cache
}
```

**Actions**: `setCurrentPosition`, `addLoadedChapter`

### vocabularyStore.ts
Persisted to localStorage:
```typescript
{
  words: SavedWord[];  // User's vocabulary list
}
```

**SRS Algorithm**: Simple spaced repetition (1, 3, 7, 14, 30, 60 days)

**Actions**: `addWord`, `removeWord`, `reviewWord`, `getWordsDueForReview`

### settingsStore.ts
```typescript
{
  fontFamily: 'sans' | 'serif';
  textSize: 'sm' | 'base' | 'lg' | 'xl';
  showHskIndicators: boolean;
  theme: 'light' | 'sepia' | 'dark';
}
```

## Bible Data Sources

### Chinese Text (CNV - 新譯本)
**API**: 信望愛 Bible (FHL) - https://bible.fhl.net/json/
- Book abbreviation system (太=Matthew, 約=John, etc.)
- See `BOOK_ABBREVIATIONS` in `/Users/charleswu/Desktop/+/bilingual_bib/src/services/bibleApi.ts`

### English Text (BSB)
**Bundled**: Berean Study Bible (public domain)
- Located in `/Users/charleswu/Desktop/+/bilingual_bib/src/data/english/`

### 66 Books
Full Bible support (39 OT + 27 NT)
- Metadata in `/Users/charleswu/Desktop/+/bilingual_bib/src/data/bible/books.ts`

## Common Workflows

### Adding a New Book

1. **Preprocess the book**:
   ```bash
   npx tsx scripts/preprocess-bible.ts --book romans
   ```

2. **Generate manifest**:
   ```bash
   npm run generate-manifest
   ```

3. **Verify**:
   - Check `public/data/preprocessed/romans/` for JSON files
   - Check `public/data/preprocessed/manifest.json` lists "romans"

4. **Build and test**:
   ```bash
   npm run build
   npm run preview
   ```

### Improving Preprocessing Quality

Edit the Gemini prompt in `/Users/charleswu/Desktop/+/bilingual_bib/scripts/preprocess-bible.ts`:

**Key prompt sections**:
- **SEGMENTATION RULES**: How to break text
- **FOR EACH WORD, PROVIDE**: Field definitions
- **EXAMPLE OUTPUT FORMAT**: JSON structure

**Tips**:
- Add more examples for edge cases
- Adjust `CONFIG.batchSize` (5 verses) for rate limiting
- Use `CONFIG.maxRetries` (3) for reliability

### Adding a New UI Component

Follow existing patterns:

1. **Create component** in appropriate directory:
   - Reading features → `src/components/reading/`
   - Navigation → `src/components/navigation/`

2. **Use design system**:
   - Colors: `var(--text-primary)`, `var(--bg-primary)`, `var(--accent)`
   - Typography: `font-chinese-serif`, `font-body`
   - Spacing: Tailwind classes

3. **Animation**: Use Framer Motion for consistency
   ```tsx
   <motion.div
     initial={{ opacity: 0 }}
     animate={{ opacity: 1 }}
     exit={{ opacity: 0 }}
   >
   ```

4. **Export** from `index.ts` in component directory

### Debugging Preprocessed Data

**Inspect a chapter**:
```bash
cat public/data/preprocessed/matthew/chapter-1.json | jq '.verses[0]'
```

**Check manifest**:
```bash
cat public/data/preprocessed/manifest.json | jq '.books.matthew'
```

**Test loader**:
```typescript
import { loadPreprocessedChapter } from './services/preprocessedLoader';
const verses = await loadPreprocessedChapter('matthew', 1);
console.log(verses);
```

## Design Principles

1. **Preprocessing over Runtime**: Compute everything at build-time with Gemini
2. **Graceful Degradation**: Fall back to runtime processing if preprocessed data missing
3. **Mobile-First**: Touch interactions, safe areas, focus mode
4. **Immersive Reading**: Minimal UI, scroll-based dismissals
5. **Learning-Focused**: Etymology, frequency, SRS vocabulary
6. **Performance**: Static JSON, IndexedDB caching, lazy loading

## Important Constraints

- **Gemini API Key**: Required for preprocessing, set as `GEMINI_API_KEY` env var
- **Rate Limits**: Gemini Flash has rate limits, use delays between batches
- **File Size**: Keep preprocessed JSONs reasonable (5 verses per batch)
- **PWA**: Offline support via service worker, cache preprocessed data
- **Mobile**: Optimized for portrait orientation, touch-first

## Testing

**Dev server**:
```bash
npm run dev
```

**Build**:
```bash
npm run build
npm run preview
```

**Lint**:
```bash
npm run lint
```

## Quick Reference

**Preprocess a book**: `npx tsx scripts/preprocess-bible.ts --book {bookId}`
**Generate manifest**: `npm run generate-manifest`
**Dev server**: `npm run dev`
**Build**: `npm run build`

**Key files**:
- Preprocessing: `/Users/charleswu/Desktop/+/bilingual_bib/scripts/preprocess-bible.ts`
- Main component: `/Users/charleswu/Desktop/+/bilingual_bib/src/components/reading/ReadingScreen.tsx`
- Word display: `/Users/charleswu/Desktop/+/bilingual_bib/src/components/reading/WordDetailPanel.tsx`
- Types: `/Users/charleswu/Desktop/+/bilingual_bib/src/types/bible.ts`

**Next Steps for AI Agents**:
1. Read this file to understand the project
2. Review `ARCHITECTURE.md` for technical details
3. Check `DEVELOPMENT.md` for setup and deployment
4. Browse the codebase starting from `ReadingScreen.tsx`
