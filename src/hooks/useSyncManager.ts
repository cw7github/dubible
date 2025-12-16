import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useVocabularyStore } from '../stores/vocabularyStore';
import { useBookmarkStore } from '../stores/bookmarkStore';
import { useHistoryStore } from '../stores/historyStore';
import { useSettingsStore } from '../stores/settingsStore';
import { firestoreSync } from '../lib/firebaseSync';
import { migrateLocalDataToFirestore, mergeData } from '../lib/dataMigration';
import type { Unsubscribe } from 'firebase/firestore';

/**
 * Hook to manage syncing between local stores and Firestore
 * This hook should be used once at the app level
 */
export function useSyncManager() {
  const { user, isAuthenticated, setSyncing, setSyncComplete, setSyncError } = useAuthStore();

  // Store references
  const vocabularyStore = useVocabularyStore();
  const bookmarkStore = useBookmarkStore();
  const historyStore = useHistoryStore();
  const settingsStore = useSettingsStore();

  // Track if initial sync has completed
  const hasInitialSyncedRef = useRef(false);
  const unsubscribersRef = useRef<Unsubscribe[]>([]);

  // Cleanup function
  const cleanup = () => {
    unsubscribersRef.current.forEach((unsub) => unsub());
    unsubscribersRef.current = [];
    hasInitialSyncedRef.current = false;
  };

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // User logged out - cleanup listeners
      cleanup();
      return;
    }

    // User is authenticated - set up sync
    const setupSync = async () => {
      try {
        setSyncing(true);

        // Step 1: Migrate local data to Firestore (if first time)
        const migrationResult = await migrateLocalDataToFirestore(user.uid);

        if (!migrationResult.success) {
          throw new Error(migrationResult.error || 'Migration failed');
        }

        // Step 2: Load data from Firestore
        const [cloudVocab, cloudBookmarks, cloudHistory, cloudSettings] = await Promise.all([
          firestoreSync.loadVocabularyFromCloud(user.uid),
          firestoreSync.loadBookmarksFromCloud(user.uid),
          firestoreSync.loadHistoryFromCloud(user.uid),
          firestoreSync.loadSettingsFromCloud(user.uid),
        ]);

        // Step 3: Merge cloud data with local data (in case of conflicts)
        const localVocab = vocabularyStore.words;
        const localBookmarks = bookmarkStore.bookmarks;
        const localHistory = historyStore.entries;

        const mergedVocab = mergeData(cloudVocab, localVocab);
        const mergedBookmarks = mergeData(cloudBookmarks, localBookmarks);
        const mergedHistory = mergeData(cloudHistory, localHistory);

        // Step 4: Update local stores with merged data
        // We'll set the state directly by replacing the entire array
        vocabularyStore.clearAllWords();
        mergedVocab.forEach((word) => {
          vocabularyStore.addWord(
            word.chinese,
            word.pinyin,
            word.definition,
            word.sourceVerse,
            word.partOfSpeech,
            word.hskLevel
          );
          // Update the SRS data
          if (word.srsData) {
            vocabularyStore.reviewWord(word.id, 'good'); // Dummy call to update state
            // Directly set the word with correct SRS data
            const wordIndex = vocabularyStore.words.findIndex((w) => w.id === word.id);
            if (wordIndex >= 0) {
              vocabularyStore.words[wordIndex] = word;
            }
          }
        });

        bookmarkStore.clearAllBookmarks();
        mergedBookmarks.forEach((bookmark) => {
          bookmarkStore.addBookmark(bookmark.verseRef, bookmark.note);
        });

        historyStore.clearHistory();
        mergedHistory.forEach((entry) => {
          historyStore.pushEntry(entry.bookId, entry.chapter);
        });

        if (cloudSettings) {
          // Merge settings - prefer cloud settings
          Object.assign(settingsStore, cloudSettings);
        }

        // Step 5: Set up real-time listeners
        const vocabUnsub = firestoreSync.subscribeToVocabulary(user.uid, (words) => {
          // Update local store when cloud data changes
          // This is triggered by changes from other devices
          if (hasInitialSyncedRef.current) {
            vocabularyStore.clearAllWords();
            words.forEach((word) => {
              vocabularyStore.addWord(
                word.chinese,
                word.pinyin,
                word.definition,
                word.sourceVerse,
                word.partOfSpeech,
                word.hskLevel
              );
            });
          }
        });

        const bookmarksUnsub = firestoreSync.subscribeToBookmarks(user.uid, (bookmarks) => {
          if (hasInitialSyncedRef.current) {
            bookmarkStore.clearAllBookmarks();
            bookmarks.forEach((bookmark) => {
              bookmarkStore.addBookmark(bookmark.verseRef, bookmark.note);
            });
          }
        });

        const historyUnsub = firestoreSync.subscribeToHistory(user.uid, (entries) => {
          if (hasInitialSyncedRef.current) {
            historyStore.clearHistory();
            entries.forEach((entry) => {
              historyStore.pushEntry(entry.bookId, entry.chapter);
            });
          }
        });

        const settingsUnsub = firestoreSync.subscribeToSettings(user.uid, (settings) => {
          if (hasInitialSyncedRef.current) {
            Object.assign(settingsStore, settings);
          }
        });

        unsubscribersRef.current = [vocabUnsub, bookmarksUnsub, historyUnsub, settingsUnsub];

        hasInitialSyncedRef.current = true;
        setSyncComplete();
      } catch (error) {
        console.error('Error setting up sync:', error);
        setSyncError(error instanceof Error ? error.message : 'Sync failed');
      }
    };

    setupSync();

    // Cleanup on unmount or when user changes
    return cleanup;
  }, [isAuthenticated, user?.uid]);

  // Set up listeners for local changes to sync to cloud
  useEffect(() => {
    if (!isAuthenticated || !user || !hasInitialSyncedRef.current) return;

    // Vocabulary changes
    const vocabularyState = vocabularyStore.words;
    firestoreSync.syncVocabularyToCloud(user.uid, vocabularyState).catch((error) => {
      console.error('Error syncing vocabulary to cloud:', error);
    });
  }, [vocabularyStore.words, isAuthenticated, user?.uid]);

  useEffect(() => {
    if (!isAuthenticated || !user || !hasInitialSyncedRef.current) return;

    // Bookmarks changes
    const bookmarksState = bookmarkStore.bookmarks;
    firestoreSync.syncBookmarksToCloud(user.uid, bookmarksState).catch((error) => {
      console.error('Error syncing bookmarks to cloud:', error);
    });
  }, [bookmarkStore.bookmarks, isAuthenticated, user?.uid]);

  useEffect(() => {
    if (!isAuthenticated || !user || !hasInitialSyncedRef.current) return;

    // History changes
    const historyState = historyStore.entries;
    firestoreSync.syncHistoryToCloud(user.uid, historyState).catch((error) => {
      console.error('Error syncing history to cloud:', error);
    });
  }, [historyStore.entries, isAuthenticated, user?.uid]);

  useEffect(() => {
    if (!isAuthenticated || !user || !hasInitialSyncedRef.current) return;

    // Settings changes
    const settingsState = {
      theme: settingsStore.theme,
      fontFamily: settingsStore.fontFamily,
      textSize: settingsStore.textSize,
      pinyinLevel: settingsStore.pinyinLevel,
      pinyinDisplay: settingsStore.pinyinDisplay,
      characterSet: settingsStore.characterSet,
      showHskIndicators: settingsStore.showHskIndicators,
      chineseVersion: settingsStore.chineseVersion,
      englishVersion: settingsStore.englishVersion,
      audioSpeed: settingsStore.audioSpeed,
      lastReadingPosition: settingsStore.lastReadingPosition,
    };

    firestoreSync.syncSettingsToCloud(user.uid, settingsState).catch((error) => {
      console.error('Error syncing settings to cloud:', error);
    });
  }, [
    settingsStore.theme,
    settingsStore.fontFamily,
    settingsStore.textSize,
    settingsStore.pinyinLevel,
    settingsStore.characterSet,
    settingsStore.showHskIndicators,
    settingsStore.audioSpeed,
    settingsStore.lastReadingPosition,
    isAuthenticated,
    user?.uid,
  ]);
}
