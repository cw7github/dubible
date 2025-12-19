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
import type { SavedWord } from '../types/vocabulary';
import type { Bookmark } from '../stores/bookmarkStore';

const vocabSignature = (words: Array<{ id: string; updatedAt?: number }>): string =>
  JSON.stringify(
    words
      .map((w) => ({ id: w.id, updatedAt: w.updatedAt ?? 0 }))
      .sort((a, b) => a.id.localeCompare(b.id))
  );

const buildUpdatedAtIndex = (items: Array<{ id: string; updatedAt?: number }>): Map<string, number> => {
  const index = new Map<string, number>();
  items.forEach((item) => {
    index.set(item.id, item.updatedAt ?? 0);
  });
  return index;
};

const bookmarkSignature = (bookmark: Bookmark): string => {
  const note = bookmark.note ?? '';
  const verseRef = bookmark.verseRef;
  return `${bookmark.createdAt}|${verseRef.bookId}:${verseRef.chapter}:${verseRef.verse}|${note}`;
};

const buildBookmarkIndex = (bookmarks: Bookmark[]): Map<string, string> => {
  const index = new Map<string, string>();
  bookmarks.forEach((bookmark) => {
    index.set(bookmark.id, bookmarkSignature(bookmark));
  });
  return index;
};

const computeVocabularyMutations = (
  words: SavedWord[],
  lastSyncedIndex: Map<string, number>
): { upserts: SavedWord[]; deletes: string[] } => {
  const upserts: SavedWord[] = [];
  const currentIds = new Set<string>();

  for (const word of words) {
    currentIds.add(word.id);
    const lastSyncedUpdatedAt = lastSyncedIndex.get(word.id);
    if (lastSyncedUpdatedAt === undefined || lastSyncedUpdatedAt !== word.updatedAt) {
      upserts.push(word);
    }
  }

  const deletes: string[] = [];
  for (const previousId of lastSyncedIndex.keys()) {
    if (!currentIds.has(previousId)) {
      deletes.push(previousId);
    }
  }

  return { upserts, deletes };
};

const computeBookmarkMutations = (
  bookmarks: Bookmark[],
  lastSyncedIndex: Map<string, string>
): { upserts: Bookmark[]; deletes: string[] } => {
  const upserts: Bookmark[] = [];
  const currentIds = new Set<string>();

  for (const bookmark of bookmarks) {
    currentIds.add(bookmark.id);
    const lastSig = lastSyncedIndex.get(bookmark.id);
    const nextSig = bookmarkSignature(bookmark);
    if (lastSig === undefined || lastSig !== nextSig) {
      upserts.push(bookmark);
    }
  }

  const deletes: string[] = [];
  for (const previousId of lastSyncedIndex.keys()) {
    if (!currentIds.has(previousId)) {
      deletes.push(previousId);
    }
  }

  return { upserts, deletes };
};

