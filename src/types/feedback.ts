// Feedback system types

export type FeedbackCategory = 'bug' | 'feature' | 'question' | 'other';
export type FeedbackStatus = 'new' | 'read' | 'in_progress' | 'resolved';

export interface FeedbackSubmission {
  message: string;
  category: FeedbackCategory;
  contactEmail?: string; // Optional for anonymous users
}

export interface Feedback {
  id: string;
  // User info (from Google auth if authenticated)
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  userPhoto: string | null;
  // Contact email (if user provided one, or from auth)
  contactEmail: string | null;
  // Feedback content
  message: string;
  category: FeedbackCategory;
  // Device/app context
  appVersion: string;
  userAgent: string;
  currentPage: string;
  // Timestamps
  createdAt: number;
  updatedAt: number;
  // Admin fields
  status: FeedbackStatus;
  response: string | null;
  respondedAt: number | null;
  respondedBy: string | null;
}

export interface FeedbackResponse {
  feedbackId: string;
  response: string;
  respondedAt: number;
  respondedBy: string;
}
