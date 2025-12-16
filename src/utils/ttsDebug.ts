/**
 * TTS Debug Utilities
 *
 * Utility functions for debugging and testing TTS functionality
 * Use in the browser console: import('/src/utils/ttsDebug.ts').then(m => m.debugTTS())
 */

import { ttsService } from '../services/ttsService';

/**
 * Test TTS with various Chinese words
 */
export async function debugTTS() {
  console.log('=== TTS Debug Info ===');

  const info = ttsService.getProviderInfo();
  console.log('Provider:', info.provider);
  console.log('Quality:', info.quality);

  if (info.provider === 'webspeech' || info.provider === 'none') {
    console.log('\n=== Available Chinese Voices ===');
    const voices = await ttsService.getAvailableChineseVoices();
    voices.forEach((voice, idx) => {
      console.log(`${idx + 1}. ${voice.name}`);
      console.log(`   Language: ${voice.lang}`);
      console.log(`   Local: ${voice.localService ? 'Yes' : 'No'}`);
    });

    if (voices.length === 0) {
      console.warn('No Chinese voices found!');
      console.log('Tip: Install Chinese language support in your OS settings');
    }
  }

  console.log('\n=== Test Words ===');
  const testWords = [
    '神',      // Single character: God
    '耶穌',    // Two characters: Jesus
    '愛',      // Single character: Love
    '聖經',    // Two characters: Bible
    '天國',    // Two characters: Kingdom of Heaven
  ];

  console.log('Test words ready:', testWords.join(', '));
  console.log('Call testWord("word") to test a specific word');

  // Make testWord available globally
  (window as any).testWord = async (word: string) => {
    console.log(`\nTesting: "${word}"`);
    try {
      await ttsService.speak({
        text: word,
        lang: 'zh-TW',
        onStart: () => console.log('▶ Started'),
        onEnd: () => console.log('■ Ended'),
        onError: (err) => console.error('✗ Error:', err.message),
      });
    } catch (error) {
      console.error('Failed:', error);
    }
  };

  console.log('\nUsage: testWord("神")');

  return {
    info,
    testWords,
    testWord: (window as any).testWord,
  };
}

/**
 * List all available voices (not just Chinese)
 */
export async function listAllVoices() {
  if (!window.speechSynthesis) {
    console.error('Speech Synthesis not available');
    return [];
  }

  // Wait for voices to load
  const voices = await new Promise<SpeechSynthesisVoice[]>((resolve) => {
    let loadedVoices = window.speechSynthesis.getVoices();

    if (loadedVoices.length > 0) {
      resolve(loadedVoices);
      return;
    }

    const handler = () => {
      loadedVoices = window.speechSynthesis.getVoices();
      if (loadedVoices.length > 0) {
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        resolve(loadedVoices);
      }
    };

    window.speechSynthesis.addEventListener('voiceschanged', handler);

    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(window.speechSynthesis.getVoices());
    }, 3000);
  });

  console.log(`Found ${voices.length} voices:`);
  voices.forEach((voice, idx) => {
    const prefix = voice.lang.startsWith('zh') ? '🇨🇳' : '  ';
    console.log(`${prefix} ${idx + 1}. [${voice.lang}] ${voice.name} ${voice.localService ? '(local)' : '(remote)'}`);
  });

  return voices;
}
