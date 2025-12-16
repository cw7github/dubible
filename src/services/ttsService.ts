/**
 * Text-to-Speech Service
 *
 * Provides high-quality Chinese pronunciation with multiple providers:
 *
 * 1. Google Cloud TTS (Primary - Recommended)
 *    - Uses cmn-TW-Wavenet-A voice (Taiwanese Mandarin)
 *    - 1M characters/month free tier (WaveNet voices)
 *    - Requires VITE_GOOGLE_CLOUD_API_KEY
 *
 * 2. Azure TTS (Alternative - Best quality)
 *    - Uses zh-TW-HsiaoChenNeural voice (natural Taiwanese Mandarin)
 *    - 500K characters/month free tier
 *    - Requires VITE_AZURE_SPEECH_KEY and VITE_AZURE_SPEECH_REGION
 *
 * 3. OpenAI TTS (Alternative)
 *    - Multiple voices (alloy, echo, fable, onyx, nova, shimmer)
 *    - High-quality audio output
 *    - Requires VITE_OPENAI_API_KEY
 *
 * 4. Web Speech API (Fallback - Free but lower quality)
 *    - Uses browser's built-in TTS
 *    - Prioritizes zh-TW (Taiwan Mandarin) voices
 *    - No API key required
 *
 * Configuration:
 * Add to .env.local:
 *   VITE_GOOGLE_CLOUD_API_KEY=your_google_api_key
 */

import { auth, isFirebaseConfigured } from '../lib/firebase';

export type VoiceGender = 'male' | 'female';

interface TTSOptions {
  text: string;
  lang?: string;
  voice?: VoiceGender; // Male or female voice (default: male)
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

// Monthly character limit for paid APIs (stay under 1M free tier)
const MONTHLY_CHAR_LIMIT = 999000; // 999K to maximize free usage
const USAGE_STORAGE_KEY = 'tts-usage';

interface UsageData {
  month: string; // "2025-12"
  chars: number;
}

class TTSService {
  private audioCache = new Map<string, string>(); // Cache audio URLs by text
  private currentAudio: HTMLAudioElement | null = null;
  private googleCloudApiKey: string | null = null;
  private openaiApiKey: string | null = null;
  private azureSpeechKey: string | null = null;
  private azureSpeechRegion: string | null = null;
  private voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

  constructor() {
    // Never ship a Google Cloud API key in the production client bundle.
    // In production, Google TTS is accessed via a server-side proxy endpoint (/api/tts/google).
    if (import.meta.env.DEV) {
      this.googleCloudApiKey = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY || null;
    }
    this.openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY || null;
    this.azureSpeechKey = import.meta.env.VITE_AZURE_SPEECH_KEY || null;
    this.azureSpeechRegion = import.meta.env.VITE_AZURE_SPEECH_REGION || null;

    // Initialize voice loading for Web Speech API
    if ('speechSynthesis' in window) {
      this.initializeVoices();
    }
  }

  /**
   * Get current month string (e.g., "2025-12")
   */
  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Get usage data from localStorage
   */
  private getUsageData(): UsageData {
    try {
      const stored = localStorage.getItem(USAGE_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as UsageData;
        // Reset if new month
        if (data.month !== this.getCurrentMonth()) {
          return { month: this.getCurrentMonth(), chars: 0 };
        }
        return data;
      }
    } catch {
      // Ignore parse errors
    }
    return { month: this.getCurrentMonth(), chars: 0 };
  }

  /**
   * Track character usage
   */
  private trackUsage(chars: number): void {
    const usage = this.getUsageData();
    usage.chars += chars;
    localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(usage));
  }

  /**
   * Check if we're within the free tier limit
   */
  private isWithinFreeLimit(): boolean {
    const usage = this.getUsageData();
    return usage.chars < MONTHLY_CHAR_LIMIT;
  }

  /**
   * Get remaining characters for the month
   */
  getRemainingChars(): number {
    const usage = this.getUsageData();
    return Math.max(0, MONTHLY_CHAR_LIMIT - usage.chars);
  }

