# Book Graphics Integration Guide

## Overview
This document describes the unique minimalist line art SVG graphics created for all 66 books of the Bible. These graphics are designed to be tasteful, subtle, and thematically appropriate for a scholarly Bible app.

## Files Created

### 1. SVG Graphics (66 files)
All files are located in: `/src/assets/book-graphics/`

**Design specifications:**
- ViewBox: 80x80
- Single-stroke line art, 1.5px stroke width
- Uses `currentColor` for stroke (inherits from CSS)
- No fill, stroke only
- Subtle, refined, not cartoonish

#### Old Testament (39 books)
1. `genesis.svg` - Tree of life
2. `exodus.svg` - Parted sea waves
3. `leviticus.svg` - Altar with flame
4. `numbers.svg` - Twelve stars (tribes)
5. `deuteronomy.svg` - Stone tablets
6. `joshua.svg` - City walls (Jericho)
7. `judges.svg` - Gavel/balance
8. `ruth.svg` - Wheat sheaf
9. `1samuel.svg` - Horn of oil
10. `2samuel.svg` - Crown and harp
11. `1kings.svg` - Temple pillars
12. `2kings.svg` - Chariot of fire
13. `1chronicles.svg` - Genealogy scroll
14. `2chronicles.svg` - Temple
15. `ezra.svg` - Scroll with seal
16. `nehemiah.svg` - Wall with gate
17. `esther.svg` - Royal crown
18. `job.svg` - Broken pottery
19. `psalms.svg` - Harp/lyre
20. `proverbs.svg` - Oil lamp
21. `ecclesiastes.svg` - Sun and moon cycle
22. `songofsolomon.svg` - Rose/lily
23. `isaiah.svg` - Burning coal/lips
24. `jeremiah.svg` - Potter's vessel
25. `lamentations.svg` - Tear drop
26. `ezekiel.svg` - Four-faced wheel
27. `daniel.svg` - Lion
28. `hosea.svg` - Broken heart mending
29. `joel.svg` - Locust
30. `amos.svg` - Plumb line
31. `obadiah.svg` - Eagle descending
32. `jonah.svg` - Whale/fish
33. `micah.svg` - Mountain
34. `nahum.svg` - Flooding waters
35. `habakkuk.svg` - Watchtower
36. `zephaniah.svg` - Candle search
37. `haggai.svg` - Temple foundation
38. `zechariah.svg` - Olive branches and lampstand
39. `malachi.svg` - Messenger/angel wings

#### New Testament (27 books)
40. `matthew.svg` - Angel/man (traditional symbol)
41. `mark.svg` - Lion
42. `luke.svg` - Ox
43. `john.svg` - Eagle
44. `acts.svg` - Flame (Pentecost)
45. `romans.svg` - Roman road
46. `1corinthians.svg` - Temple columns
47. `2corinthians.svg` - Clay jar
48. `galatians.svg` - Broken chains
49. `ephesians.svg` - Armor/shield
50. `philippians.svg` - Joy/heart
51. `colossians.svg` - Crown/throne
52. `1thessalonians.svg` - Cloud/return
53. `2thessalonians.svg` - Trumpet
54. `1timothy.svg` - Shepherd's staff
55. `2timothy.svg` - Scroll and quill
56. `titus.svg` - Island outline (Crete)
57. `philemon.svg` - Handshake/reconciliation
58. `hebrews.svg` - High priest's breastplate
59. `james.svg` - Mirror
60. `1peter.svg` - Rock/cornerstone
61. `2peter.svg` - Morning star
62. `1john.svg` - Light rays
63. `2john.svg` - Letter/envelope
64. `3john.svg` - Open door
65. `jude.svg` - Contending figure
66. `revelation.svg` - Alpha and Omega

### 2. Mapping File
**File:** `/src/assets/book-graphics/bookGraphics.ts`

This file imports all 66 SVG files and exports a mapping object that maps English book names to their corresponding SVG graphics.

### 3. Component Files

#### BookGraphic Component
**File:** `/src/components/reading/BookGraphic.tsx`

**Note:** This file may have been auto-reverted by a linter. The correct implementation should be:

```tsx
import { memo } from 'react';
import { bookGraphics } from '../../assets/book-graphics/bookGraphics';

interface BookGraphicProps {
  bookName: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * BookGraphic component displays a minimalist SVG graphic representing
 * the thematic essence of a Bible book. These graphics appear at the
 * beginning of each book (chapter 1) to provide visual context.
 *
 * Design features:
 * - Single-stroke line art with 1.5px width
 * - Inherits color from parent (currentColor)
 * - 80x80 viewBox, displayed at 60-80px
 * - Opacity 0.25 for subtle, refined appearance
 */
export const BookGraphic = memo(function BookGraphic({
  bookName,
  className = '',
  style
}: BookGraphicProps) {
  const graphicUrl = bookGraphics[bookName];

  if (!graphicUrl) {
    return null;
  }

  return (
    <div className={className} style={style} aria-hidden="true">
      <img
        src={graphicUrl}
        alt={`${bookName} symbol`}
        className="w-full h-full opacity-25"
      />
    </div>
  );
});
```

#### ChapterTransition Integration
**File:** `/src/components/reading/ChapterTransition.tsx`

**Note:** This file may have been auto-reverted. The BookGraphic should be called with `bookName` prop:

Change from:
```tsx
<BookGraphic
  bookId={bookId}
  className="w-[60px] h-[60px]"
  style={{ color: 'var(--accent)' }}
/>
```

To:
```tsx
<BookGraphic
  bookName={bookName.english}
  className="w-[60px] h-[60px]"
  style={{ color: 'var(--accent)' }}
/>
```

Also update the animation to show the graphic at full opacity:
```tsx
<motion.div
  className="mx-auto mb-5 flex items-center justify-center"
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}  // Changed from opacity: 0.25
  transition={{ duration: 0.5, delay: 0.2 }}
>
```

## Integration Steps

1. **Verify SVG files:** Ensure all 66 SVG files are in `/src/assets/book-graphics/`

2. **Update BookGraphic.tsx:** Replace the content with the implementation shown above

3. **Update ChapterTransition.tsx:** 
   - Change `bookId` prop to `bookName={bookName.english}`
   - Update opacity animation from 0.25 to 1.0

4. **Test:** Navigate to any book's chapter 1 to see the graphic displayed

## Styling

The graphics inherit their color from the parent component via `currentColor`. The opacity is set to 0.25 in the component's CSS class for a subtle appearance.

Current styling:
- Width: 60-80px (responsive)
- Opacity: 0.25
- Color: Inherits from `--accent` CSS variable
- Positioned between decorative flourish and book title

## Troubleshooting

If the graphics don't appear:

1. Check that `bookGraphics.ts` is correctly importing all SVG files
2. Verify the book name matches exactly (e.g., "1 Samuel" not "1Samuel")
3. Ensure Vite is configured to handle SVG imports (vite-plugin-svgr should be installed)
4. Check browser console for import errors

## File Watcher Note

If you're experiencing auto-revert issues with BookGraphic.tsx and ChapterTransition.tsx, you may need to:
1. Temporarily disable any auto-formatting tools (Prettier, ESLint auto-fix)
2. Make the changes and save
3. Re-enable formatting tools
