import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { SavedWord } from '../types/vocabulary';
import type { Bookmark } from '../stores/bookmarkStore';
import type { PassageEntry } from '../stores/historyStore';
import type { Settings } from '../types';
import type { UserPlanProgress, ReadingStreak, DailyReading, BookProgress } from '../types/progress';

const MAX_BATCH_OPS = 450;

// Reading plans state for Firestore
export interface ReadingPlansData {
  activePlan: UserPlanProgress | null;
  completedPlans: string[];
}

// Progress state for Firestore
export interface ProgressData {
  chaptersCompleted: string[];
  bookProgress: Record<string, BookProgress>;
  streak: ReadingStreak;
  dailyHistory: DailyReading[];
}

// Firestore collection paths
const getUserPath = (uid: string) => `users/${uid}`;
const getVocabularyPath = (uid: string) => `${getUserPath(uid)}/vocabulary`;
const getBookmarksPath = (uid: string) => `${getUserPath(uid)}/bookmarks`;
const getHistoryPath = (uid: string) => `${getUserPath(uid)}/history`;
const getSettingsPath = (uid: string) => `${getUserPath(uid)}/settings`;
const getReadingPlansPath = (uid: string) => `${getUserPath(uid)}/readingPlans`;
const getProgressPath = (uid: string) => `${getUserPath(uid)}/progress`;

// Generic sync functions
export class FirestoreSync {
  private unsubscribers: Unsubscribe[] = [];

  // Clean up all listeners
  cleanup() {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
  }

  private static sanitizeFirestoreData<T extends object>(value: T): T {
    // Firestore rejects `undefined` values; remove them (shallow) before writes.
    const sanitized = { ...(value as Record<string, unknown>) } as Record<string, unknown>;
    Object.keys(sanitized).forEach((key) => {
      if (sanitized[key] === undefined) {
        delete sanitized[key];
      }
    });
    return sanitized as T;
  }

  // Vocabulary sync
  async syncVocabularyToCloud(uid: string, words: SavedWord[]): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const vocabPath = getVocabularyPath(uid);
    const vocabCollection = collection(db, vocabPath);

    // Get existing words from Firestore to find deletions
    const existingSnapshot = await getDocs(vocabCollection);
    const currentIds = new Set(words.map((w) => w.id));

    const batch = writeBatch(db);

    // Delete words that are no longer in the local list
    existingSnapshot.docs.forEach((docSnapshot) => {
      if (!currentIds.has(docSnapshot.id)) {
        batch.delete(docSnapshot.ref);
      }
    });

    // Add/update all current words
    words.forEach((word) => {
      const wordRef = doc(db, vocabPath, word.id);
      batch.set(wordRef, word);
    });

