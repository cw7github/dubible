/**
 * Audio Mixer Service
 *
 * Manages layered audio playback with two tracks:
 * - Narration (primary): Main audio narration
 * - Music (secondary): Ambient background music
 *
 * Features:
 * - Automatic volume balancing (music at 15-20% of narration)
 * - Synchronized playback (music follows narration play/pause)
 * - Music looping for longer narrations
 * - Smooth fade in/out (1 second)
 * - Web Audio API for precise control
 */

interface AudioMixerConfig {
  narrationVolume?: number;  // 0-1, default 1
  musicVolume?: number;      // 0-1, default 0.18 (18% of narration)
  fadeTime?: number;         // Fade duration in seconds, default 1
  musicEnabled?: boolean;    // Enable/disable music, default true
}

type AudioMixerState = 'idle' | 'loading' | 'ready' | 'playing' | 'paused';

export class AudioMixer {
  // Audio context and nodes
  private audioContext: AudioContext | null = null;
  private narrationSource: MediaElementAudioSourceNode | null = null;
  private musicSource: MediaElementAudioSourceNode | null = null;
  private narrationGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  // Audio elements
  private narrationElement: HTMLAudioElement | null = null;
  private musicElement: HTMLAudioElement | null = null;

  // Configuration
  private config: Required<AudioMixerConfig> = {
    narrationVolume: 1.0,
    musicVolume: 0.30,  // Increased from 0.18 for better audibility
    fadeTime: 1.0,
    musicEnabled: true,
  };

