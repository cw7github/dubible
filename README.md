# Bilingual Bible PWA

A beautiful Progressive Web App for reading the Bible in Chinese with English translations, designed specifically for Mandarin learners. Features intelligent word segmentation, pinyin annotations, vocabulary building with spaced repetition, and cross-device sync.

## Features

### Core Reading Experience

- **Chinese-English Bible** - Read scripture in Chinese (CNV - New Chinese Version) with English translations (BSB - Berean Standard Bible)
- **Intelligent Word Segmentation** - AI-powered word boundaries using Gemini 2.5 Flash via OpenRouter
- **Pinyin Annotations** - Customizable pinyin display with 6 proficiency levels
- **Infinite Scroll** - Seamlessly read across chapters with automatic loading
- **Focus Mode** - Immersive reading with auto-hiding UI when scrolling

### Chinese Learning Tools

- **Word Definition Popups** - Long-press any word for detailed lexicon entry
- **Character Etymology** - Character-by-character breakdown for compound words
- **Part of Speech Tags** - Color-coded grammatical categories
- **Frequency Indicators** - Common, uncommon, rare, and biblical-specific vocabulary
- **HSK Level Badges** - See HSK 1-6 proficiency levels for vocabulary words
- **Audio Pronunciation** - Hear word pronunciations via OpenAI TTS or Web Speech API

### Vocabulary Building

- **Save Words** - Build your personal vocabulary list from scripture
- **Spaced Repetition (SRS)** - Smart review scheduling (1, 3, 7, 14, 30, 60 days)
- **Flashcard Review** - Interactive vocabulary practice
- **Verse Context** - Each word links back to where you found it

### Pinyin Display Levels

Customize pinyin visibility based on your reading level:

| Level | Chinese | Description |
|-------|---------|-------------|
| Beginner | 初学 | Show pinyin for all characters |
| Elementary | 入门 | Hide pinyin for HSK 1 words |
| Intermediate | 中级 | Hide pinyin for HSK 1-3 words |
| Upper-Intermediate | 中高级 | Hide pinyin for HSK 1-4 words |
| Advanced | 高级 | Show pinyin only for HSK 6+ and rare words |
| Fluent | 流利 | No pinyin shown |

### User Authentication & Cloud Sync

- **Google OAuth** - Sign in with your Google account
- **Facebook OAuth** - Sign in with your Facebook account
- **Cross-Device Sync** - Vocabulary, bookmarks, history, and settings sync via Firebase Firestore
- **Offline Support** - Data cached locally and synced when online
- **Automatic Migration** - Existing local data uploads on first sign-in

### Navigation & Gestures

- **Book Navigator** - Browse all 66 books of the Bible
- **Two-Finger Swipe** - Navigate back/forward through passage history
- **Reading History** - Track and navigate your reading journey
- **Bookmarks** - Save and annotate favorite verses

### Text-to-Speech

- **OpenAI TTS** (optional) - High-quality Chinese pronunciation using the "nova" voice
- **Web Speech API** - Free browser-based fallback for pronunciation
- **Audio in Definition Popups** - Hear any word with a tap

### Progressive Web App

- **Installable** - Add to home screen on iOS/Android
- **Offline Reading** - Service worker caches preprocessed data
- **Fast Loading** - Static JSON data with no runtime computation
- **Mobile-First** - Optimized for touch interactions and portrait orientation

## Tech Stack

- **React 19** - UI framework with TypeScript
- **Vite 7** - Build tool with HMR
- **Zustand** - Lightweight state management with persistence
- **Tailwind CSS 4** - Utility-first styling
- **Framer Motion** - Smooth animations and gestures
- **Firebase** - Authentication and Firestore database
- **Dexie** - IndexedDB wrapper for local caching
- **vite-plugin-pwa** - PWA with Workbox service worker

## Quick Start

### Prerequisites

- Node.js 18+ (recommended: 20 LTS)
- npm 9+

