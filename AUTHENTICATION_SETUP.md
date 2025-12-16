# Authentication & Sync Setup Guide

This guide will help you set up Google and Facebook authentication with Firebase for the Bilingual Bible PWA.

## Overview

The app uses **Firebase Authentication** and **Firestore** to provide:
- Google OAuth sign-in ("Continue with Google")
- Facebook OAuth sign-in ("Continue with Facebook")
- Cross-device sync for:
  - Vocabulary words with SRS data
  - Bookmarks with notes
  - Reading history
  - Settings and preferences
  - Reading position

## Quick Start

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the wizard
3. Name your project (e.g., "Bilingual Bible")
4. You can disable Google Analytics if not needed
5. Click "Create project"

### 2. Set up Firebase Authentication

1. In your Firebase project, go to **Authentication** > **Sign-in method**
2. Enable **Google** provider:
   - Click on "Google"
   - Toggle "Enable"
   - Set a support email
   - Click "Save"

3. Enable **Facebook** provider:
   - First, create a Facebook App:
     - Go to [Facebook Developers](https://developers.facebook.com/)
     - Create a new app (type: "Consumer")
     - In the app dashboard, go to **Settings** > **Basic**
     - Copy your **App ID** and **App Secret**

   - Back in Firebase console:
     - Click on "Facebook"
     - Toggle "Enable"
     - Paste your Facebook App ID and App Secret
     - Copy the OAuth redirect URI shown

   - Return to Facebook Developers:
     - Go to **Facebook Login** > **Settings**
     - Add the OAuth redirect URI to "Valid OAuth Redirect URIs"
     - Save changes

### 3. Set up Firestore Database

1. In Firebase console, go to **Firestore Database**
2. Click "Create database"
3. Start in **production mode** (we have custom security rules)
4. Choose a location (preferably close to your users)
5. Click "Enable"

### 4. Configure Firestore Security Rules

1. In Firestore console, go to **Rules** tab
2. Replace the default rules with the content from `firestore.rules` file in the project root
3. Click "Publish"

The rules ensure:
- Users can only read/write their own data
- All data is private and secure
- No one can access another user's data

### 5. Add Web App to Firebase Project

1. In Firebase console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click the **Web** icon (`</>`)
4. Register your app:
   - App nickname: "Bilingual Bible Web"
   - Check "Also set up Firebase Hosting" (optional)
   - Click "Register app"
5. Copy the Firebase configuration object (you'll need this in the next step)

### 6. Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and fill in your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

3. **Important**: Never commit `.env.local` to version control. It's already in `.gitignore`.

### 7. Test the Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open the app in your browser
3. Click the settings icon (gear)
4. You should see an "Account" section at the top
5. Click "Sign in to sync your data"
6. Try signing in with Google or Facebook
7. Verify that your profile appears in the settings

## Data Sync Behavior

### When Signed Out
- All data is stored in **localStorage** only
- Data persists on the current device/browser
- No cross-device sync

### When Signing In (First Time)
- **Automatic migration**: All existing localStorage data is automatically uploaded to Firebase
- Includes: vocabulary, bookmarks, history, and settings
- Migration happens in the background on first sign-in
- You'll see a sync indicator during migration

### When Signed In
- All changes are synced to Firebase **in real-time**
- Data is available across all devices where you sign in
- **Offline support**: Changes are cached locally and synced when online
- Firestore provides automatic conflict resolution

### When Signing Out
- Local data remains on the device
- Sign in again on any device to access your cloud data

## Architecture

```
React App (SPA)
├── Authentication Layer (authStore.ts)
│   ├── Google OAuth
│   └── Facebook OAuth
│
├── Sync Manager (useSyncManager hook)
│   ├── Monitors auth state
│   ├── Syncs local stores ↔ Firestore
│   └── Handles data migration
│
└── Firestore Collections
    └── users/{userId}/
        ├── vocabulary/{wordId}      - Saved words with SRS data
        ├── bookmarks/{bookmarkId}   - Verse bookmarks with notes
        ├── history/{entryId}        - Reading history
        └── settings/user_settings   - User preferences
```

## Security Notes

1. **API Keys**: Firebase API keys are safe to expose in client-side code. They identify your Firebase project, not authorize access. Authorization is handled by Firestore security rules.

2. **Security Rules**: The `firestore.rules` file ensures users can only access their own data. Review and customize as needed.

3. **OAuth Credentials**: Keep your Facebook App Secret secure. Never commit it to version control.

## Troubleshooting

### "Firebase not configured" error
- Check that all environment variables are set in `.env.local`
- Restart the dev server after changing `.env.local`

### Can't sign in with Google
- Verify Google provider is enabled in Firebase Console
- Check that your domain is authorized in Firebase > Authentication > Settings > Authorized domains

### Can't sign in with Facebook
- Verify Facebook App ID and Secret are correct in Firebase Console
- Check that OAuth redirect URI is added to Facebook App settings
- Ensure Facebook App is in "Live" mode (not Development)

### Data not syncing
- Open browser console and check for errors
- Verify Firestore rules are published
- Check that you're signed in (look for profile in settings)

### Slow initial sync
- First-time sync uploads all local data to Firebase
- Subsequent syncs are much faster
- Large vocabulary lists may take longer

## Development Tips

1. **Test with multiple accounts**: Create test Google/Facebook accounts to verify multi-device sync

2. **Monitor Firestore**: Use Firebase Console to view/debug data in real-time

3. **Check sync status**: A spinning icon appears in the header during active sync

4. **Local-only mode**: If Firebase is not configured, the app falls back to localStorage-only mode

## Cost Considerations

Firebase offers a generous free tier (Spark plan):
- **Authentication**: 10,000 phone authentications/month (unlimited email/social)
- **Firestore**: 1GB storage, 50K reads/day, 20K writes/day, 20K deletes/day

For a personal Bible reading app, you'll likely stay within the free tier. Monitor usage in Firebase Console.

## Next Steps

- Customize the login UI in `src/components/auth/LoginScreen.tsx`
- Add more OAuth providers if needed
- Implement data export/import functionality
- Add user profile customization

## Files Modified/Created

### New Files
- `src/lib/firebase.ts` - Firebase initialization
- `src/lib/firebaseSync.ts` - Firestore sync utilities
- `src/lib/dataMigration.ts` - localStorage → Firestore migration
- `src/stores/authStore.ts` - Authentication state
- `src/hooks/useSyncManager.ts` - Sync orchestration
- `src/components/auth/LoginScreen.tsx` - Login UI
- `src/components/auth/ProfileScreen.tsx` - Profile UI
- `firestore.rules` - Firestore security rules
- `.env.local.example` - Environment variables template

### Modified Files
- `src/App.tsx` - Added sync manager initialization
- `src/components/settings/SettingsScreen.tsx` - Added account section
- `src/components/navigation/Header.tsx` - Added sync status indicator
- `package.json` - Added Firebase dependency

## Support

For issues or questions:
1. Check Firebase Console for errors
2. Review browser console for error messages
3. Verify all setup steps are completed
4. Check Firebase documentation: https://firebase.google.com/docs
