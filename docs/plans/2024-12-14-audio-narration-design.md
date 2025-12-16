# Audio Narration System Design

## Overview

Word-synchronized audio narration for the Chinese Bible, enabling users to:
- Listen to any chapter with word-by-word highlighting
- Start playback from any tapped word
- Follow along with visual highlighting during playback
- Improve listening comprehension and pronunciation

## Technical Approach

### API: ElevenLabs

Using ElevenLabs' `/v1/text-to-speech/{voice_id}/with-timestamps` endpoint which returns:
- Base64-encoded audio (MP3)
- Character-level alignment data with precise timestamps

**Validated in prototype:**
- Chinese text works correctly with `eleven_multilingual_v2` model
- Character timestamps can be mapped to our word segmentation
- Audio quality is high and pronunciation is accurate

### Voice Selection

Single consistent voice for the entire Bible:
- **Voice ID:** `pFZP5JQG7iQjIQuC4Bku` (Lily - professional, clear)
- **Model:** `eleven_multilingual_v2`
- Can be changed later via settings if needed

### Data Structure

```typescript
// Audio timing data stored alongside chapter JSON
interface ChapterAudio {
  bookId: string;
  chapter: number;
  audioUrl: string;        // Path to audio file
  duration: number;        // Total duration in seconds
  voiceId: string;
  modelId: string;
  generatedAt: string;
  verses: VerseAudioTiming[];
}

interface VerseAudioTiming {
  verseNumber: number;
  startTime: number;       // When this verse starts
  endTime: number;         // When this verse ends
  words: WordTiming[];
}

interface WordTiming {
  wordIndex: number;       // Index in verse.words array
  startTime: number;       // When word starts speaking
  endTime: number;         // When word ends
}
```

### File Organization

```
public/
  audio/
    matthew/
      chapter-1.mp3
      chapter-1-timing.json
      chapter-2.mp3
      chapter-2-timing.json
    mark/
      ...
```

## User Experience

### Playback Controls

1. **Play button** in chapter header - starts from beginning
2. **Tap any word** while audio playing - seeks to that word
3. **Long-press any word** - starts playback from that word (alternative entry)
4. **Mini player** at bottom when audio active:
   - Play/Pause button
   - Progress bar (seekable)
   - Current verse indicator
   - Playback speed (0.5x, 0.75x, 1x, 1.25x, 1.5x)
   - Close button

### Visual Highlighting

During playback:
- Current verse gets subtle background highlight
- Current word gets prominent highlight (using existing `.word-highlight` CSS)
- Auto-scroll keeps current verse in view

### Focus Mode Enhancement

Existing focus mode dims non-active verses. Audio playback should:
- Automatically enable focus mode while playing
- Sync verse highlighting with audio
- Disable focus mode when playback stops/pauses

## Implementation Phases

### Phase 1: Audio Generation Script

Create `scripts/generate-audio.ts`:
- Accept `--book` and `--chapter` arguments
- Load preprocessed chapter JSON
- Concatenate verse text for full chapter audio
- Call ElevenLabs API
- Parse alignment data and map to word indices
- Save MP3 and timing JSON

### Phase 2: AudioPlayer Component

Create `src/components/reading/AudioPlayer.tsx`:
- Audio element with HTML5 Audio API
- State: playing, currentTime, duration, playbackRate
- Sync with word highlighting via `timeupdate` event
- Expose methods: play, pause, seekTo(time), seekToWord(verseNum, wordIndex)

### Phase 3: Integration

Update `ReadingView.tsx`:
- Add AudioPlayer component
- Connect word tap to seekToWord
- Pass current word info for highlighting
- Add playback controls to header

### Phase 4: Mini Player UI

Create floating mini player:
- Appears when audio is playing
- Sticky at bottom of screen
- Play/pause, progress, speed controls
- Chapter info

## Cost Estimation

ElevenLabs pricing: ~$0.30 per 1,000 characters (Starter plan)

Bible character count (estimated):
- NT: ~180,000 characters
- OT: ~600,000 characters
- Total: ~780,000 characters

**Estimated cost: ~$235** for full Bible audio generation (one-time)

## Storage Estimation

Based on prototype (62KB for ~22 characters, ~3.6 seconds):
- ~17KB per second of audio
- Average chapter: ~30 verses × 25 chars = 750 chars
- Average audio duration: ~2 minutes per chapter
- Average file size: ~2MB per chapter
- 1,189 chapters × 2MB = **~2.4GB total**

### Storage Strategy

1. **Generate on-demand** initially - no upfront storage cost
2. **Cache in IndexedDB** - downloaded chapters persist offline
3. **Pre-generate popular books** - Matthew, John, Psalms, Genesis
4. **Full Bible generation** - optional for premium/download feature

## API Keys & Security

- ElevenLabs API key should NOT be in frontend
- Options:
  1. Pre-generate all audio at build time (recommended for MVP)
  2. Serverless function to proxy requests (for on-demand)
  3. Edge function with rate limiting

For MVP: Pre-generate Matthew 1-7 as proof of concept.

## React Component API

```typescript
// AudioPlayer props
interface AudioPlayerProps {
  bookId: string;
  chapter: number;
  onWordChange?: (verseNumber: number, wordIndex: number) => void;
  onVerseChange?: (verseNumber: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  autoScroll?: boolean;
}

// Usage in ReadingView
<AudioPlayer
  bookId={bookId}
  chapter={currentChapter}
  onWordChange={(verse, word) => setHighlightedWord({ verse, word })}
  onVerseChange={(verse) => scrollToVerse(verse)}
  autoScroll={true}
/>
```

## Timeline

1. **Audio generation script** - Creates MP3 + timing JSON
2. **AudioPlayer component** - Handles playback and sync
3. **UI integration** - Controls and highlighting
4. **Mini player** - Floating controls
5. **Testing** - Cross-browser, mobile, offline

## Open Questions

1. Should we support English audio as well? (separate voice, doubled storage)
2. Download chapters for offline listening?
3. Background playback on mobile?

## Next Steps

1. Generate audio for Matthew 1 (full chapter)
2. Build basic AudioPlayer component
3. Test word highlighting sync
4. Iterate on UX
