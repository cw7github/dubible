# Deployment Guide

## Production URL
- **Site**: https://dubible.com
- **Vercel Project**: bilingual_bib

## Deployment Methods

### Method 1: Git Push (Primary)
When GitHub is working normally:

```bash
git add -A
git commit -m "Your commit message"
git push origin main
```

Vercel automatically deploys on push to `main` branch.

### Method 2: Vercel CLI (Fallback)
When GitHub has issues or you need immediate deployment:

```bash
# Deploy to production
vercel --prod --yes

# Or with inspection
vercel --prod
```

This bypasses GitHub entirely and deploys directly from local files.

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
