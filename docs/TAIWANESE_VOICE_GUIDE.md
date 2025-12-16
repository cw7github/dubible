# Traditional Chinese (Taiwan) Voice Selection Guide

## Overview

This guide provides comprehensive recommendations for selecting authentic Traditional Chinese (Taiwan) female voices for scripture narration in the bilingual Bible app. The focus is on Taiwan-style pronunciation (NOT Mainland Mandarin accent), with a soothing, high-quality female voice appropriate for scripture reading.

## Current Configuration Status

### Playback Speed
- **Default playback rate:** 0.85x (updated from 1.0x)
- Location: `/src/hooks/useAudioPlayer.ts` (line 40)
- User can adjust playback rate via UI controls
- Rationale: Slower speed improves comprehension and is more appropriate for scripture meditation

### Voice Configuration
- **Current voice:** Lily (pFZP5JQG7iQjIQuC4Bku) - ElevenLabs
- **Model:** eleven_multilingual_v2
- **Issue:** Current voice may not have authentic Taiwanese pronunciation
- **Action needed:** Replace with Taiwanese-accented female voice

## TTS Provider Recommendations

### OPTION 1: Azure Cognitive Services (Recommended)

Azure provides the most authentic Taiwanese neural voices with excellent quality.

#### Available Taiwanese Female Voices

| Voice Name | Voice ID | Characteristics | Recommended For |
|------------|----------|-----------------|-----------------|
| **HsiaoChen (曉臻)** | `zh-TW-HsiaoChenNeural` | Natural at default speed (1.0x), professional tone | Scripture reading (PRIMARY RECOMMENDATION) |
| **HsiaoYu (曉雨)** | `zh-TW-HsiaoYuNeural` | Sounds better at 1.2x speed, slightly younger tone | Alternative option |

#### Why Azure is Recommended
- Authentic Taiwan pronunciation (zh-TW locale)
- Neural voices specifically trained for Taiwanese Mandarin
- High-quality, natural-sounding speech
- Excellent clarity and expressiveness
- Suitable for extended listening (scripture reading)
- Microsoft's extensive research in Chinese speech synthesis

#### Implementation with Azure

**1. Installation:**
```bash
npm install @azure/cognitiveservices-speech-sdk
```

**2. Basic Usage:**
```typescript
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

const speechConfig = sdk.SpeechConfig.fromSubscription(
  process.env.AZURE_SPEECH_KEY,
  process.env.AZURE_SPEECH_REGION
);

// Primary recommendation
speechConfig.speechSynthesisVoiceName = 'zh-TW-HsiaoChenNeural';

// Alternative
// speechConfig.speechSynthesisVoiceName = 'zh-TW-HsiaoYuNeural';

// For slower reading (if not using 0.85x playback rate)
const ssml = `
  <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-TW">
    <voice name="zh-TW-HsiaoChenNeural">
      <prosody rate="0.9">
        ${text}
      </prosody>
    </voice>
  </speak>
`;
```

**3. Getting Word-Level Timestamps:**
```typescript
const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

synthesizer.wordBoundary = (s, e) => {
  // e.audioOffset - timestamp in ticks (100-nanosecond units)
  // e.text - the word being spoken
  // e.wordLength - length of the word in characters
  console.log(`Word: ${e.text}, Offset: ${e.audioOffset / 10000}ms`);
};

await synthesizer.speakSsmlAsync(ssml);
```

#### Pricing
- Standard: $16 per 1 million characters
- Neural: $16 per 1 million characters
- Full Bible (~780,000 characters): ~$12.48 one-time cost
- More cost-effective than ElevenLabs

### OPTION 2: Google Cloud Text-to-Speech

Google offers WaveNet voices for Traditional Chinese Taiwan.

#### Available Taiwanese Female Voice

| Voice Name | Type | Gender |
|------------|------|--------|
| `cmn-TW-Wavenet-A` | WaveNet | Female |

#### Characteristics
- High-quality WaveNet synthesis (very natural)
- Authentic cmn-TW (Taiwan Mandarin) pronunciation
- Good for extended listening
- Supports SSML for fine-tuning

