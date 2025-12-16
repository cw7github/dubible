# iOS PWA Hold Gesture Fix - Synthetic Click Events

## Problem Summary

The hold gesture for displaying word definitions was broken **ONLY in iOS PWA standalone mode** (when added to homescreen). The definition card would appear but immediately disappear when the user released their finger. This did NOT occur in Safari browser mode.

## Root Cause Analysis

### The Synthetic Click Problem

iOS generates **synthetic click events** approximately 300-350ms after `touchend` events complete. This behavior is more aggressive in PWA standalone mode than in Safari browser mode.

**Event Timeline (PWA Mode):**
```
t=0ms:     User starts holding word
t=300ms:   Hold threshold met → card opens
t=300ms:   panelOpenTimestamp recorded
t=300ms:   Backdrop pointer-events set to 'none'
t=305ms:   User releases finger → touchend fires
t=600ms:   Backdrop pointer-events switches to 'auto' (OLD: 300ms)
t=605ms:   iOS generates synthetic click on backdrop
t=605ms:   Card dismisses immediately ❌
```

**Why it worked in Safari but not PWA:**
- Safari browser mode: Less aggressive synthetic click generation
- PWA standalone mode: More "app-like" behavior, generates clicks more reliably
- The 300ms immunity period was TOO SHORT to outlast the synthetic click

## Solution Implemented

### Multi-Layered Defense

1. **Extended Immunity Period (300ms → 500ms)**
   - Backdrop stays non-interactive longer
   - Outlasts the typical 300-350ms synthetic click timing

2. **Time-Based Dismissal Blocking**
   - Track when panel was opened (`panelOpenTimestampRef`)
   - Block ANY dismissal attempts within 600ms of opening
   - Even if synthetic click gets through, it's ignored

3. **Comprehensive Logging**
   - Log all backdrop click events with timestamps
   - Track `isTrusted` flag to identify synthetic vs real clicks
   - Log dismissal blocks for debugging

## Code Changes

### ReadingScreen.tsx

```typescript
// Added timestamp tracking
const panelOpenTimestampRef = useRef<number>(0);

// Record open time when panel opens
panelOpenTimestampRef.current = Date.now();

// Extended immunity from 300ms to 500ms
setTimeout(() => {
  setBackdropPointerEvents('auto');
}, 500);

// Block premature dismissals
const handleClosePanelWithImmunity = useCallback(() => {
  const timeSinceOpen = Date.now() - panelOpenTimestampRef.current;
  if (timeSinceOpen < 600) {
    console.log('[PWA Fix] Blocked premature dismissal (synthetic click)');
    return; // Don't dismiss
  }
  // ... rest of dismissal logic
}, [handleClosePanel]);
```

## Testing Checklist

Test in **PWA standalone mode** (Add to Home Screen):

- [ ] Hold word → card appears
- [ ] Release finger → card STAYS visible
- [ ] Wait 1 second, tap backdrop → card dismisses
- [ ] Check console logs for synthetic click detection
- [ ] Verify no "Blocked premature dismissal" logs after 600ms
- [ ] Test rapid hold/release gestures

Test in **Safari browser mode** (should still work):

- [ ] Hold word → card appears and stays
- [ ] Normal dismissal works correctly

## Key Metrics

- **Immunity period**: 500ms (up from 300ms)
- **Dismissal block period**: 600ms (safety margin beyond immunity)
- **iOS synthetic click timing**: ~300-350ms after touchend
- **Hold threshold**: 300ms (unchanged)

## Why This Works

1. **Temporal Defense**: 500ms immunity outlasts the 300-350ms synthetic click
2. **Logical Defense**: 600ms dismissal block catches any clicks that slip through
3. **Safety Margin**: 100ms buffer (600ms - 500ms) for timing variations
4. **No User Impact**: 600ms is imperceptible for intentional dismissals

## Related Files

- `/src/components/reading/ReadingScreen.tsx` - Main fix implementation
- `/src/hooks/useHold.ts` - Touch event handling with preventDefault
- `/src/components/reading/ChineseWord.tsx` - Word component with hold gesture
- `/src/hooks/useScrollDismiss.ts` - Scroll-based dismissal (not affected)

## References

- [iOS Touch Event Handling](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html)
- [PWA vs Browser Mode Differences](https://web.dev/customize-install/)
- Previous fix: `WORD_HIGHLIGHT_REDESIGN.md` (text selection fix)
