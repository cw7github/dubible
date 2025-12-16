# DuBible Project Handoff Document
**Last Updated:** December 15, 2025
**Purpose:** Enable a new AI agent to resume all work after computer restart

## Project Overview

DuBible is a bilingual Chinese-English Bible PWA for Mandarin learners. It displays Chinese Bible text with:
- Word segmentation with pinyin and definitions
- HSK/TOCFL vocabulary level indicators
- English translations (BSB)
- Cross-references between passages
- Audio narration
- Focus mode for immersive reading

**Tech Stack:** React + TypeScript + Vite + Tailwind CSS + Framer Motion

## Current State Summary

### What's Working
- Full NT (27 books) preprocessed with word segmentation, pinyin, definitions
- Most OT books partially preprocessed (see incomplete list below)
- Cross-reference feature wired up in UI (TranslationPanel.tsx, ReadingScreen.tsx)
- App runs at `npm run dev` (localhost:5173)

### What Needs to be Completed

#### 1. PRIORITY: Resume OT Chapter Processing

The preprocessing uses OpenRouter API with Gemini to enhance word definitions. Many OT books have incomplete chapters.

**Books with Missing Chapters** (updated Dec 15, 2025 - processing still running):

| Book | Processed | Total | Missing Chapters | Status |
|------|-----------|-------|------------------|--------|
| exodus | 40 | 40 | - | COMPLETE |
| numbers | 36 | 36 | - | COMPLETE |
| genesis | 40 | 50 | 41-50 | In Progress |
| psalms | 88 | 150 | 89-150 | In Progress |
| isaiah | 50 | 66 | 51-66 | In Progress |
| jeremiah | 37 | 52 | 38-52 | In Progress |
| ezekiel | 36 | 48 | 37-48 | In Progress |
| leviticus | 22 | 27 | 23-27 | Needs Resume |
| deuteronomy | 21 | 34 | 22-34 | Needs Resume |
| joshua | 23 | 24 | 24 | Needs Resume |
| judges | 20 | 21 | 21 | Needs Resume |
| 1samuel | 20 | 31 | 21-31 | Needs Resume |
| 2samuel | 21 | 24 | 22-24 | Needs Resume |
| 1kings | 16 | 22 | 17-22 | Needs Resume |
| 2kings | 20 | 25 | 21-25 | Needs Resume |
| 1chronicles | 25 | 29 | 26-29 | Needs Resume |
| 2chronicles | 27 | 36 | 28-36 | Needs Resume |
| job | 37 | 42 | 38-42 | Needs Resume |
| matthew | 21 | 28 | 10, 11, 24-28 | Needs Resume |
| luke | 15 | 24 | 16-24 | Needs Resume |
| john | 18 | 21 | 19-21 | Needs Resume |
| acts | 20 | 28 | 21-28 | Needs Resume |
| revelation | 20 | 22 | 12, 13 | Needs Resume |

**Command to Process Missing Chapters:**

```bash
# Set your OpenRouter API key first
export OPENROUTER_API_KEY="your-key-here"

# Process a single book (example: Genesis chapters 41-50)
npx tsx scripts/preprocess-bible.ts --book genesis --start 41

# Process a single specific chapter
npx tsx scripts/preprocess-bible.ts --book matthew --chapter 10

# Process multiple books in parallel (run each in separate terminal):
npx tsx scripts/preprocess-bible.ts --book psalms --start 89 &
npx tsx scripts/preprocess-bible.ts --book isaiah --start 52 &
npx tsx scripts/preprocess-bible.ts --book jeremiah --start 38 &
npx tsx scripts/preprocess-bible.ts --book ezekiel --start 38 &
```

**Important Notes:**
- The script uses OpenRouter's `google/gemini-2.0-flash-001` model
- Rate limited to ~500ms between API calls
- Processes are resumable - just specify `--start-chapter` at the last completed chapter + 1
- Output goes to `public/data/preprocessed/{bookId}/chapter-{n}.json`

#### 2. Update Manifest After Processing

After all chapters are processed, regenerate the manifest:

```bash
npx tsx scripts/generate-manifest.ts
```

This updates `public/data/preprocessed/manifest.json` with all available chapters.

#### 3. Add Cross-References to All Books

Cross-references were partially added. To add them to remaining books:

```bash
# Add cross-references for a specific book
npx tsx scripts/add-cross-references.ts --book genesis

# The script fetches from FHL API and extracts cross-refs from section headers
# Run for each book that needs cross-references
```

**Note:** Matthew chapters 1-14 already have cross-references added.

## Key Files Reference