#### Implementation with Google Cloud

**1. Installation:**
```bash
npm install @google-cloud/text-to-speech
```

**2. Basic Usage:**
```typescript
import textToSpeech from '@google-cloud/text-to-speech';

const client = new textToSpeech.TextToSpeechClient();

const request = {
  input: { text: verseText },
  voice: {
    languageCode: 'cmn-TW',
    name: 'cmn-TW-Wavenet-A',
    ssmlGender: 'FEMALE'
  },
  audioConfig: {
    audioEncoding: 'MP3',
    speakingRate: 0.9, // Slower for scripture reading
    pitch: 0.0,
  },
  enableTimePointing: ['WORD'] // For word-level timestamps
};

const [response] = await client.synthesizeSpeech(request);
// response.audioContent contains the audio
// response.timepoints contains word-level timing data
```

#### Pricing
- WaveNet voices: $16 per 1 million characters
- Full Bible: ~$12.48 one-time cost
- Similar pricing to Azure

### OPTION 3: ElevenLabs (Current Provider)

ElevenLabs provides multilingual voices, but Taiwanese-specific options are limited.

#### Recommended Taiwanese Voices

Based on research, look for these characteristics in ElevenLabs Voice Library:
- **Gender:** Female
- **Language:** Traditional Chinese
- **Accent:** Taiwan / Taiwanese
- **Tone:** Professional, soothing, clear

#### Potential Voice Options
ElevenLabs offers several Taiwanese voices (search Voice Library):
1. **"Yu"** - Vibrant, upbeat voice with youthful Taiwanese accent
2. **"Taiwanese Mandarin Female"** - Adult voice, good for narrative
3. **"Young Woman from Taiwan"** - Gentle and sweet voice

**Important:** The current voice "Lily" (pFZP5JQG7iQjIQuC4Bku) may not have Taiwanese pronunciation. You need to:
1. Visit ElevenLabs Voice Library
2. Filter by "Traditional Chinese" or "Taiwanese"
3. Test female voices for Taiwan accent
4. Update voice ID in `/scripts/generate-audio.ts`

#### Advantages of ElevenLabs
- Already integrated in codebase
- Excellent voice quality and naturalness
- Easy to switch voices
- Character-level timestamp support (already working)
- Voice cloning option for custom voice

#### Disadvantages
- Higher cost ($0.30 per 1,000 characters = ~$234 for full Bible)
- May require manual voice testing to find authentic Taiwan accent
- Limited explicit Taiwan/Taiwanese filtering

## Comparison Summary

| Provider | Cost (Full Bible) | Taiwan Authenticity | Voice Quality | Integration Effort | Timestamp Support |
|----------|-------------------|---------------------|---------------|-------------------|-------------------|
| **Azure** | ~$12.48 | Excellent (native zh-TW) | Excellent | Medium | Word-level |
| **Google Cloud** | ~$12.48 | Excellent (native cmn-TW) | Excellent (WaveNet) | Medium | Word-level |
| **ElevenLabs** | ~$234 | Variable (requires testing) | Excellent | Low (already integrated) | Character-level |

## Final Recommendations

### Priority 1: Azure HsiaoChen (曉臻)
**Why:**
- Most cost-effective for full Bible generation
- Authentic Taiwanese pronunciation (zh-TW-HsiaoChenNeural)
- Specifically designed for Traditional Chinese Taiwan
- Natural at default speed
- Professional tone perfect for scripture
- Word-level timestamps available

**Implementation Path:**
1. Set up Azure Speech Services account
2. Create new script or modify existing generate-audio.ts
3. Use zh-TW-HsiaoChenNeural voice
4. Implement word boundary callbacks for timing data
5. Test with Matthew 1 before full generation

### Priority 2: Google Cloud cmn-TW-Wavenet-A
**Why:**
- Similar cost to Azure (~$12.48)
- WaveNet quality is exceptional
- Authentic Taiwan Mandarin (cmn-TW)
- Good alternative if Azure doesn't meet expectations

