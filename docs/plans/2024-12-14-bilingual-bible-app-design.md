# Bilingual Bible App — Complete Design Document

## Vision

A Progressive Web App (PWA) that combines the contemplative reading experience of [NeuBible](https://neubible.co/) with the language learning capabilities of [Du Chinese](https://www.duchinese.net/). Designed for English speakers learning Mandarin Chinese through Scripture.

**Core Philosophy**: *"Scripture as the content. Chinese acquisition as the quiet companion."*

The app should feel like a beautiful Bible reading experience first, with language learning tools woven seamlessly into the interface.

---

## Target Users

- Native English speakers learning Mandarin Chinese
- Christians who want to engage with Scripture while building language skills
- Intermediate Chinese learners (HSK 2-5) who can benefit from pinyin support
- Users who appreciate refined, minimal design

---

## Platform

**Progressive Web App (PWA)**
- Mobile-first responsive design
- Installable on iOS (Add to Home Screen) and Android
- Works on desktop browsers
- Offline capability (Phase 2)

---

## Design Philosophy

### From NeuBible
- Zero-friction launch — opens directly to last reading position
- Content-first — interface disappears during reading
- Opinionated typography — curated fonts, not endless options
- Gesture-driven navigation
- Beautiful themes that affect the entire UI

### From Du Chinese
- Pinyin displayed above Chinese characters (ruby text)
- Tap word for definition popup
- Save words to vocabulary list
- Audio playback with synchronized text highlighting
- HSK-level indicators for vocabulary difficulty

### Our Innovations
- **Pinyin as Whisper** — subtle, not competing with characters
- **Elegant Word Interaction** — definition cards that slide up, not pop over
- **Focus Mode Audio** — surrounding text dims during playback
- **Contemplative Transitions** — gentle chapter transitions during infinite scroll

---

## Screens & Components

### 1. Reading Screen (Primary)

The heart of the app. Users spend 90% of their time here.

#### Layout
```
┌─────────────────────────────────────┐
│  [≡]     Matthew 5      [Aa] [☾]   │  ← Minimal header (fades on scroll)
├─────────────────────────────────────┤
│                                     │
│         天 國 的 福 音              │  ← Chapter title (centered, elegant)
│                                     │
│  ¹ Yēsū kànjiàn zhè xǔduō rén...   │  ← Verse with pinyin above
│    耶 穌 看 見 這 許 多 人，        │
│    就上了山，既已坐下，            │
│    門徒到他跟前來，                │
│                                     │
│  ² tā jiù kāikǒu jiàoxun tāmen...  │
│    他 就 開 口 教 訓 他 們，        │
│    說：                            │
│                                     │
│  ³ xūxīn de rén yǒu fú le...       │
│    虛 心 的 人 有 福 了！          │
│    因為天國是他們的。              │
│                                     │
│         (infinite scroll)           │
│                                     │
├─────────────────────────────────────┤
│  [▶]                          [词]  │  ← Bottom bar: Audio play, Vocabulary
└─────────────────────────────────────┘
```

#### Behaviors
- **Infinite vertical scroll** — chapters flow continuously
- **Chapter transitions** — when scrolling into new chapter, title fades in (1s), then dissolves
- **Header fade** — header becomes translucent/hidden after 2s of scrolling, reappears on scroll up
- **Tap anywhere on verse** — no action (clean reading)
- **Tap specific word** — definition card slides up
- **Double-tap** — quick search modal
- **Swipe left** — reveal chapter/book navigator
- **Pull down at top** — settings access

#### Typography Specifications
- **Chinese characters**: Source Han Serif or Sans, 18-22px base size
- **Pinyin**: System sans-serif, 10-12px, 50% opacity, positioned as ruby text
- **Verse numbers**: Superscript, accent color, slightly smaller
- **Line height**: 2.0 for Chinese text (generous breathing room)
- **Margins**: 24px horizontal on mobile, max-width 680px on desktop

---

### 2. Definition Card (Component)

Appears when user taps a Chinese word/phrase.

#### Layout
```
┌─────────────────────────────────────┐
│                                     │
│  (Reading content above, dimmed)    │
│                                     │
├─────────────────────────────────────┤
│  ┌─────────────────────────────────┐│
│  │                            [♡]  ││  ← Save to vocabulary
│  │         虛心                    ││  ← Word (large)
│  │         xūxīn                   ││  ← Pinyin
│  │                                 ││
│  │  humble; modest                 ││  ← English definition
│  │  adjective                      ││  ← Part of speech
│  │                                 ││
│  │  HSK 5  •  February 12, 2024   ││  ← Level + first encountered
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

#### Behaviors
- **Slides up** from bottom (not a popup that covers text)
- **Background dims** to 70% to focus on card
- **Tap heart** — saves word to vocabulary (fills in, haptic feedback)
- **Tap outside card** — dismisses smoothly
- **Swipe down on card** — dismisses
- **Card height** — auto-sized to content, max 40% of screen

#### Animation
- Slide up: 250ms ease-out
- Dismiss: 200ms ease-in
- Background dim: 150ms

---

### 3. Chapter/Book Navigator (Slide-in Panel)

Accessed by swiping left from reading screen.

#### Layout
```
┌─────────────────────────────────────┐
│                              │      │
│  ┌────────────────────────┐  │ (dim)│
│  │                        │  │      │
│  │  舊約 Old Testament    │  │      │
│  │  ─────────────────     │  │      │
│  │  創世記 Genesis    50  │  │      │
│  │  出埃及記 Exodus   40  │  │      │
│  │  利未記 Leviticus  27  │  │      │
│  │  ...                   │  │      │
│  │                        │  │      │
│  │  新約 New Testament    │  │      │
│  │  ─────────────────     │  │      │
│  │  馬太福音 Matthew  28  │  │      │
│  │  ✓ 馬可福音 Mark   16  │  │      │ ← Checkmark = currently reading
│  │  路加福音 Luke     24  │  │      │
│  │  ...                   │  │      │
│  │                        │  │      │
│  └────────────────────────┘  │      │
└─────────────────────────────────────┘
```

#### Book Detail (on tap)
```
┌────────────────────────┐
│  ← 馬太福音 Matthew    │
│                        │
│  1  2  3  4  5  6  7   │  ← Chapter grid
│  8  9  10 11 12 13 14  │
│  15 16 17 18 19 20 21  │
│  22 23 24 25 26 27 28  │
│                        │
│  ● Currently: Ch. 5    │
└────────────────────────┘
```

---

### 4. Search Modal

Accessed by double-tap anywhere on reading screen.

#### Layout
```
┌─────────────────────────────────────┐
│                                     │
│  ┌─────────────────────────────────┐│
│  │  🔍 Search or go to verse...    ││
│  └─────────────────────────────────┘│
│                                     │
│  Recent:                            │
│  • John 3:16                        │
│  • 愛 (love)                        │
│  • Romans 8                         │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Type "John 3:16" or "約翰福音3:16" │
│  to jump to a verse                 │
│                                     │
│  Type any word to search Scripture  │
│                                     │
└─────────────────────────────────────┘
```

#### Behaviors
- **Verse reference** → jumps directly to that verse
- **Chinese/English word** → shows search results
- **Keyboard auto-opens** on modal appearance
- **ESC or tap outside** → dismisses

---

### 5. Vocabulary Screen

Accessed from bottom bar [词] button.

#### Layout
```
┌─────────────────────────────────────┐
│  ←  Vocabulary           [Review]   │
├─────────────────────────────────────┤
│                                     │
│  47 words saved • 23 mastered       │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 🔍 Search saved words...        ││
│  └─────────────────────────────────┘│
│                                     │
│  Today                              │
│  ┌─────────────────────────────────┐│
│  │ 虛心  xūxīn                     ││
│  │ humble, modest                  ││
│  │ Matthew 5:3              →      ││  ← Tap to go to verse
│  └─────────────────────────────────┘│
│                                     │
│  Yesterday                          │
│  ┌─────────────────────────────────┐│
│  │ 天國  tiānguó                   ││
│  │ kingdom of heaven               ││
│  │ Matthew 5:3              →      ││
│  └─────────────────────────────────┘│
│                                     │
│  This Week                          │
│  ...                                │
│                                     │
└─────────────────────────────────────┘
```

---

### 6. Flashcard Review Screen

Accessed from [Review] button in Vocabulary.

#### Layout — Front
```
┌─────────────────────────────────────┐
│  ←  Review              12 remaining│
├─────────────────────────────────────┤
│                                     │
│                                     │
│                                     │
│              虛心                   │
│                                     │
│                                     │
│                                     │
│         (tap to reveal)             │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│        progress: ████░░░░░░         │
└─────────────────────────────────────┘
```

#### Layout — Back (after tap)
```
┌─────────────────────────────────────┐
│  ←  Review              12 remaining│
├─────────────────────────────────────┤
│                                     │
│              虛心                   │
│              xūxīn                  │
│                                     │
│         humble, modest              │
│            adjective                │
│                                     │
│    "虛心的人有福了！"               │  ← Original context
│    Matthew 5:3                      │
│                                     │
├─────────────────────────────────────┤
│                                     │
│    [Still Learning]    [Know It]    │
│                                     │
└─────────────────────────────────────┘
```

#### Behaviors
- **Swipe left** = Still Learning (card comes back sooner)
- **Swipe right** = Know It (card comes back later)
- **Tap buttons** = same as swipe
- **Simple SRS**: Still Learning = review in 1 day, Know It = review in 3→7→14→30 days

---

### 7. Settings Screen

Accessed by pull-down from top of reading screen, or from navigator.

#### Layout
```
┌─────────────────────────────────────┐
│  ←  Settings                        │
├─────────────────────────────────────┤
│                                     │
│  APPEARANCE                         │
│  ─────────────────────────────────  │
│                                     │
│  Theme                              │
│  [Light]  [Sepia]  [Dark]          │  ← Visual buttons
│                                     │
│  Font                               │
│  [思源宋體 Serif]  [思源黑體 Sans]  │
│                                     │
│  Text Size                          │
│  A───────●───────A                  │  ← Slider
│                                     │
│  CHINESE DISPLAY                    │
│  ─────────────────────────────────  │
│                                     │
│  Pinyin Display                     │
│  [Always]  [Smart]  [Hidden]       │
│                                     │
│  Character Set                      │
│  [繁體 Traditional]  [简体 Simplified]│
│                                     │
│  Show HSK Level Indicators    [○━]  │  ← Toggle
│                                     │
│  BIBLE VERSION                      │
│  ─────────────────────────────────  │
│                                     │
│  Chinese: 和合本 CUV (Traditional)  │
│  English: ESV                    >  │
│                                     │
│  READING                            │
│  ─────────────────────────────────  │
│                                     │
│  Audio Playback Speed               │
│  [0.75x]  [1x]  [1.25x]            │
│                                     │
└─────────────────────────────────────┘
```

---

## Theme Specifications

### Light Theme
```css
--bg-primary: #FDFCFA;      /* Warm off-white */
--bg-secondary: #F5F4F0;    /* Slightly darker for cards */
--text-primary: #1A1A1A;    /* Near black */
--text-secondary: #6B6B6B;  /* Gray for secondary text */
--text-pinyin: rgba(26, 26, 26, 0.5);  /* 50% opacity */
--accent: #8B7355;          /* Warm brown */
--accent-light: #D4C4B0;    /* Light brown for backgrounds */
--border: #E5E3DE;          /* Subtle borders */
```

### Sepia Theme
```css
--bg-primary: #F4ECD8;      /* Cream/parchment */
--bg-secondary: #EBE1C8;    /* Darker cream */
--text-primary: #3D3425;    /* Dark brown */
--text-secondary: #6B5D4D;  /* Medium brown */
--text-pinyin: rgba(61, 52, 37, 0.5);
--accent: #8B6914;          /* Golden brown */
--accent-light: #D4C090;
--border: #D4C9B0;
```

### Dark Theme
```css
--bg-primary: #000000;      /* True OLED black */
--bg-secondary: #1A1A1A;    /* Card backgrounds */
--text-primary: #F5F0E6;    /* Warm cream text */
--text-secondary: #8A8578;  /* Muted text */
--text-pinyin: rgba(245, 240, 230, 0.5);
--accent: #C9A962;          /* Gold accent */
--accent-light: #3D3425;    /* Dark gold */
--border: #2A2A2A;
```

---

## Typography Specifications

### Chinese Fonts
1. **Source Han Serif (思源宋體)** — Traditional, literary feel
   - Google Fonts: `Noto Serif TC` (Traditional Chinese)
   - Fallback: `serif`

2. **Source Han Sans (思源黑體)** — Modern, clean
   - Google Fonts: `Noto Sans TC` (Traditional Chinese)
   - Fallback: `sans-serif`

### English Fonts
- Paired with Serif: `Literata` or `Source Serif Pro`
- Paired with Sans: `Inter` or `Source Sans Pro`

### Pinyin Font
- `system-ui, -apple-system, sans-serif`
- Weight: 300 (light)
- Size: 60% of Chinese character size

### Scale
```css
--text-xs: 12px;    /* Metadata */
--text-sm: 14px;    /* Secondary text */
--text-base: 16px;  /* English body */
--text-lg: 18px;    /* Chinese characters (small setting) */
--text-xl: 20px;    /* Chinese characters (medium setting) */
--text-2xl: 22px;   /* Chinese characters (large setting) */
--text-3xl: 28px;   /* Chapter titles */
--text-4xl: 36px;   /* Book titles */
```

---

## Technical Architecture

### Stack
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + CSS Variables for theming
- **State Management**: Zustand (lightweight, perfect for PWA)
- **Local Storage**: IndexedDB via Dexie.js
- **PWA**: vite-plugin-pwa
- **Animations**: Framer Motion (for gesture-based interactions)

### Project Structure
```
bilingual_bib/
├── docs/
│   └── plans/
│       └── 2024-12-14-bilingual-bible-app-design.md
├── public/
│   ├── manifest.json
│   ├── icons/
│   └── audio/              # Pre-generated audio files (Phase 2)
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css           # Tailwind + CSS variables
│   │
│   ├── components/
│   │   ├── reading/
│   │   │   ├── ReadingScreen.tsx
│   │   │   ├── VerseDisplay.tsx
│   │   │   ├── ChineseWord.tsx      # Individual word with pinyin
│   │   │   ├── ChapterTransition.tsx
│   │   │   └── DefinitionCard.tsx
│   │   ├── navigation/
│   │   │   ├── BookNavigator.tsx
│   │   │   ├── ChapterGrid.tsx
│   │   │   ├── SearchModal.tsx
│   │   │   └── Header.tsx
│   │   ├── vocabulary/
│   │   │   ├── VocabularyScreen.tsx
│   │   │   ├── WordCard.tsx
│   │   │   ├── FlashcardReview.tsx
│   │   │   └── FlashcardCard.tsx
│   │   ├── settings/
│   │   │   ├── SettingsScreen.tsx
│   │   │   ├── ThemeSelector.tsx
│   │   │   └── FontSelector.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       ├── SlidePanel.tsx
│   │       └── Toggle.tsx
│   │
│   ├── hooks/
│   │   ├── useReading.ts         # Reading position, scroll state
│   │   ├── useVocabulary.ts      # Saved words, SRS logic
│   │   ├── useSettings.ts        # Theme, font, preferences
│   │   ├── useAudio.ts           # Audio playback state
│   │   └── useGestures.ts        # Swipe, double-tap detection
│   │
│   ├── stores/
│   │   ├── readingStore.ts       # Current book, chapter, scroll position
│   │   ├── vocabularyStore.ts    # Saved words with SRS data
│   │   └── settingsStore.ts      # All preferences
│   │
│   ├── data/
│   │   ├── bible/
│   │   │   ├── index.ts          # Bible data loader
│   │   │   ├── books.ts          # Book metadata (names, chapter counts)
│   │   │   └── cuv/              # Chinese Union Version JSON files
│   │   │       ├── genesis.json
│   │   │       ├── matthew.json
│   │   │       └── ...
│   │   ├── pinyin/
│   │   │   └── dictionary.ts     # Word → pinyin mapping
│   │   └── definitions/
│   │       └── cedict.ts         # Chinese-English dictionary
│   │
│   ├── lib/
│   │   ├── pinyin.ts             # Pinyin conversion utilities
│   │   ├── segmentation.ts       # Chinese word segmentation
│   │   ├── srs.ts                # Spaced repetition algorithm
│   │   └── db.ts                 # Dexie.js database setup
│   │
│   ├── types/
│   │   ├── bible.ts              # Verse, Chapter, Book types
│   │   ├── vocabulary.ts         # SavedWord, FlashcardState
│   │   └── settings.ts           # Theme, FontOption, etc.
│   │
│   └── styles/
│       └── themes.css            # Theme CSS variables
│
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

---

## Data Sources

### Chinese Bible Text
**Chinese Union Version (CUV / 和合本)** — Public domain (published 1919)
- Source: [thiagobodruk/bible](https://github.com/thiagobodruk/bible) (JSON format)
- Traditional characters version
- Can convert to Simplified using character mapping

### English Bible Text
**Options (in order of preference):**
1. **ESV** — [API available](https://api.esv.org/) with limits (500 verses/query, 5000/day)
2. **KJV** — Public domain, unlimited use
3. **WEB** — Public domain, modern English

For v1, we'll use **KJV** for simplicity (no API limits), with ESV as future enhancement.

### Pinyin Data
- Use [pinyin.js](https://pinyin.js.org/) library for character → pinyin conversion
- Pre-process Bible text to generate pinyin mappings
- Handle heteronyms (characters with multiple pronunciations) using word context

### Chinese-English Dictionary
- **CC-CEDICT** — Open-source Chinese-English dictionary
- Source: [MDBG](https://www.mdbg.net/chinese/dictionary?page=cc-cedict)
- Format: Traditional, Simplified, Pinyin, English definitions

### Word Segmentation
- Use [Intl.Segmenter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter) (built into modern browsers)
- Fallback: [jieba-js](https://github.com/peterbe/jieba-js) for older browsers

---

## Implementation Phases

### Phase 1: Core Reading Experience (MVP)
- [ ] Project setup (Vite + React + TypeScript + Tailwind)
- [ ] Load Chinese Bible text (CUV) from JSON
- [ ] Basic reading screen with infinite scroll
- [ ] Chinese text rendering with pinyin (ruby text)
- [ ] Verse numbering and chapter titles
- [ ] Basic navigation (book/chapter selector)
- [ ] Three themes (Light, Sepia, Dark)
- [ ] Font size adjustment
- [ ] PWA manifest and basic service worker

### Phase 2: Word Interaction & Vocabulary
- [ ] Tap word → definition card
- [ ] Chinese word segmentation
- [ ] Dictionary lookup (CC-CEDICT)
- [ ] Save word to vocabulary
- [ ] Vocabulary list screen
- [ ] Basic flashcard review
- [ ] IndexedDB persistence

### Phase 3: Enhanced Features
- [ ] Search functionality
- [ ] Reading position persistence
- [ ] Chapter transitions (fade animation)
- [ ] Gesture navigation (swipe for chapter nav)
- [ ] Double-tap for quick search
- [ ] HSK level indicators
- [ ] Pinyin display modes (Always/Smart/Hidden)

### Phase 4: Audio & Polish
- [ ] Audio playback integration
- [ ] Synchronized text highlighting
- [ ] Focus mode (dim surrounding text)
- [ ] Playback speed control
- [ ] Haptic feedback
- [ ] Performance optimization
- [ ] Offline support (full caching)

### Phase 5: Future Enhancements
- [ ] User accounts (optional sync)
- [ ] ESV integration
- [ ] Reading plans
- [ ] Cross-references
- [ ] Simplified Chinese option
- [ ] Export vocabulary to Anki

---

## Accessibility Considerations

- **Font sizing**: User-adjustable, respects system preferences
- **Color contrast**: All themes meet WCAG AA standards
- **Screen reader**: Semantic HTML, ARIA labels
- **Reduced motion**: Respect `prefers-reduced-motion`
- **Keyboard navigation**: Full keyboard support on desktop

---

## Performance Targets

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Lighthouse PWA score**: > 90
- **Bundle size**: < 500KB initial (lazy load Bible data)

---

## Success Metrics

1. **Reading engagement**: Time spent reading per session
2. **Vocabulary growth**: Words saved over time
3. **Retention**: Flashcard review completion rate
4. **Return usage**: Daily/weekly active users

---

## References

- [NeuBible Design Analysis](https://brianlovin.com/app-dissection/neubible-ios)
- [Du Chinese Review](https://www.alllanguageresources.com/du-chinese-review/)
- [Chinese Union Version Wikipedia](https://en.wikipedia.org/wiki/Chinese_Union_Version)
- [Meditation App Design Principles](https://www.purrweb.com/blog/designing-a-meditation-app-tips-step-by-step-guide/)
- [Kinetic Typography in UX](https://raw.studio/blog/stop-scrolling-kinetic-typography-is-redefining-ux/)
- [Chinese Typography Best Practices](https://blog.justfont.com/2024/08/google-fonts-cjk-en/)
