# Daily Reading Marker Feature

## Overview

An elegant end-of-passage reading marker that appears when users following a reading plan reach the end of their daily reading assignment. The marker provides a natural completion point and navigation to continue their plan.

## Design Philosophy

The marker embodies a refined, scholarly aesthetic that matches the app's premium Bible reading experience:

- **Minimalist elegance**: Clean lines, subtle animations, gentle gradients
- **Bilingual presentation**: Chinese characters with pinyin, paired with English
- **Visual hierarchy**: Decorative dividers, completion checkmark, clear call-to-action
- **Respectful pause**: Creates a natural stopping point without being intrusive

## Visual Components

### 1. Decorative Top Divider
- Horizontal gradient lines fading in from edges
- Small centered accent dot
- Creates visual separation from verse content

### 2. Completion Indicator
- Circular badge with checkmark icon
- Subtle background with accent border
- Spring animation on appearance (scale from 0 → 1)

### 3. Bilingual Text
- **Chinese**: 今日閱讀完成 (jīn rì yuè dú wán chéng)
- **Pinyin**: Displayed above each character with proper spacing
- **English**: "Daily Reading Complete" in small caps with tracking

### 4. Action Button
Two variants depending on reading plan state:

#### Next Passage Button
- Shows when there are more passages for today
- Bilingual text: 下一篇 (xià yī piān) / "Next Passage"
- Right arrow icon
- Navigates to the next passage in the plan

#### Complete Day Button
- Shows when this is the last passage of the day
- Bilingual text: 標記完成 (biāo jì wán chéng) / "Mark as Complete"
- Checkmark circle icon
- Marks the day's reading as complete in the plan

### 5. Context Info
- Small text showing current book name and chapter
- Provides orientation for the user

### 6. Decorative Bottom Divider
- Mirror of top divider with lighter opacity
- Provides closure to the marker section

## Technical Implementation

### File Structure

```
src/
├── components/reading/
│   ├── DailyReadingMarker.tsx    # Main marker component
│   └── InfiniteScroll.tsx         # Integration point
├── utils/
│   └── readingPlanHelpers.ts      # Passage detection logic
└── types/
    └── progress.ts                # PlanPassage type definitions
```

### Key Files Created/Modified

1. **DailyReadingMarker.tsx** - New component
   - Props: `isLastPassage`, `onNextPassage`, `onComplete`, `passageInfo`
   - Framer Motion animations for smooth entrance
   - Responsive design (mobile-first with md: breakpoints)
   - Uses app's CSS variable design system

2. **readingPlanHelpers.ts** - New utility module
   - `isEndOfPassage()`: Checks if a verse is the end of a passage
   - `findEndingPassage()`: Finds which passage ends at current position
   - `getNextPassage()`: Gets the next passage in the plan
   - `isWithinPassage()`: Checks if position is within a passage

3. **InfiniteScroll.tsx** - Modified
   - Added props: `dailyReadingPassages`, `onNextPassage`, `onCompleteDay`
   - ChapterBlock checks if last verse is end of passage
   - Renders DailyReadingMarker after the appropriate verse

4. **ReadingScreen.tsx** - Modified
   - Connects to `useReadingPlansStore`
   - Passes current day's passages to InfiniteScroll
   - Handles navigation to next passage
   - Handles marking day as complete

### Integration Flow

```
ReadingScreen
  ↓ (gets current day's passages)
useReadingPlansStore.getCurrentDayReading()
  ↓ (passes passages to)
InfiniteScroll
  ↓ (renders chapters, checks each verse)
ChapterBlock
  ↓ (for last verse in chapter)
findEndingPassage()
  ↓ (if match found, renders)
DailyReadingMarker
  ↓ (user action)
onNextPassage() or onCompleteDay()
  ↓ (navigates or updates plan)
ReadingScreen handlers
```

## Usage Example

### User Flow

1. User starts a reading plan (e.g., "Gospels in 30 Days")
2. Day 1 reading might be: Matthew 1-2, Mark 1
3. User reads Matthew 1
4. After Matthew 1's last verse: **DailyReadingMarker appears**
   - Shows "Next Passage" button
   - User taps to go to Matthew 2
