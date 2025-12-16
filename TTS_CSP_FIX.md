# TTS Audio Playback Fix - CSP Issue

## Problem

Google Cloud TTS was working on localhost but NOT on production (dubible.com). Console showed:
- 8x `ERR_FAILED` errors
- CSP violations: "Loading media from 'blob:https://dubible.com/...' violates the following Content Security Policy directive: "default-src 'self'". Note that 'media-src' was not explicitly set, so 'default-src' is used as a fallback."

## Root Cause

The Content Security Policy (CSP) in `vercel.json` was missing a `media-src` directive, causing it to fall back to `default-src 'self'`, which blocked blob: URLs used for audio playback.

## What Was Working

1. Google Cloud TTS API calls were successful (200 OK)
2. Audio data was being returned correctly
3. Blob URLs were being created
4. The audio element was attempting to load the blob

## What Was Broken

The CSP was blocking the browser's `<audio>` element from loading the blob: URL containing the synthesized speech.

## Investigation Process

1. Checked console messages - found CSP violation errors
2. Verified TTS API calls - confirmed they were successful
3. Examined network requests - saw POST to `texttospeech.googleapis.com` returning 200
4. Checked CSP headers with `curl -I https://dubible.com`
5. Found CSP was missing `media-src` directive

## Solution

Added `media-src 'self' blob:` to the Content Security Policy in `vercel.json`:

```json
"Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; media-src 'self' blob:; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.openai.com https://bible.fhl.net wss://*.firebaseio.com; frame-src 'self' https://accounts.google.com https://*.firebaseapp.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
```

The key addition: `media-src 'self' blob:`

## Deployment

- Committed fix: commit `6aa7fad`
- Pushed to main branch
- Vercel will automatically redeploy with the new CSP

## Verification

After deployment completes (~2-3 minutes), test by:
1. Visit dubible.com
2. Click on any Chinese word
3. Click the audio/speaker button
4. Audio should now play without CSP violations

## Why This Wasn't an Issue on Localhost

Localhost likely had a different or more permissive CSP configuration during development, allowing blob: URLs by default. Production had strict CSP enforcement via Vercel's headers configuration.
