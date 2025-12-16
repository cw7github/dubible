# Quick Test Guide - PWA Hold Gesture Fix

## What Changed
Fixed the iOS PWA standalone mode issue where definition cards appeared but immediately disappeared after releasing the hold gesture.

## How to Test

### 1. Deploy to Test Environment
```bash
npm run build
# Deploy to your hosting (Vercel, etc.)
```

### 2. Test in PWA Mode (PRIMARY TEST)
1. Open your PWA in Safari on iOS
2. Tap "Share" → "Add to Home Screen"
3. Open the app from the home screen icon (this is PWA standalone mode)
4. Navigate to any chapter with Chinese text
5. **Hold your finger on a Chinese word for ~300ms**
6. **Release your finger**
7. ✅ **SUCCESS**: Card stays visible
8. ❌ **FAILURE**: Card disappears immediately

### 3. Check Console Logs
Open Safari Dev Tools (connect iOS device to Mac):
1. Safari → Develop → [Your iPhone] → [Your PWA]
2. Hold a word and release
3. Look for logs:
   ```
   [PWA Fix] Backdrop click event { timeSinceOpen: 350, ... }
   [PWA Fix] Blocked premature panel dismissal (synthetic click suspected)
   ```
4. If you see "Blocked premature dismissal" within ~600ms, **the fix is working**

### 4. Test Normal Dismissal
1. Hold word → card appears
2. Wait 1 full second
3. Tap the backdrop (outside the card)
4. ✅ Card should dismiss normally
5. Check logs - should NOT see "Blocked premature dismissal"

### 5. Test in Safari Browser (Should Still Work)
1. Open the PWA URL in Safari (NOT from home screen)
2. Test hold gesture
3. Should work as before

## What to Look For

### Success Indicators
- Card appears and STAYS visible after release
- Console shows "Blocked premature dismissal" logs around 300-400ms
- After 600ms, normal dismissal works
- No visual glitches or stuck states

### Failure Indicators
- Card still disappears immediately (old bug persists)
- Card won't dismiss even after 1+ second
- Multiple rapid dismissal/reappearance cycles

## Rollback Plan
If the fix causes issues:
```bash
git diff HEAD~1 src/components/reading/ReadingScreen.tsx
# Review changes, then:
git checkout HEAD~1 -- src/components/reading/ReadingScreen.tsx
```

## Technical Details
- Extended backdrop immunity: 300ms → 500ms
- Added dismissal blocking: first 600ms after open
- Synthetic click timing: iOS generates clicks ~300-350ms after touchend
- Safety margin: 100ms buffer for timing variations

## Questions?
Check `PWA_HOLD_GESTURE_FIX.md` for detailed technical explanation.
