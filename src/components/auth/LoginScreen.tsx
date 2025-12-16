import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores';

interface LoginScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginScreen({ isOpen, onClose }: LoginScreenProps) {
  const { signInWithGoogle, error, isLoading, clearError } = useAuthStore();
  const [localError, setLocalError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLocalError(null);
      clearError();
      await signInWithGoogle();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in';
      setLocalError(message);
    }
  };

  // Facebook sign-in disabled until Facebook Developer App is configured
  // const handleFacebookSignIn = async () => {
  //   try {
  //     setLocalError(null);
  //     clearError();
  //     await signInWithFacebook();
  //     onClose();
  //   } catch (err) {
  //     const message = err instanceof Error ? err.message : 'Failed to sign in';
  //     setLocalError(message);
  //   }
  // };

  const displayError = localError || error;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Login Panel */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl safe-area-bottom"
            style={{
              backgroundColor: 'var(--bg-primary)',
              maxHeight: '80vh',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <h2
                className="text-xl font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Sign In
              </h2>
              <button
                onClick={onClose}
                className="touch-feedback rounded-full p-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-6 w-6"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-8">
              {/* Title and description */}
              <div className="mb-8 text-center">
                <h3
                  className="mb-2 text-2xl font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Welcome to DuBible
                </h3>
                <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
                  Sign in to sync your vocabulary, bookmarks, and reading progress across all
                  your devices
                </p>
              </div>

              {/* Benefits list */}
              <div className="mb-8 space-y-3">
                {[
                  {
                    icon: (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-5 w-5"
                      >
                        <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
                      </svg>
                    ),
                    text: 'Save vocabulary words with spaced repetition',
                  },
                  {
                    icon: (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-5 w-5"
                      >
                        <path
                          fillRule="evenodd"
                          d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ),
                    text: 'Bookmark important verses',
                  },
                  {
                    icon: (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-5 w-5"
                      >
                        <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
                        <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
                      </svg>
                    ),
                    text: 'Continue reading from any device',
                  },
                  {
                    icon: (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-5 w-5"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.059-4.035.75.75 0 00-.53-.918z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ),
                    text: 'Automatic sync across all devices',
                  },
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: 'var(--bg-accent)' }}
                    >
                      <div style={{ color: 'var(--text-accent)' }}>{benefit.icon}</div>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {benefit.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Error message */}
              {displayError && (
                <div
                  className="mb-4 rounded-lg p-3"
                  style={{
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                    border: '1px solid rgba(220, 38, 38, 0.2)',
                  }}
                >
                  <p className="text-sm" style={{ color: 'rgb(220, 38, 38)' }}>
                    {displayError}
                  </p>
                </div>
              )}

              {/* Sign in buttons */}
              <div className="space-y-3">
                {/* Google sign in */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="touch-feedback flex w-full items-center justify-center gap-3 rounded-xl px-6 py-4 font-medium transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#1F2937',
                    border: '1px solid #E5E7EB',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 01-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35z"
                      fill="#4285F4"
                    />
                    <path
                      d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A9.996 9.996 0 0010 20z"
                      fill="#34A853"
                    />
                    <path
                      d="M4.405 11.9c-.2-.6-.314-1.24-.314-1.9 0-.66.114-1.3.314-1.9V5.51H1.064A9.996 9.996 0 000 10c0 1.614.386 3.14 1.064 4.49l3.34-2.59z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.695 0 10 0 6.09 0 2.71 2.24 1.064 5.51l3.34 2.59C5.19 5.736 7.395 3.977 10 3.977z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </button>

                {/* Facebook sign in - hidden until Facebook App is configured */}
                {/* TODO: Enable when Facebook Developer App is set up */}
              </div>

              {/* Privacy note */}
              <p
                className="mt-6 text-center text-xs"
                style={{ color: 'var(--text-tertiary)' }}
              >
                By signing in, you agree to sync your data to the cloud. Your data is private
                and secure, and only you can access it.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
