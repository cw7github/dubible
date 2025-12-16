import { firestoreSync } from './firebaseSync';
import type { ReadingPlansData, ProgressData } from './firebaseSync';
import type { SavedWord } from '../types/vocabulary';
import type { Bookmark } from '../stores/bookmarkStore';
import type { PassageEntry } from '../stores/historyStore';
import type { Settings } from '../types';

// Local storage keys used by the app
const STORAGE_KEYS = {
  vocabulary: 'bilingual-bible-vocabulary',
  bookmarks: 'bilingual-bible-bookmarks',
  history: 'passage-history-storage',
  settings: 'bilingual-bible-settings',
  readingPlans: 'reading-plans-storage',
  progress: 'reading-progress-storage',
  migrationFlag: 'bilingual-bible-migration-complete',
};

interface LocalStorageData {
  vocabulary: SavedWord[];
  bookmarks: Bookmark[];
  history: PassageEntry[];
  settings: Settings | null;
  readingPlans: ReadingPlansData | null;
  progress: ProgressData | null;
}

// Read data from localStorage
function readLocalStorageData(): LocalStorageData {
  const vocabulary: SavedWord[] = [];
  const bookmarks: Bookmark[] = [];
  const history: PassageEntry[] = [];
  let settings: Settings | null = null;
  let readingPlans: ReadingPlansData | null = null;
  let progress: ProgressData | null = null;

  try {
    // Vocabulary
    const vocabData = localStorage.getItem(STORAGE_KEYS.vocabulary);
    if (vocabData) {
      const parsed = JSON.parse(vocabData);
      if (parsed.state && Array.isArray(parsed.state.words)) {
        vocabulary.push(...parsed.state.words);
      }
    }

    // Bookmarks
    const bookmarksData = localStorage.getItem(STORAGE_KEYS.bookmarks);
    if (bookmarksData) {
      const parsed = JSON.parse(bookmarksData);
      if (parsed.state && Array.isArray(parsed.state.bookmarks)) {
        bookmarks.push(...parsed.state.bookmarks);
      }
    }

    // History
    const historyData = localStorage.getItem(STORAGE_KEYS.history);
    if (historyData) {
      const parsed = JSON.parse(historyData);
      if (parsed.state && Array.isArray(parsed.state.entries)) {
        history.push(...parsed.state.entries);
      }
    }

    // Settings
    const settingsData = localStorage.getItem(STORAGE_KEYS.settings);
    if (settingsData) {
      const parsed = JSON.parse(settingsData);
      if (parsed.state) {
        settings = parsed.state as Settings;
      }
    }

    // Reading Plans
    const readingPlansData = localStorage.getItem(STORAGE_KEYS.readingPlans);
    if (readingPlansData) {
      const parsed = JSON.parse(readingPlansData);
      if (parsed.state) {
        readingPlans = {
          activePlan: parsed.state.activePlan || null,
          completedPlans: parsed.state.completedPlans || [],
        };
      }
    }

    // Progress
    const progressData = localStorage.getItem(STORAGE_KEYS.progress);
    if (progressData) {
      const parsed = JSON.parse(progressData);
      if (parsed.state) {
        progress = {
          chaptersCompleted: parsed.state.chaptersCompleted || [],
          bookProgress: parsed.state.bookProgress || {},
          streak: parsed.state.streak || {
            currentStreak: 0,
            longestStreak: 0,
            lastReadDate: null,
            streakStartDate: null,
          },
          dailyHistory: parsed.state.dailyHistory || [],
        };
      }
    }
  } catch (error) {
    console.error('Error reading localStorage data:', error);
  }

  return { vocabulary, bookmarks, history, settings, readingPlans, progress };
}

// Check if migration has already been completed for this user
function hasMigrated(uid: string): boolean {
  const migrationFlag = localStorage.getItem(STORAGE_KEYS.migrationFlag);
  if (!migrationFlag) return false;

  try {
    const migratedUsers = JSON.parse(migrationFlag);
    return Array.isArray(migratedUsers) && migratedUsers.includes(uid);
  } catch {
    return false;
  }
}