  // State
  private state: AudioMixerState = 'idle';
  private narrationReady = false;
  private fadeTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(config?: AudioMixerConfig) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.initializeAudioContext();
  }

  /**
   * Initialize the Web Audio API context and gain nodes
   */
  private initializeAudioContext(): void {
    if (this.audioContext) return;

    // Create audio context (Safari requires webkitAudioContext)
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass();

    // Create gain nodes for volume control
    this.narrationGain = this.audioContext.createGain();
    this.musicGain = this.audioContext.createGain();

    // Set initial volumes
    this.narrationGain.gain.value = this.config.narrationVolume;
    this.musicGain.gain.value = this.config.musicEnabled ? this.config.musicVolume : 0;

    // Connect to destination (speakers)
    this.narrationGain.connect(this.audioContext.destination);
    this.musicGain.connect(this.audioContext.destination);

    console.log('[AudioMixer] Initialized Web Audio API context');
  }

  /**
   * Set the narration audio source
   */
  public async setNarrationSrc(src: string): Promise<void> {
    if (!this.audioContext || !this.narrationGain) {
      throw new Error('AudioContext not initialized');
    }

    this.state = 'loading';
    this.narrationReady = false;

    // Clean up existing narration
    if (this.narrationElement) {
      this.narrationElement.pause();
      this.narrationElement.src = '';
    }

    // Create new audio element
    this.narrationElement = new Audio(src);
    this.narrationElement.loop = false;
    this.narrationElement.preload = 'auto';

    // Connect to audio context
    if (this.narrationSource) {
      this.narrationSource.disconnect();
    }
    this.narrationSource = this.audioContext.createMediaElementSource(this.narrationElement);
    this.narrationSource.connect(this.narrationGain);

    // Wait for audio to be ready
    await new Promise<void>((resolve, reject) => {
      if (!this.narrationElement) {
        reject(new Error('Narration element lost'));
        return;
      }

      this.narrationElement.onloadedmetadata = () => {
        this.narrationReady = true;
        this.updateState();
        resolve();
      };

      this.narrationElement.onerror = () => {
        reject(new Error('Failed to load narration audio'));
      };

      this.narrationElement.load();
    });

    console.log('[AudioMixer] Narration source loaded:', src);
  }

  /**
   * Set the background music source
   */
  public async setMusicSrc(src: string | null): Promise<void> {
    if (!this.audioContext || !this.musicGain) {
      throw new Error('AudioContext not initialized');
    }

    // If no music source, clean up and return
    if (!src) {
      if (this.musicElement) {
        this.musicElement.pause();
        this.musicElement.src = '';
        this.musicElement = null;
      }
      if (this.musicSource) {
        this.musicSource.disconnect();
        this.musicSource = null;
      }
      this.updateState();
      console.log('[AudioMixer] Music removed');
      return;
    }

    // Clean up existing music
    if (this.musicElement) {
      this.musicElement.pause();
      this.musicElement.src = '';
    }

    // Create new audio element
    this.musicElement = new Audio(src);
    this.musicElement.loop = true; // Always loop music
    this.musicElement.preload = 'auto';

    // Connect to audio context
    if (this.musicSource) {
      this.musicSource.disconnect();
    }
    this.musicSource = this.audioContext.createMediaElementSource(this.musicElement);
    this.musicSource.connect(this.musicGain);

    // Wait for audio to be ready
    await new Promise<void>((resolve, reject) => {
      if (!this.musicElement) {
        reject(new Error('Music element lost'));
        return;
      }

      this.musicElement.onloadedmetadata = () => {
        this.updateState();
        resolve();
      };

      this.musicElement.onerror = (error) => {
        console.warn('[AudioMixer] Failed to load music:', error);
        // Don't reject - music is optional
        resolve();
      };

      this.musicElement.load();
    });

    console.log('[AudioMixer] Music source loaded:', src);
  }

  /**
   * Update state based on readiness
   */
  private updateState(): void {
    if (this.state === 'playing' || this.state === 'paused') {
      return; // Don't change state during playback
    }

    if (this.narrationReady) {
      this.state = 'ready';
    } else {
      this.state = 'loading';
    }
  }

  /**
   * Play both narration and music (if enabled)
   */
  public async play(): Promise<void> {
    if (!this.audioContext || !this.narrationElement) {
      throw new Error('Audio not ready');
    }

    // Resume audio context if suspended (required for user interaction)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Play narration
    try {
      await this.narrationElement.play();
      console.log('[AudioMixer] Narration playing');
    } catch (error) {
      console.error('[AudioMixer] Failed to play narration:', error);
      throw error;
    }

    // Play music if available and enabled
    if (this.musicElement && this.config.musicEnabled) {
      try {
        // Fade in music
        this.fadeIn();
        await this.musicElement.play();
        console.log('[AudioMixer] Music playing');
      } catch (error) {
        console.warn('[AudioMixer] Failed to play music (continuing without):', error);
      }
    }

    this.state = 'playing';
  }

  /**
   * Pause both narration and music
   */
  public pause(): void {
    if (!this.narrationElement) return;

    // Pause narration
    this.narrationElement.pause();
    console.log('[AudioMixer] Narration paused');

    // Pause music with fade out
    if (this.musicElement && this.config.musicEnabled) {
      this.fadeOut(() => {
        this.musicElement?.pause();
        console.log('[AudioMixer] Music paused');
      });
    }

    this.state = 'paused';
  }

  /**
   * Stop both narration and music, reset to beginning
   */
  public stop(): void {
    if (this.narrationElement) {
      this.narrationElement.pause();
      this.narrationElement.currentTime = 0;
    }

    if (this.musicElement) {
      this.fadeOut(() => {
        if (this.musicElement) {
          this.musicElement.pause();
          this.musicElement.currentTime = 0;
        }
      });
    }

    this.state = 'ready';
    console.log('[AudioMixer] Stopped');
  }

  /**
   * Fade in music over fadeTime seconds
   */
  private fadeIn(): void {
    if (!this.audioContext || !this.musicGain) return;

    // Clear any existing fade timeout
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }

    const currentTime = this.audioContext.currentTime;
    const targetVolume = this.config.musicVolume;

    // Cancel any scheduled values
    this.musicGain.gain.cancelScheduledValues(currentTime);

    // Set to zero and ramp up
    this.musicGain.gain.setValueAtTime(0, currentTime);
    this.musicGain.gain.linearRampToValueAtTime(
      targetVolume,
      currentTime + this.config.fadeTime
    );
  }

  /**
   * Fade out music over fadeTime seconds
   */
  private fadeOut(onComplete?: () => void): void {
    if (!this.audioContext || !this.musicGain) {
      onComplete?.();
      return;
    }

    // Clear any existing fade timeout
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }

    const currentTime = this.audioContext.currentTime;

    // Cancel any scheduled values
    this.musicGain.gain.cancelScheduledValues(currentTime);

    // Get current value and ramp down
    const currentValue = this.musicGain.gain.value;
    this.musicGain.gain.setValueAtTime(currentValue, currentTime);
    this.musicGain.gain.linearRampToValueAtTime(
      0,
      currentTime + this.config.fadeTime
    );

    // Call completion callback after fade
    if (onComplete) {
      this.fadeTimeout = setTimeout(onComplete, this.config.fadeTime * 1000);
    }
  }

  /**
   * Set music volume (0-1, will be scaled relative to narration)
   */
  public setMusicVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.config.musicVolume = clampedVolume;

    if (this.musicGain && this.config.musicEnabled) {
      // Update volume smoothly
      const currentTime = this.audioContext?.currentTime || 0;
      this.musicGain.gain.cancelScheduledValues(currentTime);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, currentTime);
      this.musicGain.gain.linearRampToValueAtTime(clampedVolume, currentTime + 0.1);
    }

    console.log('[AudioMixer] Music volume set to:', clampedVolume);
  }

  /**
   * Set narration volume (0-1)
   */
  public setNarrationVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.config.narrationVolume = clampedVolume;

    if (this.narrationGain) {
      // Update volume smoothly
      const currentTime = this.audioContext?.currentTime || 0;
      this.narrationGain.gain.cancelScheduledValues(currentTime);
      this.narrationGain.gain.setValueAtTime(this.narrationGain.gain.value, currentTime);
      this.narrationGain.gain.linearRampToValueAtTime(clampedVolume, currentTime + 0.1);
    }

    console.log('[AudioMixer] Narration volume set to:', clampedVolume);
  }

  /**
   * Enable or disable background music
   */
  public setMusicEnabled(enabled: boolean): void {
    this.config.musicEnabled = enabled;

    if (!this.musicGain) return;

    if (enabled) {
      // Fade in to configured volume
      const currentTime = this.audioContext?.currentTime || 0;
      this.musicGain.gain.cancelScheduledValues(currentTime);
      this.musicGain.gain.setValueAtTime(0, currentTime);
      this.musicGain.gain.linearRampToValueAtTime(
        this.config.musicVolume,
        currentTime + this.config.fadeTime
      );
    } else {
      // Fade out to zero
      this.fadeOut();
    }

    console.log('[AudioMixer] Music enabled:', enabled);
  }

  /**
   * Get current playback state
   */
  public getState(): AudioMixerState {
    return this.state;
  }

  /**
   * Get narration audio element (for seeking, time tracking, etc.)
   */
  public getNarrationElement(): HTMLAudioElement | null {
    return this.narrationElement;
  }

  /**
   * Get music audio element (for diagnostics)
   */
  public getMusicElement(): HTMLAudioElement | null {
    return this.musicElement;
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }

    if (this.narrationElement) {
      this.narrationElement.pause();
      this.narrationElement.src = '';
      this.narrationElement = null;
    }

    if (this.musicElement) {
      this.musicElement.pause();
      this.musicElement.src = '';
      this.musicElement = null;
    }

    if (this.narrationSource) {
      this.narrationSource.disconnect();
      this.narrationSource = null;
    }

    if (this.musicSource) {
      this.musicSource.disconnect();
      this.musicSource = null;
    }

    if (this.narrationGain) {
      this.narrationGain.disconnect();
      this.narrationGain = null;
    }

    if (this.musicGain) {
      this.musicGain.disconnect();
      this.musicGain = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.state = 'idle';
    console.log('[AudioMixer] Disposed');
  }
}

// Export singleton instance
export const audioMixer = new AudioMixer();
