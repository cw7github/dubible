# Deployment Guide

## Production URL
- **Site**: https://dubible.com
- **Vercel Project**: bilingual_bib

## Environment Variables (Vercel)

### Google Cloud TTS (Secure)

Production uses a server-side proxy (`/api/tts/google`) so the Google Cloud TTS key is not shipped to the browser.

- Set `GOOGLE_CLOUD_TTS_API_KEY` in Vercel (Production)
- Remove `VITE_GOOGLE_CLOUD_API_KEY` from Vercel Production (dev-only; previously exposed client-side)
- Redeploy after changing env vars (`vercel --prod --yes`)
- Rotate the Google API key if it was ever exposed in previous deployments

## Quick Deploy (Recommended)

The fastest way to deploy to production:

```bash
vercel --prod
```

This command:
- Builds the project locally
- Uploads to Vercel
- Deploys to dubible.com immediately
- Bypasses GitHub entirely

## Deployment Methods

### Method 1: Vercel CLI (Recommended)
Direct deployment from local files - fastest and most reliable:

```bash
# Deploy to production (interactive - shows preview)
vercel --prod

# Deploy to production (automatic - no prompts)
vercel --prod --yes
```

**Advantages:**
- No dependency on GitHub
- Immediate deployment
- Works even if git/GitHub has issues
- Full control over what gets deployed

### Method 2: Git Push (Alternative)
When you want to track deployments in git history:

```bash
git add -A
git commit -m "Your commit message"
git push origin main
```

Vercel automatically deploys on push to `main` branch.

**Note:** This method requires GitHub to be working and may be slower.

## Post-Deployment

After deploying, users may need to hard refresh to bypass CDN cache:
- **Mac**: Cmd + Shift + R
- **Windows/Linux**: Ctrl + Shift + R
- **Mobile**: Clear browser cache or use incognito

## Vercel Configuration

The `vercel.json` file configures:
- Build command: `npm run build`
- Output directory: `dist`
- Framework: Vite
- SPA rewrites (all routes → index.html)
- Security headers (CSP, HSTS, etc.)
- Cache headers for assets

## Checking Deployment Status

```bash
# Via Vercel CLI
vercel ls

# Via GitHub CLI
gh repo view cw7github/dubible --json pushedAt

# Inspect specific deployment
vercel inspect <deployment-url> --logs
```

## Troubleshooting

### GitHub Push Fails
Use Vercel CLI as fallback:
```bash
vercel --prod --yes
```

### Changes Not Appearing
1. Hard refresh browser (Cmd+Shift+R)
2. Check Vercel dashboard for build status
3. Verify CSP headers aren't blocking resources

### Large Bundle Warning
The build shows a warning about chunk size (8.5MB). This is expected due to:
- Bible data bundled in the app
- English translations embedded
- Can be optimized later with code splitting
