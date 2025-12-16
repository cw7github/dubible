import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useVocabularyStore } from '../stores/vocabularyStore';
import { useBookmarkStore } from '../stores/bookmarkStore';
import { useHistoryStore } from '../stores/historyStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useReadingPlansStore } from '../stores/readingPlansStore';
import { useProgressStore } from '../stores/progressStore';
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
  // Note: useReadingPlansStore and useProgressStore are used via .setState() and .subscribe()
  // directly on the store, not through hook instances, to avoid causing re-renders
  const progressStore = useProgressStore();

  // Track if initial sync has completed
  const hasInitialSyncedRef = useRef(false);
  const unsubscribersRef = useRef<Unsubscribe[]>([]);

  // Track pending syncs to debounce rapid changes
  const syncTimeoutRef = useRef<{
    vocabulary?: ReturnType<typeof setTimeout>;
    bookmarks?: ReturnType<typeof setTimeout>;
    history?: ReturnType<typeof setTimeout>;
    settings?: ReturnType<typeof setTimeout>;
    readingPlans?: ReturnType<typeof setTimeout>;
    progress?: ReturnType<typeof setTimeout>;
  }>({});

  // Track if we're currently processing a cloud update to prevent sync loops
  const isProcessingCloudUpdateRef = useRef(false);

  // Track the last local modification time for each store to detect genuine cloud changes
  const lastLocalModificationRef = useRef<{
    vocabulary?: number;
    bookmarks?: number;
    history?: number;
    settings?: number;
    readingPlans?: number;
    progress?: number;
  }>({});

  // Cleanup function
  const cleanup = () => {
    unsubscribersRef.current.forEach((unsub) => unsub());
    unsubscribersRef.current = [];
    hasInitialSyncedRef.current = false;

    // Clear any pending sync timeouts
    Object.values(syncTimeoutRef.current).forEach((timeout) => {
      if (timeout) clearTimeout(timeout);
    });
    syncTimeoutRef.current = {};

    // Reset last modification times
    lastLocalModificationRef.current = {};
  };

  // Main sync setup effect
  useEffect(() => {
    if (!isAuthenticated || !user) {
      // User logged out - cleanup listeners
      cleanup();
      return;
    }

    const userId = user.uid;

    // User is authenticated - set up sync
    const setupSync = async () => {
      try {
        setSyncing(true);

        // Step 1: Migrate local data to Firestore (if first time)
        const migrationResult = await migrateLocalDataToFirestore(userId);

        if (!migrationResult.success) {
          throw new Error(migrationResult.error || 'Migration failed');
        }

        // Step 2: Load data from Firestore
        const [cloudVocab, cloudBookmarks, cloudHistory, cloudSettings, cloudReadingPlans, cloudProgress] = await Promise.all([
          firestoreSync.loadVocabularyFromCloud(userId),
          firestoreSync.loadBookmarksFromCloud(userId),
          firestoreSync.loadHistoryFromCloud(userId),
          firestoreSync.loadSettingsFromCloud(userId),
          firestoreSync.loadReadingPlansFromCloud(userId),
          firestoreSync.loadProgressFromCloud(userId),
        ]);

        // Step 3: Merge cloud data with local data (in case of conflicts)
        const localVocab = vocabularyStore.words;
        const localBookmarks = bookmarkStore.bookmarks;
        const localHistory = historyStore.entries;

        const mergedVocab = mergeData(cloudVocab, localVocab);
        const mergedBookmarks = mergeData(cloudBookmarks, localBookmarks);
        const mergedHistory = mergeData(cloudHistory, localHistory);

        // Step 4: Update local stores with merged data
        // Set flag to prevent sync loop during initial load
        isProcessingCloudUpdateRef.current = true;

        // Use setWords to preserve all word data including SRS progress
        vocabularyStore.setWords(mergedVocab);

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

        // Merge reading plans - prefer cloud for consistency across devices
        if (cloudReadingPlans) {
          // Use cloud reading plans state
          if (cloudReadingPlans.activePlan !== undefined) {
            // Clear local first, then apply cloud state
            if (cloudReadingPlans.activePlan) {
              // Start the plan from cloud (replicates cloud state)
              useReadingPlansStore.setState({
                activePlan: cloudReadingPlans.activePlan,
                completedPlans: cloudReadingPlans.completedPlans || [],
              });
            } else {
              useReadingPlansStore.setState({
                activePlan: null,
                completedPlans: cloudReadingPlans.completedPlans || [],
              });
            }
          }
        }

        // Merge progress - prefer cloud for consistency across devices
        if (cloudProgress) {
          // Merge chapters completed (union of both)
          const localChapters = new Set(progressStore.chaptersCompleted);
          const cloudChapters = new Set(cloudProgress.chaptersCompleted || []);
          const mergedChapters = Array.from(new Set([...localChapters, ...cloudChapters]));

          // Merge book progress (prefer more recent timestamps)
          const mergedBookProgress = { ...progressStore.bookProgress };
          if (cloudProgress.bookProgress) {
            Object.entries(cloudProgress.bookProgress).forEach(([bookId, cloudBookProg]) => {
              const localBookProg = mergedBookProgress[bookId];
              if (!localBookProg || cloudBookProg.lastReadTimestamp > localBookProg.lastReadTimestamp) {
                mergedBookProgress[bookId] = cloudBookProg;
              } else {
                // Merge chapters read (union)
                const mergedChaptersRead = Array.from(
                  new Set([...localBookProg.chaptersRead, ...cloudBookProg.chaptersRead])
                ).sort((a, b) => a - b);
                mergedBookProgress[bookId] = {
                  ...localBookProg,
                  chaptersRead: mergedChaptersRead,
                  percentComplete: Math.max(localBookProg.percentComplete, cloudBookProg.percentComplete),
                };
              }
            });
          }

          // Merge streaks (prefer better streak, but use most recent lastReadDate)
          const localStreak = progressStore.streak;
          const cloudStreak = cloudProgress.streak;
          let mergedStreak = localStreak;
          if (cloudStreak) {
            const localLastRead = localStreak.lastReadDate ? new Date(localStreak.lastReadDate).getTime() : 0;
            const cloudLastRead = cloudStreak.lastReadDate ? new Date(cloudStreak.lastReadDate).getTime() : 0;

            if (cloudLastRead >= localLastRead) {
              mergedStreak = {
                ...cloudStreak,
                longestStreak: Math.max(localStreak.longestStreak, cloudStreak.longestStreak),
              };
            } else {
              mergedStreak = {
                ...localStreak,
                longestStreak: Math.max(localStreak.longestStreak, cloudStreak.longestStreak),
              };
            }
          }

          // Merge daily history (combine and dedupe by date)
          const historyMap = new Map<string, typeof cloudProgress.dailyHistory[0]>();
          progressStore.dailyHistory.forEach(entry => historyMap.set(entry.date, entry));
          if (cloudProgress.dailyHistory) {
            cloudProgress.dailyHistory.forEach(cloudEntry => {
              const existing = historyMap.get(cloudEntry.date);
              if (!existing) {
                historyMap.set(cloudEntry.date, cloudEntry);
              } else {
                // Merge chapters read for the same day
                const mergedDayChapters = [...existing.chaptersRead];
                cloudEntry.chaptersRead.forEach(cloudChapter => {
                  const exists = mergedDayChapters.some(
                    c => c.bookId === cloudChapter.bookId && c.chapter === cloudChapter.chapter
                  );
                  if (!exists) {
                    mergedDayChapters.push(cloudChapter);
                  }
                });
                historyMap.set(cloudEntry.date, {
                  ...existing,
                  chaptersRead: mergedDayChapters,
                  totalVerses: Math.max(existing.totalVerses, cloudEntry.totalVerses),
                });
              }
            });
          }
          const mergedDailyHistory = Array.from(historyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

          // Apply merged progress state
          useProgressStore.setState({
            chaptersCompleted: mergedChapters,
            bookProgress: mergedBookProgress,
            streak: mergedStreak,
            dailyHistory: mergedDailyHistory,
          });
        }

        // Clear the flag after initial load
        isProcessingCloudUpdateRef.current = false;

        // Step 5: Set up real-time listeners for changes from other devices
        const vocabUnsub = firestoreSync.subscribeToVocabulary(userId, (words) => {
          // Update local store when cloud data changes
          // This is triggered by changes from other devices
          if (hasInitialSyncedRef.current) {
            // Check if this update is from a recent local modification
            const now = Date.now();
            const lastLocalMod = lastLocalModificationRef.current.vocabulary || 0;
            const timeSinceLastMod = now - lastLocalMod;

            // If we modified locally within the last 2 seconds, ignore this cloud update
            // It's likely just our own change echoing back from Firestore
            if (timeSinceLastMod < 2000) {
              console.log('[Sync] Ignoring vocabulary cloud update - recent local modification');
              return;
            }

            // Set flag to prevent sync loop
            isProcessingCloudUpdateRef.current = true;

            console.log('[Sync] Applying vocabulary update from cloud:', words.length, 'words');
            // Use setWords to preserve all word data including SRS progress
            vocabularyStore.setWords(words);

            // Clear flag after a short delay to allow state to settle
            setTimeout(() => {
              isProcessingCloudUpdateRef.current = false;
            }, 100);
          }
        });

        const bookmarksUnsub = firestoreSync.subscribeToBookmarks(userId, (bookmarks) => {
          if (hasInitialSyncedRef.current) {
            // Check if this update is from a recent local modification
            const now = Date.now();
            const lastLocalMod = lastLocalModificationRef.current.bookmarks || 0;
            const timeSinceLastMod = now - lastLocalMod;

            // If we modified locally within the last 2 seconds, ignore this cloud update
            if (timeSinceLastMod < 2000) {
              console.log('[Sync] Ignoring bookmarks cloud update - recent local modification');
              return;
            }

            isProcessingCloudUpdateRef.current = true;

            console.log('[Sync] Applying bookmarks update from cloud:', bookmarks.length, 'bookmarks');
            bookmarkStore.clearAllBookmarks();
            bookmarks.forEach((bookmark) => {
              bookmarkStore.addBookmark(bookmark.verseRef, bookmark.note);
            });

            setTimeout(() => {
              isProcessingCloudUpdateRef.current = false;
            }, 100);
          }
        });

        const historyUnsub = firestoreSync.subscribeToHistory(userId, (entries) => {
          if (hasInitialSyncedRef.current) {
            // Check if this update is from a recent local modification
            const now = Date.now();
            const lastLocalMod = lastLocalModificationRef.current.history || 0;
            const timeSinceLastMod = now - lastLocalMod;

            // If we modified locally within the last 2 seconds, ignore this cloud update
            if (timeSinceLastMod < 2000) {
              console.log('[Sync] Ignoring history cloud update - recent local modification');
              return;
            }

            isProcessingCloudUpdateRef.current = true;

            console.log('[Sync] Applying history update from cloud:', entries.length, 'entries');
            historyStore.clearHistory();
            entries.forEach((entry) => {
              historyStore.pushEntry(entry.bookId, entry.chapter);
            });

            setTimeout(() => {
              isProcessingCloudUpdateRef.current = false;
            }, 100);
          }
        });

        const settingsUnsub = firestoreSync.subscribeToSettings(userId, (settings) => {
          if (hasInitialSyncedRef.current) {
            // Check if this update is from a recent local modification
            const now = Date.now();
            const lastLocalMod = lastLocalModificationRef.current.settings || 0;
            const timeSinceLastMod = now - lastLocalMod;

            // If we modified locally within the last 2 seconds, ignore this cloud update
            if (timeSinceLastMod < 2000) {
              console.log('[Sync] Ignoring settings cloud update - recent local modification');
              return;
            }

            isProcessingCloudUpdateRef.current = true;
            console.log('[Sync] Applying settings update from cloud');
            Object.assign(settingsStore, settings);
            setTimeout(() => {
              isProcessingCloudUpdateRef.current = false;
            }, 100);
          }
        });

        const readingPlansUnsub = firestoreSync.subscribeToReadingPlans(userId, (data) => {
          if (hasInitialSyncedRef.current) {
            // Check if this update is from a recent local modification
            const now = Date.now();
            const lastLocalMod = lastLocalModificationRef.current.readingPlans || 0;
            const timeSinceLastMod = now - lastLocalMod;

            // If we modified locally within the last 2 seconds, ignore this cloud update
            if (timeSinceLastMod < 2000) {
              console.log('[Sync] Ignoring reading plans cloud update - recent local modification');
              return;
            }

            isProcessingCloudUpdateRef.current = true;
            console.log('[Sync] Applying reading plans update from cloud');
            useReadingPlansStore.setState({
              activePlan: data.activePlan,
              completedPlans: data.completedPlans || [],
            });
            setTimeout(() => {
              isProcessingCloudUpdateRef.current = false;
            }, 100);
          }
        });

        const progressUnsub = firestoreSync.subscribeToProgress(userId, (data) => {
          if (hasInitialSyncedRef.current) {
            // Check if this update is from a recent local modification
            const now = Date.now();
            const lastLocalMod = lastLocalModificationRef.current.progress || 0;
            const timeSinceLastMod = now - lastLocalMod;

            // If we modified locally within the last 2 seconds, ignore this cloud update
            if (timeSinceLastMod < 2000) {
              console.log('[Sync] Ignoring progress cloud update - recent local modification');
              return;
            }

            isProcessingCloudUpdateRef.current = true;
            console.log('[Sync] Applying progress update from cloud');
            useProgressStore.setState({
              chaptersCompleted: data.chaptersCompleted || [],
              bookProgress: data.bookProgress || {},
              streak: data.streak || {
                currentStreak: 0,
                longestStreak: 0,
                lastReadDate: null,
                streakStartDate: null,
              },
              dailyHistory: data.dailyHistory || [],
            });
            setTimeout(() => {
              isProcessingCloudUpdateRef.current = false;
            }, 100);
          }
        });

        unsubscribersRef.current = [vocabUnsub, bookmarksUnsub, historyUnsub, settingsUnsub, readingPlansUnsub, progressUnsub];

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

  // Set up Zustand store subscriptions for reliable change detection
  // This syncs local changes TO the cloud
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const userId = user.uid;

    // Debounced sync function to avoid rapid-fire updates
    const debouncedSync = (
      key: 'vocabulary' | 'bookmarks' | 'history' | 'settings' | 'readingPlans' | 'progress',
      syncFn: () => Promise<void>
    ) => {
      // Record the time of this local modification
      lastLocalModificationRef.current[key] = Date.now();

      // Clear any pending sync for this key
      if (syncTimeoutRef.current[key]) {
        clearTimeout(syncTimeoutRef.current[key]);
      }

      // Schedule new sync after debounce delay
      syncTimeoutRef.current[key] = setTimeout(async () => {
        // Don't sync if we haven't completed initial sync or are processing cloud updates
        if (!hasInitialSyncedRef.current || isProcessingCloudUpdateRef.current) {
          return;
        }

        try {
          console.log(`[Sync] Syncing ${key} to cloud...`);
          await syncFn();
          console.log(`[Sync] Successfully synced ${key} to cloud`);
        } catch (error) {
          console.error(`Error syncing ${key} to cloud:`, error);
        }
      }, 500); // 500ms debounce
    };

    // Subscribe to vocabulary store changes using Zustand's subscribeWithSelector
    const unsubVocab = useVocabularyStore.subscribe(
      (state) => state.words,
      (words, prevWords) => {
        // Sync if words changed (add/remove or SRS update)
        // Compare by length first, then by updatedAt timestamps to catch SRS changes
        const wordsChanged =
          words.length !== prevWords.length ||
          JSON.stringify(words.map((w) => ({ id: w.id, updatedAt: w.updatedAt })).sort((a, b) => a.id.localeCompare(b.id))) !==
            JSON.stringify(prevWords.map((w) => ({ id: w.id, updatedAt: w.updatedAt })).sort((a, b) => a.id.localeCompare(b.id)));

        if (wordsChanged) {
          debouncedSync('vocabulary', () => firestoreSync.syncVocabularyToCloud(userId, words));
        }
      },
      { equalityFn: (a, b) => a === b }
    );

    // Subscribe to bookmark store changes
    const unsubBookmarks = useBookmarkStore.subscribe(
      (state) => state.bookmarks,
      (bookmarks, prevBookmarks) => {
        if (
          bookmarks.length !== prevBookmarks.length ||
          JSON.stringify(bookmarks.map((b) => b.id).sort()) !==
            JSON.stringify(prevBookmarks.map((b) => b.id).sort())
        ) {
          debouncedSync('bookmarks', () =>
            firestoreSync.syncBookmarksToCloud(userId, bookmarks)
          );
        }
      },
      { equalityFn: (a, b) => a === b }
    );

    // Subscribe to history store changes
    const unsubHistory = useHistoryStore.subscribe(
      (state) => state.entries,
      (entries, prevEntries) => {
        if (entries.length !== prevEntries.length) {
          debouncedSync('history', () => firestoreSync.syncHistoryToCloud(userId, entries));
        }
      },
      { equalityFn: (a, b) => a === b }
    );

    // Subscribe to settings store changes
    const unsubSettings = useSettingsStore.subscribe(
      (state) => ({
        theme: state.theme,
        fontFamily: state.fontFamily,
        textSize: state.textSize,
        pinyinLevel: state.pinyinLevel,
        pinyinDisplay: state.pinyinDisplay,
        characterSet: state.characterSet,
        showHskIndicators: state.showHskIndicators,
        chineseVersion: state.chineseVersion,
        englishVersion: state.englishVersion,
        audioSpeed: state.audioSpeed,
        lastReadingPosition: state.lastReadingPosition,
      }),
      (settings) => {
        debouncedSync('settings', () => firestoreSync.syncSettingsToCloud(userId, settings));
      },
      { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
    );

    // Subscribe to reading plans store changes
    const unsubReadingPlans = useReadingPlansStore.subscribe(
      (state) => ({
        activePlan: state.activePlan,
        completedPlans: state.completedPlans,
      }),
      (data, prevData) => {
        // Check if data actually changed
        if (
          JSON.stringify(data.activePlan) !== JSON.stringify(prevData.activePlan) ||
          JSON.stringify(data.completedPlans) !== JSON.stringify(prevData.completedPlans)
        ) {
          debouncedSync('readingPlans', () =>
            firestoreSync.syncReadingPlansToCloud(userId, data)
          );
        }
      },
      { equalityFn: (a, b) => a === b }
    );

    // Subscribe to progress store changes
    const unsubProgress = useProgressStore.subscribe(
      (state) => ({
        chaptersCompleted: state.chaptersCompleted,
        bookProgress: state.bookProgress,
        streak: state.streak,
        dailyHistory: state.dailyHistory,
      }),
      (data, prevData) => {
        // Check if data actually changed (compare lengths and key stats)
        const changed =
          data.chaptersCompleted.length !== prevData.chaptersCompleted.length ||
          Object.keys(data.bookProgress).length !== Object.keys(prevData.bookProgress).length ||
          data.streak.currentStreak !== prevData.streak.currentStreak ||
          data.streak.lastReadDate !== prevData.streak.lastReadDate ||
          data.dailyHistory.length !== prevData.dailyHistory.length;

        if (changed) {
          debouncedSync('progress', () =>
            firestoreSync.syncProgressToCloud(userId, data)
          );
        }
      },
      { equalityFn: (a, b) => a === b }
    );

    // Cleanup subscriptions
    return () => {
      unsubVocab();
      unsubBookmarks();
      unsubHistory();
      unsubSettings();
      unsubReadingPlans();
      unsubProgress();
    };
  }, [isAuthenticated, user?.uid]);
}