### Core Application
- `src/components/reading/ReadingScreen.tsx` - Main reading view
- `src/components/reading/TranslationPanel.tsx` - Shows English translation + cross-refs
- `src/components/reading/InfiniteScroll.tsx` - Verse rendering with infinite scroll
- `src/services/preprocessedLoader.ts` - Loads preprocessed JSON data

### Preprocessing Scripts
- `scripts/preprocess-bible.ts` - Main preprocessing script (uses OpenRouter/Gemini)
- `scripts/add-cross-references.ts` - Extracts cross-refs from FHL API
- `scripts/generate-manifest.ts` - Regenerates manifest.json
- `scripts/cleanup-cross-refs.ts` - Removes cross-ref text from verses

### Data
- `public/data/preprocessed/` - All preprocessed Bible data
- `public/data/preprocessed/manifest.json` - Index of available books/chapters
- `src/data/english/` - BSB English translations (bundled)

### Types
- `src/types/bible.ts` - Core types including `CrossReference`, `Verse`, `SegmentedWord`

## Environment Variables

Required in `.env`:
```
OPENROUTER_API_KEY=your-openrouter-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key  # For audio features
```

## Recent Fixes Applied

1. **API Key Security** - Removed hardcoded ElevenLabs key from `scripts/audio-test/test-elevenlabs.ts`
2. **JSX Tag Mismatch** - Fixed `</motion.main>` to `</main>` in ReadingScreen.tsx
3. **Cross-References in Verse Text** - Fixed `stripHtml` function to remove `<h3>` headers that contain cross-ref data
4. **Cross-Reference Feature** - Wired up TranslationPanel to display cross-refs and navigate to them

## How to Resume Work

### Step 1: Start the Dev Server
```bash
cd /Users/charleswu/Desktop/+/bilingual_bib
npm run dev
```

### Step 2: Resume Chapter Processing
```bash
# Check which chapters exist
ls public/data/preprocessed/genesis/ | wc -l

# Set API key
export OPENROUTER_API_KEY="sk-or-..."

# Resume processing (example for Genesis at chapter 41)
npx tsx scripts/preprocess-bible.ts --book genesis --start 41
```

### Step 3: Run Multiple Books in Parallel
For faster processing, run multiple books simultaneously:

```bash
# Terminal 1: Large books
npx tsx scripts/preprocess-bible.ts --book psalms --start 89

# Terminal 2
npx tsx scripts/preprocess-bible.ts --book isaiah --start 52

# Terminal 3
npx tsx scripts/preprocess-bible.ts --book jeremiah --start 38

# Terminal 4
npx tsx scripts/preprocess-bible.ts --book ezekiel --start 38

# Terminal 5: Pentateuch
npx tsx scripts/preprocess-bible.ts --book genesis --start 41

# Single chapter processing for gaps
npx tsx scripts/preprocess-bible.ts --book isaiah --chapter 49
npx tsx scripts/preprocess-bible.ts --book ezekiel --chapter 32
npx tsx scripts/preprocess-bible.ts --book matthew --chapter 10
npx tsx scripts/preprocess-bible.ts --book matthew --chapter 11
```

### Step 4: After All Processing Complete
```bash
# Regenerate manifest
npx tsx scripts/generate-manifest.ts

# Verify build works
npm run build
```

## Quick Command Reference

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Process a book
npx tsx scripts/preprocess-bible.ts --book {bookId} --start-chapter {n}

# Add cross-references
npx tsx scripts/add-cross-references.ts --book {bookId}

# Regenerate manifest
npx tsx scripts/generate-manifest.ts

# Check chapter counts
for dir in public/data/preprocessed/*/; do
  book=$(basename "$dir")
  count=$(ls "$dir"chapter-*.json 2>/dev/null | wc -l)
  echo "$book: $count"
done | sort
```

## Known Issues / Tech Debt

1. **Build Warnings** - Some unused variable warnings in:
   - `src/components/vocabulary/DefinitionCard.tsx` (line 57)
   - `src/components/reading/WordDetailPanel.tsx` (line 115)
   - `src/components/settings/SettingsScreen.tsx` (line 1)

2. **Scroll Issue** - An agent was investigating: "when scrolling down, menus hide but bottom content doesn't appear" - may need follow-up

## API References

### OpenRouter API (for preprocessing)
- Endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Model: `google/gemini-2.0-flash-001`
- Used for: Enhancing word definitions with context

### FHL Bible API (for Chinese text and cross-refs)
- Example: `https://bible.fhl.net/json/qb.php?chineses=創&chap=1&sec=1&version=ncv&gb=0`
- Returns: Chinese verse text with HTML formatting (including `<h3>` cross-ref headers)

## Contact / Resources

- **Deployment:** Vercel (configured)
- **Repository:** Local at `/Users/charleswu/Desktop/+/bilingual_bib`