    await batch.commit();
  }

  async applyVocabularyMutations(
    uid: string,
    mutations: { upserts?: SavedWord[]; deletes?: string[] }
  ): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const vocabPath = getVocabularyPath(uid);
    const upserts = mutations.upserts ?? [];
    const deletes = mutations.deletes ?? [];
    if (upserts.length === 0 && deletes.length === 0) return;

    let batch = writeBatch(db);
    let opCount = 0;

    const commit = async () => {
      if (opCount === 0) return;
      await batch.commit();
      batch = writeBatch(db);
      opCount = 0;
    };

    for (const word of upserts) {
      const wordRef = doc(db, vocabPath, word.id);
      batch.set(wordRef, FirestoreSync.sanitizeFirestoreData(word));
      opCount += 1;
      if (opCount >= MAX_BATCH_OPS) {
        await commit();
      }
    }

    for (const wordId of deletes) {
      const wordRef = doc(db, vocabPath, wordId);
      batch.delete(wordRef);
      opCount += 1;
      if (opCount >= MAX_BATCH_OPS) {
        await commit();
      }
    }

    await commit();
  }

  async loadVocabularyFromCloud(uid: string): Promise<SavedWord[]> {
    if (!db) throw new Error('Firestore not initialized');

    const vocabPath = getVocabularyPath(uid);
    const vocabCollection = collection(db, vocabPath);
    const snapshot = await getDocs(vocabCollection);

    return snapshot.docs.map((docSnapshot) => ({
      ...(docSnapshot.data() as SavedWord),
      id: docSnapshot.id,
    }));
  }

  async addVocabularyWord(uid: string, word: SavedWord): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const wordRef = doc(db, getVocabularyPath(uid), word.id);
    await setDoc(wordRef, word);
  }

  async removeVocabularyWord(uid: string, wordId: string): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const wordRef = doc(db, getVocabularyPath(uid), wordId);
    await deleteDoc(wordRef);
  }

  async updateVocabularyWord(uid: string, word: SavedWord): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const wordRef = doc(db, getVocabularyPath(uid), word.id);
    await setDoc(wordRef, word, { merge: true });
  }

  subscribeToVocabulary(
    uid: string,
    callback: (words: SavedWord[]) => void
  ): Unsubscribe {
    if (!db) throw new Error('Firestore not initialized');

    const vocabCollection = collection(db, getVocabularyPath(uid));
    const q = query(vocabCollection);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const words = snapshot.docs.map((docSnapshot) => ({
        ...(docSnapshot.data() as SavedWord),
        id: docSnapshot.id,
      }));
      callback(words);
    });

    this.unsubscribers.push(unsubscribe);
    return unsubscribe;
  }

  // Bookmarks sync
  async syncBookmarksToCloud(uid: string, bookmarks: Bookmark[]): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const bookmarksPath = getBookmarksPath(uid);
    const bookmarksCollection = collection(db, bookmarksPath);

    // Get existing bookmarks from Firestore to find deletions
    const existingSnapshot = await getDocs(bookmarksCollection);
    const currentIds = new Set(bookmarks.map((b) => b.id));

    const batch = writeBatch(db);

    // Delete bookmarks that are no longer in the local list
    existingSnapshot.docs.forEach((docSnapshot) => {
      if (!currentIds.has(docSnapshot.id)) {
        batch.delete(docSnapshot.ref);
      }
    });

    // Add/update all current bookmarks
    bookmarks.forEach((bookmark) => {
      const bookmarkRef = doc(db, bookmarksPath, bookmark.id);
      batch.set(bookmarkRef, bookmark);
    });

    await batch.commit();
  }

  async applyBookmarkMutations(
    uid: string,
    mutations: { upserts?: Bookmark[]; deletes?: string[] }
  ): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const bookmarksPath = getBookmarksPath(uid);
    const upserts = mutations.upserts ?? [];
    const deletes = mutations.deletes ?? [];
    if (upserts.length === 0 && deletes.length === 0) return;

    let batch = writeBatch(db);
    let opCount = 0;

    const commit = async () => {
      if (opCount === 0) return;
      await batch.commit();
      batch = writeBatch(db);
      opCount = 0;
    };

    for (const bookmark of upserts) {
      const bookmarkRef = doc(db, bookmarksPath, bookmark.id);
      batch.set(bookmarkRef, FirestoreSync.sanitizeFirestoreData(bookmark));
      opCount += 1;
      if (opCount >= MAX_BATCH_OPS) {
        await commit();
      }
    }

    for (const bookmarkId of deletes) {
      const bookmarkRef = doc(db, bookmarksPath, bookmarkId);
      batch.delete(bookmarkRef);
      opCount += 1;
      if (opCount >= MAX_BATCH_OPS) {
        await commit();
      }
    }

    await commit();
  }

  async loadBookmarksFromCloud(uid: string): Promise<Bookmark[]> {
    if (!db) throw new Error('Firestore not initialized');

    const bookmarksCollection = collection(db, getBookmarksPath(uid));
    const snapshot = await getDocs(bookmarksCollection);

    return snapshot.docs.map((docSnapshot) => ({
      ...(docSnapshot.data() as Bookmark),
      id: docSnapshot.id,
    }));
  }

  async addBookmark(uid: string, bookmark: Bookmark): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const bookmarkRef = doc(db, getBookmarksPath(uid), bookmark.id);
    await setDoc(bookmarkRef, bookmark);
  }

  async removeBookmark(uid: string, bookmarkId: string): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const bookmarkRef = doc(db, getBookmarksPath(uid), bookmarkId);
    await deleteDoc(bookmarkRef);
  }

  subscribeToBookmarks(
    uid: string,
    callback: (bookmarks: Bookmark[]) => void
  ): Unsubscribe {
    if (!db) throw new Error('Firestore not initialized');

    const bookmarksCollection = collection(db, getBookmarksPath(uid));
    const q = query(bookmarksCollection);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookmarks = snapshot.docs.map((docSnapshot) => ({
        ...(docSnapshot.data() as Bookmark),
        id: docSnapshot.id,
      }));
      callback(bookmarks);
    });

    this.unsubscribers.push(unsubscribe);
    return unsubscribe;
  }

  // History sync
  async syncHistoryToCloud(uid: string, entries: PassageEntry[]): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const historyPath = getHistoryPath(uid);
    const historyCollection = collection(db, historyPath);

    // Get existing history entries from Firestore to find deletions
    const existingSnapshot = await getDocs(historyCollection);
    const currentIds = new Set(entries.map((_, index) => `entry-${index}`));

    const batch = writeBatch(db);

    // Delete history entries that are no longer in the local list
    existingSnapshot.docs.forEach((docSnapshot) => {
      if (!currentIds.has(docSnapshot.id)) {
        batch.delete(docSnapshot.ref);
      }
    });

    // Add/update all current history entries
    entries.forEach((entry, index) => {
      // Use index as ID for history entries since they don't have unique IDs
      const entryRef = doc(db, historyPath, `entry-${index}`);
      batch.set(entryRef, entry);
    });

    await batch.commit();
  }

  async loadHistoryFromCloud(uid: string): Promise<PassageEntry[]> {
    if (!db) throw new Error('Firestore not initialized');

    const historyCollection = collection(db, getHistoryPath(uid));
    const snapshot = await getDocs(historyCollection);

    return snapshot.docs
      .map((doc) => doc.data() as PassageEntry)
      .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp
  }

  subscribeToHistory(
    uid: string,
    callback: (entries: PassageEntry[]) => void
  ): Unsubscribe {
    if (!db) throw new Error('Firestore not initialized');

    const historyCollection = collection(db, getHistoryPath(uid));
    const q = query(historyCollection);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs
        .map((doc) => doc.data() as PassageEntry)
        .sort((a, b) => a.timestamp - b.timestamp);
      callback(entries);
    });

    this.unsubscribers.push(unsubscribe);
    return unsubscribe;
  }

  // Settings sync
  async syncSettingsToCloud(uid: string, settings: Settings): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const settingsRef = doc(db, getSettingsPath(uid), 'user_settings');
    await setDoc(settingsRef, settings);
  }

  async loadSettingsFromCloud(uid: string): Promise<Settings | null> {
    if (!db) throw new Error('Firestore not initialized');

    const settingsRef = doc(db, getSettingsPath(uid), 'user_settings');
    const snapshot = await getDoc(settingsRef);

    if (snapshot.exists()) {
      return snapshot.data() as Settings;
    }

    return null;
  }

  subscribeToSettings(uid: string, callback: (settings: Settings) => void): Unsubscribe {
    if (!db) throw new Error('Firestore not initialized');

    const settingsRef = doc(db, getSettingsPath(uid), 'user_settings');

    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as Settings);
      }
    });

    this.unsubscribers.push(unsubscribe);
    return unsubscribe;
  }

  // Reading Plans sync
  async syncReadingPlansToCloud(uid: string, data: ReadingPlansData): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const plansRef = doc(db, getReadingPlansPath(uid), 'user_plans');
    await setDoc(plansRef, data);
  }

  async loadReadingPlansFromCloud(uid: string): Promise<ReadingPlansData | null> {
    if (!db) throw new Error('Firestore not initialized');

    const plansRef = doc(db, getReadingPlansPath(uid), 'user_plans');
    const snapshot = await getDoc(plansRef);

    if (snapshot.exists()) {
      return snapshot.data() as ReadingPlansData;
    }

    return null;
  }

  subscribeToReadingPlans(
    uid: string,
    callback: (data: ReadingPlansData) => void
  ): Unsubscribe {
    if (!db) throw new Error('Firestore not initialized');

    const plansRef = doc(db, getReadingPlansPath(uid), 'user_plans');

    const unsubscribe = onSnapshot(plansRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as ReadingPlansData);
      }
    });

    this.unsubscribers.push(unsubscribe);
    return unsubscribe;
  }

  // Progress sync
  async syncProgressToCloud(uid: string, data: ProgressData): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const progressRef = doc(db, getProgressPath(uid), 'user_progress');
    await setDoc(progressRef, data);
  }

  async loadProgressFromCloud(uid: string): Promise<ProgressData | null> {
    if (!db) throw new Error('Firestore not initialized');

    const progressRef = doc(db, getProgressPath(uid), 'user_progress');
    const snapshot = await getDoc(progressRef);

    if (snapshot.exists()) {
      return snapshot.data() as ProgressData;
    }

    return null;
  }

  subscribeToProgress(uid: string, callback: (data: ProgressData) => void): Unsubscribe {
    if (!db) throw new Error('Firestore not initialized');

    const progressRef = doc(db, getProgressPath(uid), 'user_progress');

    const unsubscribe = onSnapshot(progressRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as ProgressData);
      }
    });

    this.unsubscribers.push(unsubscribe);
    return unsubscribe;
  }

  // User profile
  async updateUserProfile(
    uid: string,
    profile: {
      email: string | null;
      displayName: string | null;
      photoURL: string | null;
      lastSync: number;
    }
  ): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, profile, { merge: true });
  }
}

// Export singleton instance
export const firestoreSync = new FirestoreSync();
