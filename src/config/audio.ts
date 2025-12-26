/**
 * Audio hosting configuration
 *
 * Set VITE_AUDIO_BASE_URL in .env to use external hosting (e.g., Cloudflare R2)
 * If not set, falls back to local /audio path
 */

// External audio base URL (Cloudflare R2, S3, etc.)
// Example: https://audio.dubible.com or https://pub-xxx.r2.dev
const externalAudioUrl = import.meta.env.VITE_AUDIO_BASE_URL as string | undefined;

/**
 * Get the base URL for audio files
 * Returns external URL if configured, otherwise local path
 */
export function getAudioBaseUrl(): string {
  if (externalAudioUrl) {
    // Remove trailing slash if present
    return externalAudioUrl.replace(/\/$/, '');
  }
  // Local path (served from public/audio)
  return '';
}

/**
 * Get the full URL for an audio file
 */
export function getAudioUrl(bookId: string, chapter: number, version: number = 5): string {
  const base = getAudioBaseUrl();
  const path = `/audio/${bookId}/chapter-${chapter}.mp3`;
  return `${base}${path}?v=${version}`;
}

/**
 * Get the full URL for audio timing JSON
 */
export function getAudioTimingUrl(bookId: string, chapter: number, version: number = 5): string {
  const base = getAudioBaseUrl();
  const path = `/audio/${bookId}/chapter-${chapter}.json`;
  return `${base}${path}?v=${version}`;
}

/**
 * Get the full URL for ambient music
 */
export function getMusicUrl(bookId: string, filename: string): string {
  const base = getAudioBaseUrl();
  return `${base}/audio/${bookId}/music/${filename}`;
}

/**
 * Get the full URL for music metadata
 */
export function getMusicMetadataUrl(bookId: string): string {
  const base = getAudioBaseUrl();
  return `${base}/audio/${bookId}/music/metadata.json`;
}

/**
 * Check if external audio hosting is configured
 */
export function isExternalAudioEnabled(): boolean {
  return !!externalAudioUrl;
}