// Wait for vocabulary store to be hydrated from localStorage
// This prevents race conditions where sync runs before local data is loaded
const waitForVocabularyHydration = (): Promise<void> => {
  return new Promise((resolve) => {
    // Check if already hydrated
    if (useVocabularyStore.getState()._hasHydrated) {
      console.log('[Sync] Vocabulary store already hydrated');
      resolve();
      return;
    }

    // Wait for hydration to complete
    console.log('[Sync] Waiting for vocabulary store hydration...');
    const unsubscribe = useVocabularyStore.subscribe(
      (state) => state._hasHydrated,
      (hasHydrated) => {
        if (hasHydrated) {
          console.log('[Sync] Vocabulary store hydration detected');
          unsubscribe();
          resolve();
        }
      }
    );

    // Timeout fallback after 3 seconds (in case hydration never fires)
    setTimeout(() => {
      console.warn('[Sync] Hydration timeout - proceeding anyway');
      unsubscribe();
      resolve();
    }, 3000);
  });
};

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

  // Prevent duplicate sync setup (StrictMode double-invocation protection)
  const setupInProgressRef = useRef(false);

  // Tracks whether we successfully ensured cloud vocabulary is in sync this session.
  // Used to avoid destructive empty-cloud overwrites before we've ever written/confirmed cloud state.
  const initialVocabCloudSyncOkRef = useRef(false);

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

  // Tracks what we believe is currently persisted in Firestore for diff-based syncing.
  // This avoids full collection rewrites and prevents dropping changes when debouncing.
  const lastSyncedVocabIndexRef = useRef<Map<string, number>>(new Map());
  const pendingVocabWordsRef = useRef<SavedWord[]>([]);

  const lastSyncedBookmarksIndexRef = useRef<Map<string, string>>(new Map());
  const pendingBookmarksRef = useRef<Bookmark[]>([]);

  // Cleanup function
  const cleanup = () => {
    unsubscribersRef.current.forEach((unsub) => unsub());
    unsubscribersRef.current = [];
    hasInitialSyncedRef.current = false;
    initialVocabCloudSyncOkRef.current = false;
    lastSyncedVocabIndexRef.current = new Map();
    pendingVocabWordsRef.current = [];
    lastSyncedBookmarksIndexRef.current = new Map();
    pendingBookmarksRef.current = [];

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
      // Prevent duplicate execution in StrictMode (React 18+ double-invocation)
      if (setupInProgressRef.current) {
        console.log('[Sync] Setup already in progress, skipping duplicate call');
        return;
      }
      setupInProgressRef.current = true;

      try {
        setSyncing(true);

        // CRITICAL: Wait for Zustand stores to rehydrate from localStorage
        // This prevents the race condition where we sync before local data is loaded
        await waitForVocabularyHydration();
        console.log('[Sync] Store hydration complete, proceeding with sync setup');

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
        // CRITICAL: At this point, Zustand hydration should be complete
        // Read current store state - this should now have localStorage data loaded
        let localVocab = useVocabularyStore.getState().words;
        let localBookmarks = bookmarkStore.bookmarks;
        let localHistory = historyStore.entries;

        console.log(`[Sync] Store state after hydration: vocab=${localVocab.length}, bookmarks=${localBookmarks.length}, history=${localHistory.length}`);
        console.log(`[Sync] Cloud state: vocab=${cloudVocab.length}, bookmarks=${cloudBookmarks.length}, history=${cloudHistory.length}`);

        // DEFENSIVE CHECK: If local store is empty but localStorage has data,
        // it means Zustand hasn't rehydrated yet (race condition)
        // Read directly from localStorage as fallback
        if (localVocab.length === 0) {
          const vocabStorage = localStorage.getItem('bilingual-bible-vocabulary');
          if (vocabStorage) {
            try {
              const parsed = JSON.parse(vocabStorage);
              if (parsed.state?.words && Array.isArray(parsed.state.words) && parsed.state.words.length > 0) {
                console.warn(`[Sync] RACE CONDITION: Store empty but localStorage has ${parsed.state.words.length} words. Using localStorage.`);
                localVocab = parsed.state.words;
              }
            } catch (e) {
              console.error('[Sync] Error parsing localStorage vocabulary:', e);
            }
          }
        }

        if (localBookmarks.length === 0) {
          const bookmarkStorage = localStorage.getItem('bilingual-bible-bookmarks');
          if (bookmarkStorage) {
            try {
              const parsed = JSON.parse(bookmarkStorage);
              if (parsed.state?.bookmarks && Array.isArray(parsed.state.bookmarks) && parsed.state.bookmarks.length > 0) {
                console.warn(`[Sync] RACE CONDITION: Store empty but localStorage has ${parsed.state.bookmarks.length} bookmarks. Using localStorage.`);
                localBookmarks = parsed.state.bookmarks;
              }
            } catch (e) {
              console.error('[Sync] Error parsing localStorage bookmarks:', e);
            }
          }
        }

        if (localHistory.length === 0) {
          const historyStorage = localStorage.getItem('passage-history-storage');
          if (historyStorage) {
            try {
              const parsed = JSON.parse(historyStorage);
              if (parsed.state?.entries && Array.isArray(parsed.state.entries) && parsed.state.entries.length > 0) {
                console.warn(`[Sync] RACE CONDITION: Store empty but localStorage has ${parsed.state.entries.length} history entries. Using localStorage.`);
                localHistory = parsed.state.entries;
              }
            } catch (e) {
              console.error('[Sync] Error parsing localStorage history:', e);
            }
          }
        }

        console.log(`[Sync] After fallback check: vocab=${localVocab.length}, bookmarks=${localBookmarks.length}, history=${localHistory.length}`);

        const mergedVocab = mergeData(cloudVocab, localVocab);
        const mergedBookmarks = mergeData(cloudBookmarks, localBookmarks);
        const mergedHistory = mergeData(cloudHistory, localHistory);

        console.log(`[Sync] After merge: vocab=${mergedVocab.length}, bookmarks=${mergedBookmarks.length}, history=${mergedHistory.length}`);

        // ADDITIONAL SAFETY: If merged result is empty but localStorage had data,
        // something went wrong - don't overwrite with empty data
        if (mergedVocab.length === 0 && localVocab.length > 0) {
          console.error('[Sync] ERROR: Merge resulted in empty vocabulary despite local data. Using local data only.');
          mergedVocab.push(...localVocab);
        }
        if (mergedBookmarks.length === 0 && localBookmarks.length > 0) {
          console.error('[Sync] ERROR: Merge resulted in empty bookmarks despite local data. Using local data only.');
          mergedBookmarks.push(...localBookmarks);
        }
        if (mergedHistory.length === 0 && localHistory.length > 0) {
          console.error('[Sync] ERROR: Merge resulted in empty history despite local data. Using local data only.');
          mergedHistory.push(...localHistory);
        }

        // Step 4: Update local stores with merged data
        // Set flag to prevent sync loop during initial load
        isProcessingCloudUpdateRef.current = true;

        // Use setWords to preserve all word data including SRS progress
        vocabularyStore.setWords(mergedVocab);

        bookmarkStore.setBookmarks(mergedBookmarks);

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

        // Step 4.5: Ensure Firestore reflects the merged vocabulary before listeners can overwrite local state.
        // This is critical for the "words added while unauthenticated" case where cloud may be empty/stale.
        try {
          const cloudSig = vocabSignature(cloudVocab);
          const mergedSig = vocabSignature(mergedVocab);
          if (cloudSig !== mergedSig) {
            console.log(`[Sync] Cloud vocabulary differs from merged; syncing merged vocabulary to cloud (${mergedVocab.length} words)`);
            const cloudIndex = buildUpdatedAtIndex(cloudVocab);
            const { upserts, deletes } = computeVocabularyMutations(mergedVocab, cloudIndex);
            await firestoreSync.applyVocabularyMutations(userId, { upserts, deletes });
          }
          initialVocabCloudSyncOkRef.current = true;
        } catch (error) {
          initialVocabCloudSyncOkRef.current = false;
          console.error('[Sync] Failed to sync merged vocabulary to cloud; preserving local state', error);
        }

        // Prime diff-based sync baselines after initial reconciliation.
        // If cloud sync failed, keep the baseline as the last known cloud state so we can retry later.
        pendingVocabWordsRef.current = mergedVocab;
        lastSyncedVocabIndexRef.current = initialVocabCloudSyncOkRef.current
          ? buildUpdatedAtIndex(mergedVocab)
          : buildUpdatedAtIndex(cloudVocab);

        pendingBookmarksRef.current = mergedBookmarks;
        lastSyncedBookmarksIndexRef.current = buildBookmarkIndex(cloudBookmarks);

        // Step 5: Set up real-time listeners for changes from other devices
        const vocabUnsub = firestoreSync.subscribeToVocabulary(userId, (words) => {
          // Safety: Never let an empty cloud snapshot wipe non-empty local state before we've ever
          // successfully reconciled vocabulary to the cloud in this session.
          if (!initialVocabCloudSyncOkRef.current) {
            const localWords = useVocabularyStore.getState().words;
            if (words.length === 0 && localWords.length > 0) {
              console.warn(
                `[Sync] Ignoring empty vocabulary cloud update before initial cloud sync (local=${localWords.length})`
              );
              return;
            }
          }

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
            const localWords = useVocabularyStore.getState().words;
            if (vocabSignature(localWords) === vocabSignature(words)) {
              isProcessingCloudUpdateRef.current = false;
              return;
            }
            // Use setWords to preserve all word data including SRS progress
            vocabularyStore.setWords(words);
            pendingVocabWordsRef.current = words;
            lastSyncedVocabIndexRef.current = buildUpdatedAtIndex(words);

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
            bookmarkStore.setBookmarks(bookmarks);
            pendingBookmarksRef.current = bookmarks;
            lastSyncedBookmarksIndexRef.current = buildBookmarkIndex(bookmarks);

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
      } finally {
        // Reset flag so sync can be retried if needed
        setupInProgressRef.current = false;
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

    const syncVocabularyToCloudDiff = async (): Promise<void> => {
      const words = pendingVocabWordsRef.current;
      const lastSyncedIndex = lastSyncedVocabIndexRef.current;

      // Safety: Never let an unexpected local wipe delete the entire cloud collection.
      // If local state becomes empty unexpectedly, keep cloud intact and allow the cloud listener to restore local state.
      if (words.length === 0 && lastSyncedIndex.size > 0) {
        console.warn('[Sync] Detected empty local vocabulary; skipping cloud deletions to protect data');
        return;
      }

      const { upserts, deletes } = computeVocabularyMutations(words, lastSyncedIndex);
      if (upserts.length === 0 && deletes.length === 0) return;

      await firestoreSync.applyVocabularyMutations(userId, { upserts, deletes });
      lastSyncedVocabIndexRef.current = buildUpdatedAtIndex(words);
    };

    const syncBookmarksToCloudDiff = async (): Promise<void> => {
      const bookmarks = pendingBookmarksRef.current;
      const lastSyncedIndex = lastSyncedBookmarksIndexRef.current;
      const { upserts, deletes } = computeBookmarkMutations(bookmarks, lastSyncedIndex);
      if (upserts.length === 0 && deletes.length === 0) return;

      await firestoreSync.applyBookmarkMutations(userId, { upserts, deletes });
      lastSyncedBookmarksIndexRef.current = buildBookmarkIndex(bookmarks);
    };

    // Debounced sync function to avoid rapid-fire updates
    const debouncedSync = (
      key: 'vocabulary' | 'bookmarks' | 'history' | 'settings' | 'readingPlans' | 'progress',
      syncFn: () => Promise<void>
    ) => {
      // Don't schedule syncs until initial sync is complete, and never echo cloud-origin changes.
      if (!hasInitialSyncedRef.current || isProcessingCloudUpdateRef.current) {
        return;
      }

      // Record the time of this local modification
      lastLocalModificationRef.current[key] = Date.now();

      // Clear any pending sync for this key
      if (syncTimeoutRef.current[key]) {
        clearTimeout(syncTimeoutRef.current[key]);
      }

      // Schedule new sync after debounce delay
      syncTimeoutRef.current[key] = setTimeout(async () => {
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
          pendingVocabWordsRef.current = words;
          // If word was ADDED (length increased), sync IMMEDIATELY without debounce
          // This prevents data loss if user refreshes before debounce completes
          if (words.length > prevWords.length) {
            if (hasInitialSyncedRef.current && !isProcessingCloudUpdateRef.current) {
              console.log('[Sync] Word added, syncing immediately');
              lastLocalModificationRef.current.vocabulary = Date.now();
              syncVocabularyToCloudDiff()
                .then(() => console.log('[Sync] Immediate vocabulary sync complete'))
                .catch(err => console.error('[Sync] Immediate vocabulary sync failed:', err));
            }
          } else {
            // For updates/deletions, use debounced sync
            debouncedSync('vocabulary', syncVocabularyToCloudDiff);
          }
        }
      },
      { equalityFn: (a, b) => a === b }
    );

    // Subscribe to bookmark store changes
    const unsubBookmarks = useBookmarkStore.subscribe(
      (state) => state.bookmarks,
      (bookmarks, prevBookmarks) => {
        // Track the latest state so the debounced sync always applies the newest snapshot.
        pendingBookmarksRef.current = bookmarks;

        const signature = JSON.stringify(
          bookmarks
            .map((b) => ({ id: b.id, note: b.note ?? '', createdAt: b.createdAt }))
            .sort((a, b) => a.id.localeCompare(b.id))
        );
        const prevSignature = JSON.stringify(
          prevBookmarks
            .map((b) => ({ id: b.id, note: b.note ?? '', createdAt: b.createdAt }))
            .sort((a, b) => a.id.localeCompare(b.id))
        );

        if (signature !== prevSignature) {
          debouncedSync('bookmarks', syncBookmarksToCloudDiff);
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
        ambientMusicEnabled: state.ambientMusicEnabled,
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