### Installation

```bash
# Clone repository
cd bilingual_bib

# Install dependencies
npm install

# Start development server
npm run dev
```

The app opens at `http://localhost:5173`

### Environment Variables

Copy the example file and configure:

```bash
cp .env.local.example .env.local
```

See [Environment Variables](#environment-variables-1) section for details.

## Environment Variables

### Firebase (Required for Authentication & Sync)

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Get these from [Firebase Console](https://console.firebase.google.com/) > Project Settings > Your apps.

### OpenAI TTS (Optional)

```env
VITE_OPENAI_API_KEY=sk-your-openai-api-key
```

For high-quality Chinese pronunciation. Get from [OpenAI Platform](https://platform.openai.com/api-keys).
Falls back to browser speech synthesis if not configured.

### OpenRouter (Required for Preprocessing)

```env
OPENROUTER_API_KEY=sk-or-your-openrouter-key
```

For running the preprocessing script. Get from [OpenRouter](https://openrouter.ai/keys).

## Build & Deploy

### Production Build

```bash
npm run build
```

Output: `dist/` directory with optimized bundle, service worker, and static assets.

### Preview Build

```bash
npm run preview
```

Opens production build at `http://localhost:4173`

### Deployment

Works with any static hosting:

**Vercel:**
```bash
vercel --prod
```

**Netlify:**
```bash
netlify deploy --prod
```

**Manual:** Upload `dist/` to any static file server with SPA routing configured.

## Project Structure

```
bilingual_bib/
├── src/
│   ├── components/
│   │   ├── auth/           # Login, Profile screens
│   │   ├── navigation/     # Header, BookNavigator
│   │   ├── reading/        # Main reading interface
│   │   │   ├── ReadingScreen.tsx
│   │   │   ├── InfiniteScroll.tsx
│   │   │   ├── VerseDisplay.tsx
│   │   │   ├── ChineseWord.tsx
│   │   │   ├── WordDetailPanel.tsx
│   │   │   └── TranslationPanel.tsx
│   │   ├── settings/       # Settings panel
│   │   └── vocabulary/     # Vocabulary list, flashcards
│   ├── stores/             # Zustand state management
│   │   ├── authStore.ts
│   │   ├── readingStore.ts
│   │   ├── vocabularyStore.ts
│   │   ├── settingsStore.ts
│   │   ├── bookmarkStore.ts
│   │   └── historyStore.ts
│   ├── services/
│   │   ├── bibleApi.ts           # FHL Bible API client
│   │   ├── preprocessedLoader.ts # Static JSON loader
│   │   ├── bibleCache.ts         # IndexedDB caching
│   │   ├── chineseProcessor.ts   # Runtime fallback
│   │   └── ttsService.ts         # Text-to-speech
│   ├── hooks/
│   │   ├── useAudioPlayer.ts
│   │   ├── useTwoFingerSwipe.ts
│   │   ├── usePassageHistory.ts
│   │   ├── useSyncManager.ts
│   │   ├── useFocusMode.ts
│   │   ├── useLongPress.ts
│   │   └── useScrollDismiss.ts
│   ├── lib/
│   │   ├── firebase.ts           # Firebase initialization
│   │   ├── firebaseSync.ts       # Firestore sync utilities
│   │   └── dataMigration.ts      # Local to cloud migration
│   ├── types/              # TypeScript definitions
│   └── data/
│       ├── bible/books.ts  # 66-book metadata
│       └── english/        # Bundled BSB translation
├── scripts/
│   ├── preprocess-bible.ts       # Gemini preprocessing
│   └── generate-manifest.cjs     # Manifest generator
├── public/
│   └── data/preprocessed/  # Generated JSON files
├── docs/                   # Additional documentation
└── dist/                   # Build output
```

## Preprocessing Pipeline

The app uses pre-computed word segmentation for optimal quality and performance.

### How It Works

1. Fetch Chinese text from FHL Bible API (信望愛聖經)
2. Send verses to Gemini 2.5 Flash via OpenRouter
3. AI segments text and provides linguistic metadata:
   - Word boundaries
   - Pinyin with tone marks
   - Contextual definitions
   - Part of speech
   - Character etymology
   - HSK levels
   - Frequency indicators
4. Save as static JSON files
5. App loads JSON directly - no runtime computation

### Running Preprocessing

```bash
# Single chapter
npx tsx scripts/preprocess-bible.ts --book matthew --chapter 1

# Entire book
npx tsx scripts/preprocess-bible.ts --book matthew

# Resume from specific chapter
npx tsx scripts/preprocess-bible.ts --book matthew --start 5

# All 66 books (expensive!)
npx tsx scripts/preprocess-bible.ts --all
```

After preprocessing, update the manifest:
```bash
npm run generate-manifest
```

### Rate Limits

Using Gemini 2.5 Flash via OpenRouter:
- ~5 verses per API call
- 1 second delay between batches
- ~30 seconds per chapter
- ~15 minutes per book

## Bible Data Sources

### Chinese Text
- **Source:** 信望愛聖經 (FHL Bible API)
- **Version:** CNV (新譯本 - Chinese New Version)
- **API:** `https://bible.fhl.net/json/`

### English Text
- **Source:** Bundled in app
- **Version:** BSB (Berean Standard Bible)
- **License:** Public domain

### 66 Books
Full Bible support covering:
- **Old Testament:** 39 books (Genesis to Malachi)
- **New Testament:** 27 books (Matthew to Revelation)

## Firebase Setup

See [AUTHENTICATION_SETUP.md](./AUTHENTICATION_SETUP.md) for detailed instructions.

Quick overview:
1. Create project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Google and Facebook authentication
3. Create Firestore database in production mode
4. Deploy security rules from `firestore.rules`
5. Add web app and copy config to `.env.local`

## Development

### Available Scripts

```bash
npm run dev          # Start dev server with HMR
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run generate-manifest  # Update preprocessed data manifest
```

### Testing Checklist

- [ ] Navigate between books and chapters
- [ ] Long-press words to see definitions
- [ ] Save words to vocabulary
- [ ] Review vocabulary with flashcards
- [ ] Sign in with Google/Facebook
- [ ] Verify data syncs across devices
- [ ] Test offline mode
- [ ] Install as PWA

## Documentation

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System design and data flow
- [DEVELOPMENT.md](./docs/DEVELOPMENT.md) - Development workflow and debugging
- [LAZY_LOADING.md](./docs/LAZY_LOADING.md) - Preprocessed data loading system
- [AGENTS.md](./docs/AGENTS.md) - AI agent guide for contributors
- [AUTHENTICATION_SETUP.md](./AUTHENTICATION_SETUP.md) - Firebase setup guide
- [TTS_SETUP.md](./TTS_SETUP.md) - Text-to-speech configuration
- [TAIWANESE_VOICE_GUIDE.md](./docs/TAIWANESE_VOICE_GUIDE.md) - Taiwan voice selection

## Browser Support

**Target:** Modern mobile browsers

| Browser | Minimum Version |
|---------|----------------|
| iOS Safari | 14+ |
| Chrome Android | 90+ |
| Chrome Desktop | 90+ |
| Firefox | 90+ |
| Safari Desktop | 14+ |

**Not Supported:** IE11, older Android WebView

## License

This project is for personal/educational use. Bible texts are used under their respective licenses:
- CNV: Used via FHL Bible API
- BSB: Public domain

## Acknowledgments

- [信望愛聖經](https://bible.fhl.net/) - Chinese Bible API
- [Berean Bible](https://bereanbible.com/) - English translation
- [OpenRouter](https://openrouter.ai/) - AI API gateway
- [Google Gemini](https://ai.google.dev/) - Word segmentation AI
- [OpenAI](https://openai.com/) - Text-to-speech
