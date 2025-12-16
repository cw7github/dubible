# Chinese Text-to-Speech Setup Guide

This app now supports high-quality Chinese pronunciation using OpenAI's Text-to-Speech API.

## Features

- **High-Quality Chinese Voice**: Uses OpenAI's "nova" voice for natural-sounding pronunciation
- **Automatic Fallback**: Falls back to browser's built-in speech synthesis if no API key is configured
- **Audio Caching**: Caches generated audio to reduce API calls and improve performance
- **Seamless Integration**: Works automatically in the word definition popup

## Setup Instructions

### Option 1: Use OpenAI TTS (Recommended for Best Quality)

1. **Get an OpenAI API Key**
   - Go to [OpenAI Platform](https://platform.openai.com/api-keys)
   - Sign in or create an account
   - Click "Create new secret key"
   - Copy the API key (it will only be shown once)

2. **Add API Key to Environment**
   - Copy `.env.local.example` to `.env.local`
   - Add your OpenAI API key:
     ```
     VITE_OPENAI_API_KEY=sk-your-actual-api-key-here
     ```

3. **Restart Development Server**
   ```bash
   npm run dev
   ```

### Option 2: Use Browser's Speech Synthesis (Free, Lower Quality)

If you don't configure an OpenAI API key, the app will automatically use the browser's built-in text-to-speech. This works offline but has lower voice quality.

No setup required - it just works!

## Voice Quality Comparison

### OpenAI TTS (with API key)
- ✅ Natural, human-like pronunciation
- ✅ Accurate tones and rhythm
- ✅ Consistent quality across all browsers
- ✅ Professional voice actor quality
- ❌ Requires internet connection
- ❌ Small API cost (very affordable: ~$0.015 per 1000 characters)

### Browser Speech Synthesis (fallback)
- ✅ Free
- ✅ Works offline (after initial page load)
- ❌ Robotic voice quality
- ❌ Varies by browser and OS
- ❌ Sometimes inaccurate tones

## Cost Estimate (OpenAI TTS)

OpenAI TTS pricing: **$15.00 per 1 million characters** (model: tts-1)

Examples:
- 1 Chinese character ≈ $0.000015
- 100 words ≈ $0.0015 (less than 1 cent)
- 1000 words ≈ $0.015 (1.5 cents)

**Typical usage**: If you pronounce 100 words per day, that's ~$0.05 per month (5 cents).

## Technical Details

The TTS service (`src/services/ttsService.ts`) automatically:
1. Checks if OpenAI API key is configured
2. Uses OpenAI TTS if available, with audio caching
3. Falls back to Web Speech API if no key is configured
4. Handles errors gracefully
5. Cleans up audio resources properly

## Voice Selection

The service uses OpenAI's **"nova"** voice, which:
- Works well with Chinese language
- Has a warm, pleasant tone
- Sounds natural and clear

Other available OpenAI voices (you can modify in `ttsService.ts`):
- `alloy` - Neutral, balanced
- `echo` - Clear, direct
- `fable` - Expressive
- `onyx` - Deep, authoritative
- `nova` - Warm, pleasant (current choice)
- `shimmer` - Soft, gentle

## Troubleshooting

**Audio doesn't play:**
- Check browser console for errors
- Verify API key is correctly set in `.env.local`
- Make sure you restarted the dev server after adding the key
- Check your OpenAI account has available credits

**Audio quality is poor:**
- If using OpenAI TTS, check that the API key is valid
- If you want higher quality, change model from `tts-1` to `tts-1-hd` in `ttsService.ts` (costs 2x more)

**Fallback to browser speech:**
- This is normal if no API key is configured
- Different browsers have different voice quality
- Chrome and Edge generally have better Chinese voices than Firefox or Safari

## Alternative TTS Options (Not Implemented)

If you prefer not to use OpenAI, here are other high-quality Chinese TTS options:

1. **Microsoft Azure Cognitive Services**
   - Excellent Chinese voices (Xiaoxiao, Yunyang, etc.)
   - Pay-as-you-go pricing
   - https://azure.microsoft.com/en-us/services/cognitive-services/text-to-speech/

2. **Google Cloud Text-to-Speech**
   - Good Chinese voice quality
   - Neural voices available
   - https://cloud.google.com/text-to-speech

3. **ElevenLabs**
   - Premium voice quality
   - Supports Chinese (limited)
   - More expensive
   - https://elevenlabs.io/

To implement these, you would need to modify `src/services/ttsService.ts` to call their respective APIs.
