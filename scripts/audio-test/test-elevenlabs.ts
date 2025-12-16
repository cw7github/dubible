/**
 * Test ElevenLabs API with Chinese text and timestamps
 *
 * Tests:
 * 1. Generate audio for a Chinese verse
 * 2. Get character-level timestamps
 * 3. Map timestamps to word boundaries
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.ELEVENLABS_API_KEY || '';
const VOICE_ID = 'pFZP5JQG7iQjIQuC4Bku'; // Lily - British, professional (works well with multilingual)
const MODEL_ID = 'eleven_multilingual_v2';

// Sample verse from Matthew 1:1 (already preprocessed)
const SAMPLE_VERSE = {
  number: 1,
  text: '亞伯拉罕的後裔，大衛的子孫，耶穌基督的家譜：',
  words: [
    { chinese: '亞伯拉罕', pinyin: 'Yàbólāhǎn', definition: 'Abraham' },
    { chinese: '的', pinyin: 'de', definition: 'of' },
    { chinese: '後裔', pinyin: 'hòuyì', definition: 'descendant' },
    { chinese: '，', pinyin: '', definition: '' },
    { chinese: '大衛', pinyin: 'Dàwèi', definition: 'David' },
    { chinese: '的', pinyin: 'de', definition: 'of' },
    { chinese: '子孫', pinyin: 'zǐsūn', definition: 'offspring' },
    { chinese: '，', pinyin: '', definition: '' },
    { chinese: '耶穌', pinyin: 'Yēsū', definition: 'Jesus' },
    { chinese: '基督', pinyin: 'Jīdū', definition: 'Christ' },
    { chinese: '的', pinyin: 'de', definition: 'of' },
    { chinese: '家譜', pinyin: 'jiāpǔ', definition: 'genealogy' },
    { chinese: '：', pinyin: '', definition: '' },
  ]
};

interface ElevenLabsResponse {
  audio_base64: string;
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
}

interface WordTiming {
  wordIndex: number;
  word: string;
  startTime: number;
  endTime: number;
}

async function generateAudioWithTimestamps(text: string): Promise<ElevenLabsResponse> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/with-timestamps`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  return response.json();
}

function mapCharacterTimingsToWords(
  alignment: ElevenLabsResponse['alignment'],
  words: typeof SAMPLE_VERSE.words
): WordTiming[] {
  const wordTimings: WordTiming[] = [];
  let charIndex = 0;

  for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
    const word = words[wordIndex];
    const wordChars = word.chinese.split('');

    // Skip punctuation (no timing needed)
    if (!word.pinyin) {
      charIndex += wordChars.length;
      continue;
    }

    // Find start time of first character
    const startCharIndex = charIndex;
    const endCharIndex = charIndex + wordChars.length - 1;

    // Get timing from alignment data
    const startTime = alignment.character_start_times_seconds[startCharIndex] ?? 0;
    const endTime = alignment.character_end_times_seconds[endCharIndex] ?? startTime + 0.5;

    wordTimings.push({
      wordIndex,
      word: word.chinese,
      startTime,
      endTime,
    });

    charIndex += wordChars.length;
  }

  return wordTimings;
}

async function main() {
  console.log('Testing ElevenLabs API with Chinese text...\n');
  console.log('Sample text:', SAMPLE_VERSE.text);
  console.log('Words:', SAMPLE_VERSE.words.map(w => w.chinese).join(' | '));
  console.log('\n---\n');

  try {
    // Generate audio with timestamps
    console.log('Generating audio...');
    const result = await generateAudioWithTimestamps(SAMPLE_VERSE.text);

    // Save audio file
    const audioBuffer = Buffer.from(result.audio_base64, 'base64');
    const audioPath = path.join(__dirname, 'sample-verse.mp3');
    fs.writeFileSync(audioPath, audioBuffer);
    console.log(`Audio saved to: ${audioPath}`);
    console.log(`Audio size: ${(audioBuffer.length / 1024).toFixed(2)} KB`);

    // Show alignment data
    console.log('\n--- Character Alignment ---');
    console.log('Characters:', result.alignment.characters.length);

    // Show first 10 character timings
    console.log('\nFirst 10 character timings:');
    for (let i = 0; i < Math.min(10, result.alignment.characters.length); i++) {
      const char = result.alignment.characters[i];
      const start = result.alignment.character_start_times_seconds[i];
      const end = result.alignment.character_end_times_seconds[i];
      console.log(`  ${i}: "${char}" - ${start.toFixed(3)}s to ${end.toFixed(3)}s`);
    }

    // Map to word timings
    console.log('\n--- Word Timings ---');
    const wordTimings = mapCharacterTimingsToWords(result.alignment, SAMPLE_VERSE.words);

    for (const timing of wordTimings) {
      const word = SAMPLE_VERSE.words[timing.wordIndex];
      console.log(`  ${timing.word} (${word.pinyin}): ${timing.startTime.toFixed(3)}s - ${timing.endTime.toFixed(3)}s`);
    }

    // Save full timing data
    const timingData = {
      verse: SAMPLE_VERSE,
      alignment: result.alignment,
      wordTimings,
      audioFile: 'sample-verse.mp3',
    };

    const timingPath = path.join(__dirname, 'sample-timing.json');
    fs.writeFileSync(timingPath, JSON.stringify(timingData, null, 2));
    console.log(`\nTiming data saved to: ${timingPath}`);

    console.log('\n✅ Test complete!');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
