# Audio Playback Fixes - Definition Popup TTS

## Issues Fixed

### 1. Truncation Issue (Only First Word Playing)
**Root Cause:** The Web Speech API's `getVoices()` returns an empty array before voices are loaded. The code was calling `getVoices()` synchronously without waiting for the `voiceschanged` event, resulting in no Chinese voice being selected. When no voice is selected, the default system voice attempts to speak Chinese but may truncate or fail.

**Fix Applied:**
- Added `initializeVoices()` method that properly waits for the `voiceschanged` event
- Made voice selection async to ensure voices are loaded before speaking
- Added a promise-based caching mechanism to avoid waiting multiple times
- Added a 50ms delay after `cancel()` to ensure previous speech is cleared

### 2. Robotic Sound
**Root Cause:** The code was using `lang: 'zh-CN'` (Simplified Chinese, Mainland) for Traditional Chinese text. While the text itself was in Traditional characters, the TTS engine was being told to use Mainland pronunciation, which:
- May sound unnatural for Traditional Chinese
- May use a lower-quality voice if better zh-TW voices are available

**Fix Applied:**
- Changed default language from `zh-CN` to `zh-TW` (Taiwan Mandarin)
- Implemented smart voice selection with priority order:
  1. `zh-TW` (Taiwan Mandarin) - best for Traditional Chinese
  2. `zh-HK` (Hong Kong) - also uses Traditional characters
  3. `zh-CN` (Mainland) - fallback, works but not ideal
  4. Any other `zh-*` voice
- Voice selection now uses the voice's native language code instead of forcing a different one

### 3. Better Error Handling
**Added:**
- Detailed console logging for debugging (can be removed in production)
- Proper error callbacks with specific error messages
- Voice availability checking with fallback
- Debug utility functions for testing

## Files Modified

1. **`src/services/ttsService.ts`**
   - Added `voicesLoaded` flag and `voicesPromise` cache
   - Added `initializeVoices()` method with proper async voice loading
   - Added `getBestChineseVoice()` method with smart voice selection
   - Made `speakWithWebSpeech()` async to properly wait for voices
   - Changed default lang from `zh-CN` to `zh-TW`
   - Added debug method `getAvailableChineseVoices()`

2. **`src/components/reading/WordDetailPanel.tsx`**
   - Changed TTS language from `zh-CN` to `zh-TW`
   - Improved error logging

3. **`src/utils/ttsDebug.ts`** (NEW)
   - Debug utilities for testing TTS in the browser console

## Testing the Fix

### Method 1: In the App
1. Open the app in your browser
2. Navigate to any Bible chapter
3. Tap on a Chinese word to open the definition popup
4. Click the speaker icon to play audio
5. The full word should now play (not truncated)
6. The pronunciation should sound more natural

### Method 2: Browser Console Debug
1. Open the browser console (F12)
2. Import the debug utility:
   ```javascript
   import('/src/utils/ttsDebug.ts').then(m => m.debugTTS())
   ```
3. This will show:
   - Current TTS provider (OpenAI or WebSpeech)
   - Available Chinese voices
   - Test words ready to try
4. Test a word:
   ```javascript
   testWord("神")    // God
   testWord("耶穌")  // Jesus
   testWord("聖經")  // Bible
   ```

### Method 3: List All Voices
To see all available voices on your system:
```javascript
import('/src/utils/ttsDebug.ts').then(m => m.listAllVoices())
```

## Expected Behavior

### Before Fix:
- 🔴 Only first character would play: "神" from "聖經"
- 🔴 Sound was robotic/unnatural
- 🔴 No error messages when it failed

### After Fix:
- ✅ Full word plays: "聖經" (both characters)
- ✅ More natural zh-TW voice used (if available)
- ✅ Console shows which voice was selected
- ✅ Detailed error logging if something goes wrong

## Browser Compatibility

### Voices Available By Platform:

**macOS:**
- Meijia (zh-TW) - Excellent for Traditional Chinese ✅
- Tingting (zh-CN) - Good for Simplified Chinese
- Sinji (zh-HK) - Good for Cantonese/Traditional

**Windows:**
- Chinese (Taiwan) voices if language pack installed
- Chinese (China) voices if language pack installed

**Chrome/Edge:**
- Uses OS voices
- Can also use Google's cloud voices (better quality)

**Safari:**
- Uses macOS voices (typically high quality)

**iOS:**
- Meijia (zh-TW) available
- Tingting (zh-CN) available

**Android:**
- Depends on installed language packs
- May need to download Chinese TTS data

## Installation of Chinese Voices

If no Chinese voices are available:

### macOS:
1. System Preferences → Accessibility → Spoken Content
2. Click "System Voice" → Customize...
3. Download "Chinese (Taiwan) - Meijia" (recommended for this app)
4. Also consider: Tingting (CN), Sinji (HK)

### Windows:
1. Settings → Time & Language → Language
2. Add "Chinese (Traditional, Taiwan)"
3. Click Options → Download speech pack
4. Restart browser

### iOS:
1. Settings → Accessibility → Spoken Content → Voices
2. Select Chinese → Download Taiwan voices

### Android:
1. Settings → Accessibility → Text-to-speech
2. Install Chinese TTS engine (e.g., Google TTS)
3. Download Chinese voice data

## Future Improvements

1. **Add OpenAI TTS**: Set `VITE_OPENAI_API_KEY` in `.env.local` for much better quality
2. **User Voice Preference**: Allow users to select their preferred Chinese voice
3. **Offline Audio**: Pre-generate audio files for common words
4. **Rate/Pitch Controls**: Let users adjust speech speed and pitch
5. **Fallback Chain**: OpenAI → Azure TTS → Web Speech API

## Technical Details

### Voice Selection Algorithm:
```typescript
// Priority chain for Traditional Chinese:
zh-TW (exact match)
→ zh-TW-* (regional variant)
→ zh-HK (Hong Kong, uses Traditional)
→ *TW* or *HK* (contains Taiwan/HK)
→ zh-CN (Simplified fallback)
→ zh-CN-* (regional variant)
→ zh* (any Chinese)
→ null (use system default)
```

### Why 50ms Delay?
The `speechSynthesis.cancel()` method is asynchronous but doesn't return a promise. Without a small delay, the next `speak()` call might start before the previous one fully cancels, causing audio issues.

### Why Cache Voices?
Loading voices can take 100-1000ms on first page load. By caching the promise, we ensure:
1. Only wait once per page load
2. Multiple simultaneous TTS calls don't duplicate voice loading
3. Subsequent calls are instant

## Debugging

If audio still doesn't work:

1. **Check Console Logs:**
   - Look for `[TTS] Available Chinese voices:`
   - Look for `[TTS] Selected voice:`
   - Look for `[TTS] Speech started:` and `[TTS] Speech ended`

2. **Common Issues:**
   - No Chinese voices available → Install language pack
   - "interrupted" error → User clicked too fast, this is normal
   - "not-allowed" error → Page needs user interaction first
   - "audio-hardware-error" → Check system audio settings

3. **Test with Debug Utility:**
   ```javascript
   // In console:
   import('/src/utils/ttsDebug.ts').then(m => {
     m.listAllVoices(); // See what's available
     m.debugTTS();      // Get test functions
   });
   ```

## Notes

- The fixes prioritize reliability over speed (50ms delay is acceptable)
- Logging is verbose for debugging and can be reduced in production
- OpenAI TTS bypasses all these issues but requires an API key
- Web Speech API quality varies significantly by platform and voice
