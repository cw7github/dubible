# DuBible - AI Agent Guide

Bilingual Chinese-English Bible PWA for Chinese learners. Uses Gemini 2.5 Flash to preprocess word segmentation, pinyin, and definitions at build-time.

## Quick Start

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:5173)
npm run build        # Production build
vercel --prod        # Deploy to dubible.com
```

## Key Commands

```bash
# Preprocess a book (requires OPENROUTER_API_KEY)
npx tsx scripts/preprocess-bible.ts --book matthew

# Update manifest after preprocessing
npm run generate-manifest
```

## Key Files

| Purpose | File |
|---------|------|
| Main UI | `src/components/reading/ReadingScreen.tsx` |
| Word popup | `src/components/reading/WordDetailPanel.tsx` |
| Vocabulary | `src/components/vocabulary/VocabularyScreen.tsx` |
| State | `src/stores/` (Zustand) |
| Preprocessing | `scripts/preprocess-bible.ts` |
| Bible data | `public/data/preprocessed/` |

## Documentation

- **[docs/AGENTS.md](docs/AGENTS.md)** - Detailed AI agent guide (project structure, data flow, workflows)
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design, component hierarchy, state management
- **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** - Setup, testing, deployment, contribution guidelines

## Tech Stack

React 19, TypeScript, Vite, TailwindCSS, Zustand, Framer Motion, Firebase (auth/sync), Dexie (IndexedDB)
