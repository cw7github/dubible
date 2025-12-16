import { create } from 'zustand';
import {
  signInWithGoogle,
  signInWithFacebook,
  signOut as firebaseSignOut,
  onAuthChange,
  isFirebaseConfigured,
  type User,
} from '../lib/firebase';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: 'google' | 'facebook' | null;
}

interface AuthState {
  // User state
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Sync state
  isSyncing: boolean;
  lastSyncTime: number | null;
  syncError: string | null;

  // Firebase availability
  isFirebaseAvailable: boolean;

  // Actions
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  setSyncing: (isSyncing: boolean) => void;
  setSyncComplete: () => void;
  setSyncError: (error: string | null) => void;
  clearError: () => void;
}

// Helper to convert Firebase User to UserProfile
const toUserProfile = (user: User | null): UserProfile | null => {
  if (!user) return null;

  // Determine provider
  let provider: 'google' | 'facebook' | null = null;
  if (user.providerData[0]) {
    const providerId = user.providerData[0].providerId;
    if (providerId.includes('google')) {
      provider = 'google';
    } else if (providerId.includes('facebook')) {
      provider = 'facebook';
    }
  }

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    provider,
  };
};

export const useAuthStore = create<AuthState>((set) => {
  // Set up auth state listener on store creation
  if (isFirebaseConfigured) {
    onAuthChange((user) => {
      const userProfile = toUserProfile(user);
      set({
        user: userProfile,
        isAuthenticated: !!userProfile,
        isLoading: false,
      });
    });
  }

  return {
    // Initial state
    user: null,
    isAuthenticated: false,
    isLoading: isFirebaseConfigured, // Loading if Firebase is configured (waiting for auth state)
    error: null,

    isSyncing: false,
    lastSyncTime: null,
    syncError: null,

    isFirebaseAvailable: isFirebaseConfigured,

    // Sign in with Google
    signInWithGoogle: async () => {
      set({ isLoading: true, error: null });
      try {
        await signInWithGoogle();
        // User state will be updated by onAuthChange listener
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to sign in with Google';
        set({ error: errorMessage, isLoading: false });
        throw error;
      }
    },

    // Sign in with Facebook
    signInWithFacebook: async () => {
      set({ isLoading: true, error: null });
      try {
        await signInWithFacebook();
        // User state will be updated by onAuthChange listener
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to sign in with Facebook';
        set({ error: errorMessage, isLoading: false });
        throw error;
      }
    },

    // Sign out
    signOut: async () => {
      set({ isLoading: true, error: null });
      try {
        await firebaseSignOut();
        // User state will be updated by onAuthChange listener
        set({ lastSyncTime: null, syncError: null });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to sign out';
        set({ error: errorMessage, isLoading: false });
        throw error;
      }
    },

    // Set user (called by auth listener)
    setUser: (user) => {
      const userProfile = toUserProfile(user);
      set({
        user: userProfile,
        isAuthenticated: !!userProfile,
        isLoading: false,
      });
    },

    // Sync state management
    setSyncing: (isSyncing) => set({ isSyncing }),

    setSyncComplete: () =>
      set({
        isSyncing: false,
        lastSyncTime: Date.now(),
        syncError: null,
      }),

    setSyncError: (error) =>
      set({
        isSyncing: false,
        syncError: error,
      }),

    // Clear error
    clearError: () => set({ error: null }),
  };
});
