# Visual Stroke/Line Artifact Fix

## Problem
Users reported seeing a weird stroke/line rendering issue underneath Chinese characters like 耶 (yē) and 家 (jiā) in the vocabulary list screen.

## Root Cause
The visual artifact was caused by a combination of CSS properties in the `WordItem` component:

1. **`items-end` alignment**: This aligns flex items to the bottom edge of the flex container, not the text baseline
2. **`leading-none` (line-height: 1)**: Makes the text box tightly wrap the font with no extra line spacing
3. **`pb-0.5` (padding-bottom: 0.125rem)**: Adds a small 2px gap below the Chinese character

When these properties combined, especially for Chinese characters with complex bottom strokes (like 耶 and 家), the padding created a visible gap that appeared as a line artifact underneath the characters.

## Solution
Changed the flex alignment from `items-end` to `items-baseline` and removed the `pb-0.5` padding:

**Before:**
```tsx
<div className="flex items-end gap-3">
  <span className="font-chinese-serif text-xl leading-none pb-0.5">
    {word.chinese}
  </span>
  <span className="font-body text-sm italic leading-none">
    {word.pinyin}
  </span>
</div>
```

**After:**
```tsx
<div className="flex items-baseline gap-3">
  <span className="font-chinese-serif text-xl leading-none">
    {word.chinese}
  </span>
  <span className="font-body text-sm italic leading-none">
    {word.pinyin}
  </span>
</div>
```

## Why This Works
- `items-baseline` aligns text elements by their natural typographic baseline
- This ensures proper alignment between the Chinese character and pinyin without creating gaps
- Removing `pb-0.5` eliminates the artificial space that was creating the visual artifact

## Files Changed
- `/Users/charleswu/Desktop/+/bilingual_bib/src/components/vocabulary/VocabularyScreen.tsx` (lines 378-391)

## Testing
A visual comparison test was created in `test_fix.html` that demonstrates the before/after difference. The screenshot `fix_comparison.png` clearly shows:
- **Before**: Visible gaps/lines under Chinese characters
- **After**: Clean rendering with no artifacts

## Verification
- ✅ TypeScript compilation successful
- ✅ Build completed successfully
- ✅ No other instances of `pb-0.5` found in the codebase
- ✅ Visual comparison confirms the fix