5. After Matthew 2's last verse: **DailyReadingMarker appears again**
   - Shows "Next Passage" button
   - User taps to go to Mark 1
6. After Mark 1's last verse: **DailyReadingMarker appears**
   - Shows "Mark as Complete" button (last passage of the day)
   - User taps to mark Day 1 as complete
7. Day advances, user continues plan

### Code Example

```tsx
// ReadingScreen passes daily passages
const currentDayReading = getCurrentDayReading();
const dailyReadingPassages = currentDayReading?.passages;
// e.g., [
//   { bookId: 'matthew', startChapter: 1, endChapter: 2 },
//   { bookId: 'mark', startChapter: 1 }
// ]

<InfiniteScroll
  dailyReadingPassages={dailyReadingPassages}
  onNextPassage={handleNextPassage}
  onCompleteDay={handleCompleteDay}
  // ... other props
/>

// InfiniteScroll checks if verse is end of passage
const endingPassageInfo = findEndingPassage(
  'matthew',
  1,
  25,  // last verse
  25,  // total verses
  dailyReadingPassages
);
// Returns: { passage: {...}, index: 0 }

// Renders marker after that verse
{endingPassageInfo && (
  <DailyReadingMarker
    isLastPassage={false}  // index 0, not last in array
    onNextPassage={() => navigateToPassage(passages[1])}
  />
)}
```

## Design Tokens

The marker uses the app's existing CSS variable system:

```css
--text-primary      /* Main Chinese text */
--text-secondary    /* Unused in marker */
--text-tertiary     /* Pinyin, decorative elements */
--accent           /* Button background, checkmark, dots */
--accent-subtle    /* Checkmark badge background */
--border           /* Divider lines */
--shadow           /* Button shadows */
--shadow-md        /* Button hover shadows */
```

### Responsive Breakpoints

- Mobile: Default sizes
- Desktop (md:): Slightly larger text, more padding, bigger icons

## Animation Details

1. **Initial appearance** (duration: 0.6s, ease: cubic-bezier)
   - Opacity: 0 → 1
   - Y position: +10px → 0

2. **Checkmark badge** (delay: 0.2s, spring animation)
   - Scale: 0 → 1
   - Spring stiffness: 200, damping: 15

3. **Button interactions**
   - Hover: scale 1.02, enhanced shadow
   - Tap: scale 0.98

## Accessibility

- Semantic HTML structure
- Clear visual hierarchy
- Touch-friendly tap targets (py-3.5 = 56px min)
- Readable text sizes
- Sufficient color contrast

## Edge Cases Handled

1. **Single-chapter passage**: endChapter is undefined, uses startChapter
2. **Specific verse ranges**: Checks endVerse if specified
3. **Multiple passages in different books**: Correctly identifies book boundaries
4. **Last passage of day**: Shows different button/text
5. **No active plan**: Marker doesn't appear (dailyReadingPassages is undefined)

## Future Enhancements

Potential improvements (not implemented):

1. **Celebration animation**: Confetti or rays when day is completed
2. **Progress indicator**: "2 of 3 passages complete"
3. **Estimated time**: "~5 minutes remaining"
4. **Streak reminder**: "Day 7 of your streak!"
5. **Share achievement**: Social sharing after completing a day
6. **Custom messages**: Plan-specific completion text
7. **Analytics**: Track completion rates per plan

## Testing Considerations

To test this feature:

1. Start a reading plan in the dashboard
2. Navigate to the first passage of today's reading
3. Scroll to the end of the passage
4. Verify marker appears with correct button
5. Tap button and verify navigation/completion
6. Test with single-passage and multi-passage days
7. Test across different themes (light/dark/sepia)
8. Test on mobile and desktop viewports

## Summary

The Daily Reading Marker is a thoughtfully designed completion indicator that:

- ✅ Provides clear visual confirmation of passage completion
- ✅ Seamlessly guides users through multi-passage reading plans
- ✅ Maintains the app's refined, scholarly aesthetic
- ✅ Integrates naturally into the infinite scroll reading experience
- ✅ Respects user attention with elegant, non-intrusive design
- ✅ Supports bilingual presentation with proper Chinese typography

It enhances the reading plan experience without disrupting the core reading flow.
