# Development Guide

## Prerequisites

- **Node.js**: 18+ (recommended: 20 LTS)
- **npm**: 9+
- **Gemini API Key**: Required for preprocessing (get from https://makersuite.google.com/app/apikey)

## Initial Setup

```bash
# Clone repository
cd bilingual_bib

# Install dependencies
npm install

# Set up environment variables (optional, for preprocessing)
export GEMINI_API_KEY="your-api-key-here"
# Or create .env file:
echo "GEMINI_API_KEY=your-api-key-here" > .env
```

## Development Workflow

### 1. Start Dev Server

```bash
npm run dev
```

Opens at `http://localhost:5173`

**Features**:
- Hot Module Replacement (HMR)
- FHL Bible API proxy (avoids CORS)
- Fast refresh for React components
- TypeScript type checking in background

### 2. Development with Preprocessed Data

The app works with **partially preprocessed data**. Only Matthew chapters 1-4 are preprocessed by default.

**To add more books**:

```bash
# Single chapter
npx tsx scripts/preprocess-bible.ts --book mark --chapter 1

# Entire book (28 chapters for Matthew)
npx tsx scripts/preprocess-bible.ts --book matthew

# Multiple books at once (expensive!)
npx tsx scripts/preprocess-bible.ts --book matthew
npx tsx scripts/preprocess-bible.ts --book mark
npx tsx scripts/preprocess-bible.ts --book john
```

**After preprocessing, update manifest**:
```bash
npm run generate-manifest
```

**Verify preprocessed data**:
```bash
# Check manifest
cat public/data/preprocessed/manifest.json | jq

# Inspect a chapter
cat public/data/preprocessed/matthew/chapter-1.json | jq '.verses[0]'
```

### 3. Fallback to Runtime Processing

If preprocessed data is missing, the app automatically falls back to runtime segmentation using `chineseProcessor.ts`. This provides coverage but lower quality than Gemini preprocessing.

**To force runtime processing** (for testing):
- Delete preprocessed JSON files
- Clear browser cache / IndexedDB

## Preprocessing Pipeline

### Run Preprocessing

**Basic usage**:
```bash
# Single chapter
npx tsx scripts/preprocess-bible.ts --book romans --chapter 1

# Entire book
npx tsx scripts/preprocess-bible.ts --book romans

# All 66 books (WARNING: ~2000 chapters, expensive API calls!)
npx tsx scripts/preprocess-bible.ts --all
```

### Rate Limits and Costs

**Gemini 2.5 Flash Free Tier**:
- 15 requests/minute
- 1 million tokens/minute
- 1500 requests/day

**Script Configuration** (`scripts/preprocess-bible.ts`):
```typescript
const CONFIG = {
  apiKey: process.env.GEMINI_API_KEY,
  model: 'gemini-2.5-flash',
  batchSize: 5,              // Verses per API call
  delayBetweenBatches: 1000, // 1 second delay
  maxRetries: 3,             // Retry failed requests
};
```

**Estimated Processing Time**:
- 1 chapter (25 verses): ~30 seconds
- 1 book (28 chapters): ~15 minutes
- Full Bible (1189 chapters): ~10 hours

**Tips**:
- Process during off-peak hours
- Monitor rate limits in console output
- Restart from failed chapter using `--book X --chapter Y`
- Consider upgrading to paid tier for bulk processing

### Preprocessing Output

**File structure**:
```
public/data/preprocessed/
├── manifest.json              # Index of all preprocessed data
├── matthew/
│   ├── chapter-1.json
│   ├── chapter-2.json
│   └── ...
├── mark/
│   └── chapter-1.json
└── ...
```

**Quality validation**:

Check for common issues:
```bash
# Verify all words have pinyin
cat public/data/preprocessed/matthew/chapter-1.json | \
  jq '.verses[].words[] | select(.pinyin == "")'

# Count words per verse (should be reasonable)
cat public/data/preprocessed/matthew/chapter-1.json | \
  jq '.verses[] | {verse: .number, wordCount: (.words | length)}'

# Check for missing definitions
cat public/data/preprocessed/matthew/chapter-1.json | \
  jq '.verses[].words[] | select(.definition == null or .definition == "")'
```

## Building for Production

### Standard Build

```bash
npm run build
```

**Output**: `dist/` directory with optimized bundle

**Includes**:
- Minified JS/CSS
- Service worker for PWA
- Preprocessed data (if in `public/`)
- Font files
- Icons and manifest

### Preview Production Build

```bash
npm run preview
```

Opens production build at `http://localhost:4173`

### Build Configuration

**vite.config.ts**:
- **Base path**: `/` (change for subdirectory deployment)
- **PWA**: Configured with `vite-plugin-pwa`
- **Chunks**: Automatic code splitting
- **Assets**: Inlined small files, hashed filenames

## Testing

### Manual Testing Checklist

**Core Features**:
- [ ] Navigate between books
- [ ] Scroll through chapters (infinite scroll)
- [ ] Tap verse to see English translation
- [ ] Long-press word to see definition
- [ ] Save word to vocabulary
- [ ] Review vocabulary with flashcards
- [ ] Change settings (font, size, theme)
- [ ] Offline mode (disable network, refresh)

**Edge Cases**:
- [ ] Load chapter without preprocessed data (fallback)
- [ ] Handle API errors gracefully
- [ ] Empty vocabulary list
- [ ] First/last chapters of books
- [ ] Mobile Safari (iOS)
- [ ] Chrome Android

### Browser Testing

**Desktop**:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)