// Mark migration as complete for this user
function markMigrationComplete(uid: string): void {
  try {
    const migrationFlag = localStorage.getItem(STORAGE_KEYS.migrationFlag);
    let migratedUsers: string[] = [];

    if (migrationFlag) {
      migratedUsers = JSON.parse(migrationFlag);
      if (!Array.isArray(migratedUsers)) {
        migratedUsers = [];
      }
    }

    if (!migratedUsers.includes(uid)) {
      migratedUsers.push(uid);
      localStorage.setItem(STORAGE_KEYS.migrationFlag, JSON.stringify(migratedUsers));
    }
  } catch (error) {
    console.error('Error marking migration complete:', error);
  }
}

// Main migration function
export async function migrateLocalDataToFirestore(
  uid: string,
  onProgress?: (step: string, current: number, total: number) => void
): Promise<{
  success: boolean;
  migratedCounts: {
    vocabulary: number;
    bookmarks: number;
    history: number;
    settings: boolean;
    readingPlans: boolean;
    progress: boolean;
  };
  error?: string;
}> {
  // Check if already migrated
  if (hasMigrated(uid)) {
    return {
      success: true,
      migratedCounts: {
        vocabulary: 0,
        bookmarks: 0,
        history: 0,
        settings: false,
        readingPlans: false,
        progress: false,
      },
    };
  }

  try {
    // Read all data from localStorage
    const localData = readLocalStorageData();

    const totalSteps = 6;
    let currentStep = 0;

    // Migrate vocabulary
    currentStep++;
    onProgress?.('Migrating vocabulary...', currentStep, totalSteps);
    if (localData.vocabulary.length > 0) {
      await firestoreSync.syncVocabularyToCloud(uid, localData.vocabulary);
    }

    // Migrate bookmarks
    currentStep++;
    onProgress?.('Migrating bookmarks...', currentStep, totalSteps);
    if (localData.bookmarks.length > 0) {
      await firestoreSync.syncBookmarksToCloud(uid, localData.bookmarks);
    }

    // Migrate history
    currentStep++;
    onProgress?.('Migrating history...', currentStep, totalSteps);
    if (localData.history.length > 0) {
      await firestoreSync.syncHistoryToCloud(uid, localData.history);
    }

    // Migrate settings
    currentStep++;
    onProgress?.('Migrating settings...', currentStep, totalSteps);
    if (localData.settings) {
      await firestoreSync.syncSettingsToCloud(uid, localData.settings);
    }

    // Migrate reading plans
    currentStep++;
    onProgress?.('Migrating reading plans...', currentStep, totalSteps);
    if (localData.readingPlans) {
      await firestoreSync.syncReadingPlansToCloud(uid, localData.readingPlans);
    }

    // Migrate progress
    currentStep++;
    onProgress?.('Migrating progress...', currentStep, totalSteps);
    if (localData.progress) {
      await firestoreSync.syncProgressToCloud(uid, localData.progress);
    }

    // Mark migration as complete
    markMigrationComplete(uid);

    return {
      success: true,
      migratedCounts: {
        vocabulary: localData.vocabulary.length,
        bookmarks: localData.bookmarks.length,
        history: localData.history.length,
        settings: !!localData.settings,
        readingPlans: !!localData.readingPlans,
        progress: !!localData.progress,
      },
    };
  } catch (error) {
    console.error('Error migrating data to Firestore:', error);
    return {
      success: false,
      migratedCounts: {
        vocabulary: 0,
        bookmarks: 0,
        history: 0,
        settings: false,
        readingPlans: false,
        progress: false,
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Utility to merge cloud and local data (for conflict resolution)
export function mergeData<T extends { id?: string; createdAt?: number; timestamp?: number }>(
  cloudData: T[],
  localData: T[]
): T[] {
  const merged = new Map<string, T>();

  // Add cloud data first
  cloudData.forEach((item) => {
    const key =
      item.id || `${item.createdAt || item.timestamp || Date.now()}-${Math.random()}`;
    merged.set(key, item);
  });

  // Add local data, preferring newer items
  localData.forEach((item) => {
    const key =
      item.id || `${item.createdAt || item.timestamp || Date.now()}-${Math.random()}`;
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, item);
    } else {
      // Prefer the item with the latest timestamp
      const existingTime = existing.createdAt || existing.timestamp || 0;
      const itemTime = item.createdAt || item.timestamp || 0;

      if (itemTime > existingTime) {
        merged.set(key, item);
      }
    }
  });

  return Array.from(merged.values());
}
