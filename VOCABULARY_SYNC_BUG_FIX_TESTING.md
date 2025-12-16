# Testing Guide: Vocabulary Sync Bug Fix

## Overview

This document provides step-by-step instructions to test the fix for the critical vocabulary sync bug where saved words were disappearing.

## Prerequisites

1. Have the app running locally or deployed
2. Have Firebase authentication set up
3. Have access to browser developer console
4. Optionally: Two devices for multi-device testing

## Test Cases

### Test 1: Basic Word Persistence (Single Device)

**Purpose:** Verify that saved words persist locally and don't disappear.

**Steps:**
1. Log in to the app
2. Navigate to any Bible passage
3. Long-press on a Chinese word to open the word detail panel
4. Click the "Save" button to add the word to vocabulary
5. Wait 5 seconds (this is when the bug would have occurred)
6. Navigate to the Vocabulary screen
7. Verify the word is still there

**Expected Result:**
- Word appears in vocabulary immediately after saving
- Word is still present after 5 seconds
- Console shows: `[Sync] Ignoring vocabulary cloud update - recent local modification`
- Console shows: `[Sync] Syncing vocabulary to cloud...` after 500ms
- Console shows: `[Sync] Successfully synced vocabulary to cloud`

**Failure Indicators:**
- Word disappears after a few seconds
- Console shows: `[Sync] Applying vocabulary update from cloud: 0 words`
- Vocabulary becomes empty

---

### Test 2: Multiple Rapid Saves

**Purpose:** Verify that rapidly saving multiple words works correctly.

**Steps:**
1. Log in to the app
2. Navigate to a Bible passage
3. Quickly save 5 different words (one after another)
4. Wait 5 seconds
5. Check vocabulary screen

**Expected Result:**
- All 5 words appear in vocabulary
- All 5 words persist after 5 seconds
- Console shows debounced sync (not 5 separate syncs)
- Only one `[Sync] Successfully synced vocabulary to cloud` message

**Failure Indicators:**
- Some words disappear
- Multiple sync operations fire

---

### Test 3: Multi-Device Sync

**Purpose:** Verify that changes from one device appear on another device.

**Steps:**
1. Log in to the app on Device A
2. Log in to the app on Device B (same account)
3. Wait for initial sync to complete on both devices
4. On Device A: Save a word to vocabulary
5. Wait 5 seconds
6. On Device B: Check if the word appears

**Expected Result:**
- Device A: Word appears immediately, console shows local modification logs
- Device B (after 3-5 seconds): Word appears, console shows: `[Sync] Applying vocabulary update from cloud: N words`

**Failure Indicators:**
- Word doesn't appear on Device B
- Word appears then disappears on Device B

---

### Test 4: Offline/Online Sync

**Purpose:** Verify that changes made offline sync when coming back online.

**Steps:**
1. Log in to the app
2. Open browser DevTools → Network tab
3. Enable "Offline" mode
4. Save a word to vocabulary
5. Verify word appears in local vocabulary
6. Disable "Offline" mode
7. Wait 2-3 seconds
8. Check browser console and Firestore database

**Expected Result:**
- Word appears in vocabulary while offline
- When coming online, sync starts automatically
- Console shows: `[Sync] Syncing vocabulary to cloud...`
- Console shows: `[Sync] Successfully synced vocabulary to cloud`
- Firestore database has the word

**Failure Indicators:**
- Word disappears when coming online
- Sync doesn't happen automatically
- Error messages in console

---

### Test 5: SRS Review Persistence

**Purpose:** Verify that reviewing words (SRS updates) persist correctly.

**Steps:**
1. Log in to the app
2. Save a word to vocabulary
3. Wait 5 seconds for initial sync
4. Go to Vocabulary screen → Review mode
5. Review the word (mark as "Good")
6. Wait 5 seconds
7. Refresh the page
8. Check if SRS data is preserved

**Expected Result:**
- SRS data updates immediately after review
- Console shows: `[Sync] Syncing vocabulary to cloud...` (triggered by SRS update)
- After refresh, SRS data is still correct (next review time, streak, etc.)

**Failure Indicators:**
- SRS data resets to initial state
- Review progress is lost

---

## Console Log Reference

### Normal Operation Logs

**When saving a word (local modification):**
```
[Sync] Syncing vocabulary to cloud...
[Sync] Successfully synced vocabulary to cloud
[Sync] Ignoring vocabulary cloud update - recent local modification
```

**When receiving update from another device:**
```
[Sync] Applying vocabulary update from cloud: N words
```

### Error Logs

**If sync fails:**
```
Error syncing vocabulary to cloud: [error message]
```

**If Firestore is not initialized:**
```
Error setting up sync: Firestore not initialized
```

---

## Debugging Tips

### Check localStorage

Open browser console and run:
```javascript
JSON.parse(localStorage.getItem('bilingual-bible-vocabulary'))
```

This shows the local vocabulary data.

### Check Firestore

1. Go to Firebase Console
2. Navigate to Firestore Database
3. Check: `users/{userId}/vocabulary/`
4. Verify word documents exist

### Monitor Real-Time Sync

Keep browser console open and watch for:
- `[Sync]` prefixed messages
- Timestamp of messages
- Sequence of events

### Clear State and Test Fresh

To test from clean state:
```javascript
// Clear local storage
localStorage.removeItem('bilingual-bible-vocabulary');

// Reload page
location.reload();
```

---

## Known Issues & Limitations

### 2-Second Echo Window

- Local modifications are protected for 2 seconds
- If another device makes a change within 2 seconds, it might be ignored
- This is unlikely in normal usage but possible in rapid multi-device scenarios

### Network Delays

- Very slow networks (>2 seconds latency) might cause issues
- If sync takes longer than 2 seconds, echo detection might fail
- Consider increasing the window from 2000ms to 3000ms if needed

### Firestore Offline Persistence

- Firestore has its own offline cache
- Changes made offline are queued and synced when online
- This is handled by Firebase SDK automatically

---

## Success Criteria

The fix is successful if:

1. ✅ Saved words persist after 5+ seconds (single device)
2. ✅ Multiple rapid saves all persist
3. ✅ Changes sync between devices correctly
4. ✅ Offline changes sync when coming online
5. ✅ SRS review data persists correctly
6. ✅ No error messages in console
7. ✅ Console logs show expected sequence of events

---

## Rollback Plan

If the fix causes issues:

1. Revert `src/hooks/useSyncManager.ts` to previous version
2. Run `npm run build` to verify no errors
3. Deploy the reverted version

Git command:
```bash
git checkout HEAD~1 -- src/hooks/useSyncManager.ts
```

---

## Additional Testing Tools

### Firestore Rules Simulator

Test Firestore security rules:
1. Go to Firebase Console → Firestore → Rules
2. Use the Rules Playground to test read/write permissions

### Network Throttling

Test with slow networks:
1. Open DevTools → Network tab
2. Select "Slow 3G" or "Fast 3G" from the throttling dropdown
3. Test saving words and syncing

### Multiple Tabs

Test sync between tabs:
1. Open app in two browser tabs
2. Log in to same account in both
3. Make changes in one tab
4. Verify they appear in the other tab

---

## Questions or Issues?

If you encounter any issues during testing:
1. Check the console logs for error messages
2. Verify Firebase is properly configured
3. Check Firestore security rules
4. Review the fix documentation in `VOCABULARY_SYNC_BUG_FIX.md`
