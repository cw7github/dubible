// Feedback API - Admin endpoint for viewing and responding to user feedback
// This endpoint requires FEEDBACK_ADMIN_SECRET to be set in Vercel env

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const FEEDBACK_COLLECTION = 'feedback';

// Get Bearer token from request
function getBearerToken(req: any): string | null {
  const authHeader = req.headers?.authorization;
  if (typeof authHeader !== 'string') return null;
  const trimmed = authHeader.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) return null;
  const token = trimmed.slice(7).trim();
  return token.length > 0 ? token : null;
}

// Verify admin secret
function verifyAdmin(req: any): { valid: boolean; debug: string } {
  const adminSecret = process.env.FEEDBACK_ADMIN_SECRET;

  if (!adminSecret) {
    return { valid: false, debug: 'FEEDBACK_ADMIN_SECRET not set in environment' };
  }

  const token = getBearerToken(req);
  if (!token) {
    return { valid: false, debug: 'No Bearer token provided' };
  }

  if (token !== adminSecret) {
    return {
      valid: false,
      debug: `Token mismatch (token length: ${token.length}, expected length: ${adminSecret.length})`
    };
  }

  return { valid: true, debug: 'OK' };
}

// Initialize Firebase Admin lazily
let db: ReturnType<typeof getFirestore> | null = null;

function getDb() {
  if (db) return db;

  if (getApps().length === 0) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : null;

    if (serviceAccount) {
      initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      });
    }
  }

  db = getFirestore();
  return db;
}

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Verify admin access
  const authResult = verifyAdmin(req);
  if (!authResult.valid) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const firestore = getDb();

    if (req.method === 'GET') {
      // GET /api/feedback - List all feedback
      // Query params: status, category, limit, offset
      const { status, category, limit = '50', offset = '0' } = req.query || {};

      let query = firestore.collection(FEEDBACK_COLLECTION).orderBy('createdAt', 'desc');

      if (status && typeof status === 'string') {
        query = query.where('status', '==', status);
      }

      if (category && typeof category === 'string') {
        query = query.where('category', '==', category);
      }

      const snapshot = await query
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string))
        .get();

      const feedback = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : data.updatedAt,
          respondedAt: data.respondedAt instanceof Timestamp ? data.respondedAt.toMillis() : data.respondedAt,
        };
      });

      // Get total count
      const countSnapshot = await firestore.collection(FEEDBACK_COLLECTION).count().get();
      const totalCount = countSnapshot.data().count;

      res.status(200).json({
        feedback,
        total: totalCount,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });
      return;

    } else if (req.method === 'PATCH') {
      // PATCH /api/feedback - Update feedback (status, response)
      // Body: { id, status?, response? }
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          res.status(400).json({ error: 'Invalid JSON body' });
          return;
        }
      }

      const { id, status, response } = body || {};

      if (!id) {
        res.status(400).json({ error: 'Feedback ID required' });
        return;
      }

      const updates: Record<string, unknown> = {
        updatedAt: Timestamp.now(),
      };

      if (status) {
        updates.status = status;
      }

      if (response !== undefined) {
        updates.response = response;
        updates.respondedAt = Timestamp.now();
        updates.respondedBy = 'admin';
      }

      await firestore.collection(FEEDBACK_COLLECTION).doc(id).update(updates);

      res.status(200).json({ success: true, id });
      return;

    } else {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
  } catch (error) {
    console.error('Feedback API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