**Mobile** (priority):
- iOS Safari (14+)
- Chrome Android (90+)

**PWA Testing**:
1. Open in mobile browser
2. Add to home screen
3. Open from home screen
4. Test offline functionality

### Performance Testing

**Lighthouse audit**:
```bash
npm run build
npm run preview
# Open Chrome DevTools → Lighthouse → Run audit
```

**Targets**:
- Performance: 90+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+
- PWA: ✓ Installable

## Deployment

### Static Hosting (Recommended)

**Vercel**:
```bash
npm install -g vercel
vercel --prod
```

**Netlify**:
```bash
npm install -g netlify-cli
netlify deploy --prod
```

**Build command**: `npm run build`
**Output directory**: `dist`

### Custom Server

Requirements:
- Serve `dist/` as static files
- Configure SPA routing (all routes → `index.html`)
- HTTPS (required for PWA)
- Gzip/Brotli compression

**nginx example**:
```nginx
server {
  listen 443 ssl http2;
  server_name bilingual-bible.example.com;

  root /var/www/bilingual-bible/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location ~* \.(js|css|png|jpg|jpeg|gif|svg|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  gzip on;
  gzip_types text/plain text/css application/json application/javascript;
}
```

### Environment Variables

**Build-time only** (not exposed to client):
- `GEMINI_API_KEY`: For preprocessing script

**No runtime environment variables needed** - all data is static.

## Project Structure Reference

```
bilingual_bib/
├── src/
│   ├── components/        # React components
│   │   ├── reading/       # Main reading UI
│   │   ├── vocabulary/    # Vocabulary features
│   │   ├── navigation/    # Book navigation
│   │   └── settings/      # Settings panel
│   ├── stores/            # Zustand state management
│   ├── services/          # API clients, data loaders
│   ├── types/             # TypeScript definitions
│   ├── data/              # Static data (books, English text)
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Helper functions
│   ├── App.tsx            # Root component
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles
├── public/
│   ├── data/
│   │   └── preprocessed/  # Generated by preprocessing script
│   └── icons/             # PWA icons
├── scripts/
│   ├── preprocess-bible.ts      # Gemini preprocessing
│   └── generate-manifest.cjs    # Manifest generator
├── dist/                  # Build output (generated)
├── docs/                  # Documentation
├── vite.config.ts         # Vite configuration
├── tailwind.config.js     # Tailwind CSS config
├── tsconfig.json          # TypeScript config
└── package.json
```

## Common Development Tasks

### Add a New Component

1. Create file in appropriate directory:
   ```bash
   touch src/components/reading/NewComponent.tsx
   ```

2. Follow naming conventions:
   - PascalCase for component files
   - Export from `index.ts` in directory

3. Use existing patterns:
   - Import types from `../../types`
   - Use Zustand stores for state
   - Follow design system (CSS variables)
   - Add Framer Motion for animations

### Modify Preprocessing Prompt

Edit `/Users/charleswu/Desktop/+/bilingual_bib/scripts/preprocess-bible.ts`:

**Location**: `buildPrompt()` function

**Test changes**:
```bash
# Test on single chapter first
npx tsx scripts/preprocess-bible.ts --book matthew --chapter 1

# Inspect output
cat public/data/preprocessed/matthew/chapter-1.json | jq '.verses[0].words'
```

### Add a New Bible Translation

1. **Add to data source** (`src/data/english/` or `src/services/bibleApi.ts`)

2. **Update types** (`src/types/bible.ts`):
   ```typescript
   interface BibleVersion {
     id: string;
     name: string;
     language: 'chinese' | 'english';
     abbreviation: string;
   }
   ```

3. **Add version selector** in `SettingsScreen.tsx`

4. **Update loader logic** in `preprocessedLoader.ts` or `bibleApi.ts`

### Customize Styling

**Theme colors**: Edit CSS variables in `src/index.css`:
```css
:root {
  --accent: #C9A871;  /* Gold accent */
  --bg-primary: #FDFCFA;  /* Warm white */
  /* ... */
}
```

**Typography**: Edit Tailwind config or CSS:
```typescript
// tailwind.config.js
theme: {
  fontFamily: {
    'chinese-serif': ['Noto Serif TC', 'serif'],
    'chinese-sans': ['Noto Sans TC', 'sans-serif'],
  }
}
```

## Debugging

### Common Issues

**"No preprocessed data found"**:
- Run preprocessing script
- Generate manifest
- Check file paths in `public/data/preprocessed/`

**"Gemini API error"**:
- Verify API key is set
- Check rate limits
- Inspect network tab for API calls

**"Component not re-rendering"**:
- Check Zustand store subscriptions
- Verify state updates are immutable
- Use React DevTools to inspect state

**"PWA not installing"**:
- Serve over HTTPS (localhost is OK)
- Check manifest.json is valid
- Verify service worker registration
- Check Chrome DevTools → Application → Manifest

### Debug Tools

**React DevTools**: Install browser extension
**Redux DevTools**: Works with Zustand stores (enable middleware)

**Vite debug mode**:
```bash
DEBUG=vite:* npm run dev
```

**TypeScript checking**:
```bash
npx tsc --noEmit
```

## Performance Optimization Tips

1. **Lazy load routes** (already implemented)
2. **Memoize expensive computations** (use `useMemo`, `useCallback`)
3. **Virtualize long lists** (consider `react-window` for vocabulary)
4. **Optimize images** (use WebP, lazy loading)
5. **Code splitting** (dynamic imports for heavy components)
6. **Service worker caching** (already configured)

## Contribution Guidelines

1. **Branch naming**: `feature/name`, `fix/name`
2. **Commit messages**: Descriptive, present tense
3. **TypeScript**: Strict mode, no `any` types
4. **Linting**: Run `npm run lint` before committing
5. **Testing**: Manual testing checklist before PR
6. **Documentation**: Update docs if changing architecture

## Useful Commands

```bash
# Development
npm run dev                          # Start dev server
npm run build                        # Production build
npm run preview                      # Preview build
npm run lint                         # Lint code

# Preprocessing
npx tsx scripts/preprocess-bible.ts --book {book}    # Preprocess book
npx tsx scripts/preprocess-bible.ts --all            # Preprocess all
npm run generate-manifest                             # Update manifest

# Debugging
npx tsc --noEmit                     # Type check
cat public/data/preprocessed/manifest.json | jq      # Inspect manifest

# Deployment
vercel --prod                        # Deploy to Vercel
netlify deploy --prod                # Deploy to Netlify
```

## Additional Resources

- **Vite Documentation**: https://vitejs.dev
- **React 19 Docs**: https://react.dev
- **Zustand**: https://github.com/pmndrs/zustand
- **Framer Motion**: https://www.framer.com/motion/
- **Tailwind CSS**: https://tailwindcss.com
- **Gemini API**: https://ai.google.dev/docs
- **FHL Bible API**: https://bible.fhl.net/json/

## Support

For issues or questions:
1. Check this documentation
2. Review `/Users/charleswu/Desktop/+/bilingual_bib/docs/AGENTS.md` for architecture overview
3. Inspect existing code for patterns
4. Debug with browser DevTools