  /**
   * Initialize and cache available voices
   */
  private initializeVoices(): Promise<SpeechSynthesisVoice[]> {
    if (this.voicesPromise) {
      return this.voicesPromise;
    }

    this.voicesPromise = new Promise((resolve) => {
      // Get voices immediately (might be already loaded)
      let voices = window.speechSynthesis.getVoices();

      if (voices.length > 0) {
        resolve(voices);
        return;
      }

      // Wait for voices to load
      const handleVoicesChanged = () => {
        voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
          resolve(voices);
        }
      };

      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);

      // Fallback timeout in case voices never load
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        resolve(window.speechSynthesis.getVoices());
      }, 3000);
    });

    return this.voicesPromise;
  }

  /**
   * Check if Google Cloud TTS is available
   */
  isGoogleCloudAvailable(): boolean {
    // In production, availability is determined by the server-side proxy configuration.
    // We optimistically report available and fall back gracefully if the proxy errors.
    return import.meta.env.PROD ? true : !!this.googleCloudApiKey;
  }

  /**
   * Check if Azure TTS is available
   */
  isAzureAvailable(): boolean {
    return !!(this.azureSpeechKey && this.azureSpeechRegion);
  }

  /**
   * Check if OpenAI TTS is available
   */
  isOpenAIAvailable(): boolean {
    return !!this.openaiApiKey;
  }

  /**
   * Check if any TTS is available (Google Cloud, Azure, OpenAI, or Web Speech API)
   */
  isAvailable(): boolean {
    return this.isGoogleCloudAvailable() || this.isAzureAvailable() || this.isOpenAIAvailable() || 'speechSynthesis' in window;
  }

  /**
   * Stop any currently playing audio
   */
  stop(): void {
    // Stop OpenAI audio if playing
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    // Stop Web Speech API if playing
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Play text using the best available TTS method
   * Priority: Google Cloud > Azure > OpenAI > Web Speech API
   * Falls back to Web Speech API if monthly limit reached (to avoid charges)
   */
  async speak(options: TTSOptions): Promise<void> {
    const { text, lang = 'zh-TW', voice = 'male', onStart, onEnd, onError } = options;

    // Stop any ongoing speech
    this.stop();

    // Check if we already have this text cached (doesn't count against limit)
    // Include voice in cache key to support male/female variants
    const cacheKeyGoogle = `google:${voice}:${text}`;
    const cacheKeyAzure = `azure:${voice}:${text}`;
    const cacheKeyOpenAI = `openai:${voice}:${text}`;
    const cachedGoogle = this.audioCache.has(cacheKeyGoogle);
    const cachedAzure = this.audioCache.has(cacheKeyAzure);
    const cachedOpenAI = this.audioCache.has(cacheKeyOpenAI);
    const hasCached = cachedGoogle || cachedAzure || cachedOpenAI;

    // In production, paid providers are gated server-side (rate limiting) and keys stay off the client.
    // In development, keep the original "free tier" gating behavior to avoid accidental charges.
    const withinLimit = hasCached || import.meta.env.PROD || this.isWithinFreeLimit();

    let lastError: unknown = null;

    const tryProvider = async (fn: () => Promise<void>): Promise<boolean> => {
      try {
        await fn();
        return true;
      } catch (error) {
        lastError = error;
        return false;
      }
    };

    // 1) Google Cloud TTS (proxy in production, direct in development)
    if (withinLimit || cachedGoogle) {
      const ok = import.meta.env.PROD
        ? await tryProvider(() => this.speakWithGoogleCloudProxy(text, voice, onStart, onEnd, onError))
        : this.isGoogleCloudAvailable()
          ? await tryProvider(() => this.speakWithGoogleCloud(text, voice, onStart, onEnd, onError))
          : false;
      if (ok) return;
    }

    // 2) Azure
    if (this.isAzureAvailable() && (withinLimit || cachedAzure)) {
      if (await tryProvider(() => this.speakWithAzure(text, voice, onStart, onEnd, onError))) return;
    }

    // 3) OpenAI
    if (this.isOpenAIAvailable() && (withinLimit || cachedOpenAI)) {
      if (await tryProvider(() => this.speakWithOpenAI(text, voice, onStart, onEnd, onError))) return;
    }

    // 4) Web Speech API (fallback)
    if (await tryProvider(() => this.speakWithWebSpeech(text, lang, onStart, onEnd, onError))) return;

    // All providers failed
    console.error('TTS error:', lastError);
    if (onError) {
      onError(lastError instanceof Error ? lastError : new Error('TTS failed'));
    }
  }

  /**
   * Speak using Google Cloud TTS API
   * Uses cmn-TW-Wavenet voices - Taiwanese Mandarin WaveNet
   * Male: cmn-TW-Wavenet-B, Female: cmn-TW-Wavenet-A
   */
  private async speakWithGoogleCloud(
    text: string,
    voice: VoiceGender,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      // Check cache first (include voice in key)
      const cacheKey = `google:${voice}:${text}`;
      let audioUrl = this.audioCache.get(cacheKey);

      // Select voice based on gender
      // cmn-TW-Wavenet-A = Female, cmn-TW-Wavenet-B = Male
      const voiceName = voice === 'male' ? 'cmn-TW-Wavenet-B' : 'cmn-TW-Wavenet-A';

      if (!audioUrl) {
        // Track usage BEFORE making the API call
        this.trackUsage(text.length);

        // Google Cloud TTS REST API endpoint
        const endpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.googleCloudApiKey}`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: { text },
            voice: {
              languageCode: 'cmn-TW',
              name: voiceName,
            },
            audioConfig: {
              audioEncoding: 'MP3',
              speakingRate: 0.9, // Slightly slower for clarity
              pitch: 0,
              // Boost male voice volume by ~10% (1.5 dB) to match female level
              volumeGainDb: voice === 'male' ? 1.5 : 0,
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Google Cloud TTS failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();

        // Google returns base64-encoded audio
        const audioContent = data.audioContent;
        const audioBlob = this.base64ToBlob(audioContent, 'audio/mp3');
        audioUrl = URL.createObjectURL(audioBlob);

        // Cache the URL
        this.audioCache.set(cacheKey, audioUrl);
      }

      // Play the audio
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      audio.onplay = () => {
        if (onStart) onStart();
      };

      audio.onended = () => {
        this.currentAudio = null;
        if (onEnd) onEnd();
      };

      audio.onerror = () => {
        this.currentAudio = null;
        const error = new Error('Audio playback failed');
        if (onError) {
          onError(error);
        } else {
          console.error(error);
        }
      };

      await audio.play();
    } catch (error) {
      console.error('Google Cloud TTS error:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Google Cloud TTS failed'));
      }
      throw error;
    }
  }

  /**
   * Speak using Google Cloud TTS via server-side proxy (production).
   * Keeps Google credentials off the client bundle while preserving voice quality.
   */
  private async speakWithGoogleCloudProxy(
    text: string,
    voice: VoiceGender,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      // Check cache first (include voice in key)
      const cacheKey = `google:${voice}:${text}`;
      let audioUrl = this.audioCache.get(cacheKey);

      if (!audioUrl) {
        let idToken: string | null = null;
        if (isFirebaseConfigured) {
          try {
            const user = auth.currentUser;
            if (user) {
              idToken = await user.getIdToken();
            }
          } catch {
            idToken = null;
          }
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (idToken) {
          headers['Authorization'] = `Bearer ${idToken}`;
        }

        const response = await fetch('/api/tts/google', {
          method: 'POST',
          headers,
          body: JSON.stringify({ text, voice }),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          throw new Error(`Google TTS proxy failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const audioBlob = await response.blob();
        audioUrl = URL.createObjectURL(audioBlob);
        this.audioCache.set(cacheKey, audioUrl);
      }

      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      audio.onplay = () => {
        if (onStart) onStart();
      };

      audio.onended = () => {
        this.currentAudio = null;
        if (onEnd) onEnd();
      };

      audio.onerror = () => {
        this.currentAudio = null;
        const error = new Error('Audio playback failed');
        if (onError) {
          onError(error);
        } else {
          console.error(error);
        }
      };

      await audio.play();
    } catch (error) {
      console.error('Google Cloud TTS proxy error:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Google Cloud TTS proxy failed'));
      }
      throw error;
    }
  }

  /**
   * Convert base64 string to Blob
   */
  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  /**
   * Speak using Azure TTS API
   * Uses zh-TW Neural voices - natural Taiwanese Mandarin
   * Male: zh-TW-YunJheNeural, Female: zh-TW-HsiaoChenNeural
   */
  private async speakWithAzure(
    text: string,
    voice: VoiceGender,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      // Check cache first (include voice in key)
      const cacheKey = `azure:${voice}:${text}`;
      let audioUrl = this.audioCache.get(cacheKey);

      // Select voice based on gender
      // zh-TW-HsiaoChenNeural = Female, zh-TW-YunJheNeural = Male
      const voiceName = voice === 'male' ? 'zh-TW-YunJheNeural' : 'zh-TW-HsiaoChenNeural';

      if (!audioUrl) {
        // Azure TTS REST API endpoint
        const endpoint = `https://${this.azureSpeechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;

        // Build SSML for natural speech
        const ssml = `
          <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='zh-TW'>
            <voice name='${voiceName}'>
              <prosody rate='-10%' pitch='+0%'>
                ${this.escapeXml(text)}
              </prosody>
            </voice>
          </speak>
        `.trim();

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': this.azureSpeechKey!,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
            'User-Agent': 'DuBible',
          },
          body: ssml,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Azure TTS failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        // Convert response to blob and create URL
        const audioBlob = await response.blob();
        audioUrl = URL.createObjectURL(audioBlob);

        // Cache the URL
        this.audioCache.set(cacheKey, audioUrl);
      }

      // Play the audio
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      audio.onplay = () => {
        if (onStart) onStart();
      };

      audio.onended = () => {
        this.currentAudio = null;
        if (onEnd) onEnd();
      };

      audio.onerror = () => {
        this.currentAudio = null;
        const error = new Error('Audio playback failed');
        if (onError) {
          onError(error);
        } else {
          console.error(error);
        }
      };

      await audio.play();
    } catch (error) {
      console.error('Azure TTS error:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Azure TTS failed'));
      }
      throw error;
    }
  }

  /**
   * Escape XML special characters for SSML
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Speak using OpenAI TTS API
   * Male: onyx (deep), Female: nova (warm)
   */
  private async speakWithOpenAI(
    text: string,
    voice: VoiceGender,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      // Check cache first (include voice in key)
      const cacheKey = `openai:${voice}:${text}`;
      let audioUrl = this.audioCache.get(cacheKey);

      // Select voice based on gender
      // onyx = male (deep), nova = female (warm)
      const voiceName = voice === 'male' ? 'onyx' : 'nova';

      if (!audioUrl) {
        // Fetch audio from OpenAI
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1', // Use tts-1 for lower latency (tts-1-hd for higher quality)
            input: text,
            voice: voiceName,
            speed: 0.9, // Slightly slower for clarity
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI TTS failed: ${response.status} ${response.statusText}`);
        }

        // Convert response to blob and create URL
        const audioBlob = await response.blob();
        audioUrl = URL.createObjectURL(audioBlob);

        // Cache the URL
        this.audioCache.set(cacheKey, audioUrl);
      }

      // Play the audio
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      audio.onplay = () => {
        if (onStart) onStart();
      };

      audio.onended = () => {
        this.currentAudio = null;
        if (onEnd) onEnd();
      };

      audio.onerror = () => {
        this.currentAudio = null;
        const error = new Error('Audio playback failed');
        if (onError) {
          onError(error);
        } else {
          console.error(error);
        }
      };

      await audio.play();
    } catch (error) {
      console.error('OpenAI TTS error:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('OpenAI TTS failed'));
      }
      // Don't fallback automatically - let the caller handle it
      throw error;
    }
  }

  /**
   * Get the best Chinese voice for Traditional Chinese
   */
  private async getBestChineseVoice(): Promise<SpeechSynthesisVoice | null> {
    const voices = await this.initializeVoices();

    if (voices.length === 0) {
      console.warn('No voices available');
      return null;
    }

    // Log available Chinese voices for debugging
    const chineseVoices = voices.filter(v => v.lang.startsWith('zh'));
    console.log('[TTS] Available Chinese voices:', chineseVoices.map(v => ({
      name: v.name,
      lang: v.lang,
      localService: v.localService
    })));

    // Priority order for Traditional Chinese:
    // 1. zh-TW (Taiwan Mandarin) - best for Traditional Chinese
    // 2. zh-HK (Hong Kong Cantonese/Mandarin) - also uses Traditional
    // 3. zh-CN (Mainland Mandarin) - fallback, uses Simplified but works
    // 4. Any other zh-* voice
    const voice =
      // First try Taiwan voices (best for Traditional Chinese)
      voices.find(v => v.lang === 'zh-TW') ||
      voices.find(v => v.lang.startsWith('zh-TW')) ||
      // Then Hong Kong voices
      voices.find(v => v.lang === 'zh-HK') ||
      voices.find(v => v.lang.startsWith('zh-HK')) ||
      // Then any Taiwan or Hong Kong variant
      voices.find(v => v.lang.includes('TW')) ||
      voices.find(v => v.lang.includes('HK')) ||
      // Fallback to Mainland Chinese
      voices.find(v => v.lang === 'zh-CN') ||
      voices.find(v => v.lang.startsWith('zh-CN')) ||
      // Last resort: any Chinese voice
      voices.find(v => v.lang.startsWith('zh'));

    if (voice) {
      console.log('[TTS] Selected voice:', {
        name: voice.name,
        lang: voice.lang,
        localService: voice.localService
      });
    } else {
      console.warn('[TTS] No Chinese voice found, will use default');
    }

    return voice || null;
  }

  /**
   * Speak using Web Speech API (fallback)
   */
  private async speakWithWebSpeech(
    text: string,
    lang: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    if (!window.speechSynthesis) {
      throw new Error('Web Speech API not available');
    }

    try {
      // Wait for voices to load and select the best one
      const chineseVoice = await this.getBestChineseVoice();

      const utterance = new SpeechSynthesisUtterance(text);

      // Set the voice if we found a Chinese one
      if (chineseVoice) {
        utterance.voice = chineseVoice;
        // Use the voice's language (zh-TW, zh-CN, etc.)
        utterance.lang = chineseVoice.lang;
      } else {
        // Fallback to zh-TW for Traditional Chinese
        utterance.lang = lang === 'zh-CN' ? 'zh-TW' : lang;
      }

      // Speech parameters optimized for clarity
      utterance.rate = 0.85; // Slightly slower for clarity
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        console.log('[TTS] Speech started:', text);
        if (onStart) onStart();
      };

      utterance.onend = () => {
        console.log('[TTS] Speech ended');
        if (onEnd) onEnd();
      };

      utterance.onerror = (event) => {
        console.error('[TTS] Speech error:', event.error);
        const error = new Error(`Speech synthesis error: ${event.error}`);
        if (onError) {
          onError(error);
        } else {
          console.error(error);
        }
      };

      // Cancel any ongoing speech before starting new one
      window.speechSynthesis.cancel();

      // Small delay to ensure cancel completes
      await new Promise(resolve => setTimeout(resolve, 50));

      // Start speaking
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('[TTS] Failed to speak:', error);
      throw error;
    }
  }

  /**
   * Clean up cached audio URLs
   */
  clearCache(): void {
    // Revoke all cached URLs to free memory
    for (const url of this.audioCache.values()) {
      URL.revokeObjectURL(url);
    }
    this.audioCache.clear();
  }

  /**
   * Get information about the current TTS provider
   */
  getProviderInfo(): { provider: 'google' | 'azure' | 'openai' | 'webspeech' | 'none'; quality: 'high' | 'medium' | 'low' | 'none' } {
    if (this.isGoogleCloudAvailable()) {
      return { provider: 'google', quality: 'high' };
    } else if (this.isAzureAvailable()) {
      return { provider: 'azure', quality: 'high' };
    } else if (this.isOpenAIAvailable()) {
      return { provider: 'openai', quality: 'medium' };
    } else if ('speechSynthesis' in window) {
      return { provider: 'webspeech', quality: 'low' };
    } else {
      return { provider: 'none', quality: 'none' };
    }
  }

  /**
   * Get available Chinese voices (for debugging)
   */
  async getAvailableChineseVoices(): Promise<Array<{ name: string; lang: string; localService: boolean }>> {
    const voices = await this.initializeVoices();
    return voices
      .filter(v => v.lang.startsWith('zh'))
      .map(v => ({
        name: v.name,
        lang: v.lang,
        localService: v.localService
      }));
  }
}

// Export singleton instance
export const ttsService = new TTSService();
