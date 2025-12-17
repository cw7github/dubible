// Feedback service - handles submitting and retrieving user feedback

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import type { Feedback, FeedbackSubmission, FeedbackCategory } from '../types';

const FEEDBACK_COLLECTION = 'feedback';

// App version - update this with each release
const APP_VERSION = '1.0.0';

interface UserInfo {
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  userPhoto: string | null;
}

/**
 * Submit feedback to Firestore with timeout
 */
export async function submitFeedback(
  submission: FeedbackSubmission,
  userInfo: UserInfo
): Promise<string> {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase not configured');
  }

  console.log('[Feedback] Starting submission...', { category: submission.category });

  const feedbackData = {
    // User info from auth
    userId: userInfo.userId,
    userEmail: userInfo.userEmail,
    userName: userInfo.userName,
    userPhoto: userInfo.userPhoto,
    // Contact email (use provided one or fall back to auth email)
    contactEmail: submission.contactEmail || userInfo.userEmail,
    // Feedback content
    message: submission.message,
    category: submission.category,
    // Device/app context
    appVersion: APP_VERSION,
    userAgent: navigator.userAgent,
    currentPage: window.location.pathname,
    // Timestamps (use server timestamp for accuracy)
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    // Admin fields
    status: 'new' as const,
    response: null,
    respondedAt: null,
    respondedBy: null,
  };

  // Add timeout to prevent infinite hang
  const timeoutMs = 15000;
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Feedback submission timed out after ${timeoutMs / 1000}s`)), timeoutMs);
  });

  try {
    const docRef = await Promise.race([
      addDoc(collection(db, FEEDBACK_COLLECTION), feedbackData),
      timeoutPromise,
    ]);
    console.log('[Feedback] Submitted successfully:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('[Feedback] Submission failed:', error);
    throw error;
  }
}

/**
 * Get feedback submitted by a specific user (to show them responses)
 */
export async function getUserFeedback(userId: string): Promise<Feedback[]> {
  if (!isFirebaseConfigured || !db) {
    return [];
  }

  const feedbackRef = collection(db, FEEDBACK_COLLECTION);
  const q = query(
    feedbackRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      // Convert Firestore timestamps to numbers
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : data.updatedAt,
      respondedAt: data.respondedAt instanceof Timestamp ? data.respondedAt.toMillis() : data.respondedAt,
    } as Feedback;
  });
}

/**
 * Get a single feedback item by ID
 */
export async function getFeedbackById(feedbackId: string): Promise<Feedback | null> {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  const docRef = doc(db, FEEDBACK_COLLECTION, feedbackId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : data.updatedAt,
    respondedAt: data.respondedAt instanceof Timestamp ? data.respondedAt.toMillis() : data.respondedAt,
  } as Feedback;
}

/**
 * Check if user has any unread responses
 */
export async function hasUnreadResponses(userId: string): Promise<boolean> {
  if (!isFirebaseConfigured || !db) {
    return false;
  }

  const feedbackRef = collection(db, FEEDBACK_COLLECTION);
  const q = query(
    feedbackRef,
    where('userId', '==', userId),
    where('response', '!=', null),
    where('status', '==', 'resolved')
  );

  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

// Category labels for display
export const FEEDBACK_CATEGORIES: { value: FeedbackCategory; label: string; emoji: string }[] = [
  { value: 'bug', label: 'Bug Report', emoji: '🐛' },
  { value: 'feature', label: 'Feature Request', emoji: '💡' },
  { value: 'question', label: 'Question', emoji: '❓' },
  { value: 'other', label: 'Other', emoji: '💬' },
];