### Priority 3: ElevenLabs Taiwanese Voice
**Why:**
- Minimal code changes (already integrated)
- Quick to test and implement
- Higher cost but acceptable if budget allows
- Good for MVP/testing before committing to provider change

**Required Actions:**
1. Browse ElevenLabs Voice Library for Taiwanese female voices
2. Test 2-3 candidate voices with sample scripture
3. Update voiceId in generate-audio.ts
4. Regenerate audio for test chapter

## Implementation Steps

### If Staying with ElevenLabs
1. Visit [ElevenLabs Voice Library](https://elevenlabs.io/voice-library)
2. Filter: Language = Traditional Chinese, Gender = Female
3. Listen to voice samples, prioritize Taiwan/Taiwanese tags
4. Select voice and copy Voice ID
5. Update `/scripts/generate-audio.ts` line 38 with new voice ID
6. Test generation with: `npx tsx scripts/generate-audio.ts --book matthew --chapter 1`
7. Evaluate pronunciation and quality

### If Migrating to Azure (Recommended)
1. Create Azure account and Speech Services resource
2. Get subscription key and region
3. Add to environment variables:
   ```bash
   AZURE_SPEECH_KEY=your_key_here
   AZURE_SPEECH_REGION=your_region_here
   ```
4. Create new script `scripts/generate-audio-azure.ts` (or modify existing)
5. Implement Azure SDK integration with word boundary events
6. Test with Matthew 1
7. Compare quality with ElevenLabs
8. If satisfied, migrate all audio generation to Azure

### If Migrating to Google Cloud
1. Create Google Cloud account and enable Text-to-Speech API
2. Create service account and download credentials JSON
3. Set environment variable: `GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json`
4. Create new script `scripts/generate-audio-google.ts`
5. Implement Google Cloud TTS with timepoint tracking
6. Test and compare quality

## Testing Checklist

Before committing to a voice provider:
- [ ] Authentic Taiwan pronunciation (not Mainland accent)
- [ ] Natural and soothing tone suitable for scripture
- [ ] Clear enunciation of Chinese characters
- [ ] Appropriate pacing (not too fast)
- [ ] Comfortable for extended listening (30+ minutes)
- [ ] Word-level timing accuracy
- [ ] Consistent quality across different passages
- [ ] Proper handling of punctuation and pauses
- [ ] Female voice with professional quality

## Configuration Files Updated

1. **`/src/hooks/useAudioPlayer.ts`**
   - Line 40: Changed default playback rate from 1.0 to 0.85
   - Effect: All audio now plays at 85% speed by default
   - Users can still adjust via playback controls

2. **`/scripts/generate-audio.ts`**
   - Lines 23-37: Added comprehensive voice selection comments
   - Documents all three provider options
   - Marks current voice for replacement
   - Includes specific voice IDs for Azure and Google Cloud

## Next Steps

1. **Decision:** Choose TTS provider based on budget and quality requirements
   - Azure: Best cost/quality ratio for Taiwan voices
   - Google Cloud: Excellent WaveNet quality, similar cost
   - ElevenLabs: Quick implementation, higher cost

2. **Testing:** Generate sample audio with chosen provider
   - Test with Matthew 1 or another chapter
   - Evaluate pronunciation, tone, and naturalness
   - Check timing accuracy

3. **Migration:** If switching providers, create migration script
   - Implement new provider's API
   - Adapt timing extraction to new format
   - Test thoroughly before full generation

4. **Full Generation:** Once satisfied with voice quality
   - Generate audio for priority books (Matthew, John, Genesis, Psalms)
   - Monitor costs and quality
   - Roll out to full Bible if successful

## Resources

- [Azure Speech Service - Language Support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support)
- [Google Cloud TTS - Supported Voices](https://cloud.google.com/text-to-speech/docs/voices)
- [ElevenLabs Voice Library](https://elevenlabs.io/voice-library)
- [Azure Speech SDK Documentation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/)
- [Google Cloud Text-to-Speech Documentation](https://cloud.google.com/text-to-speech/docs)
