type VoiceGender = 'male' | 'female';

const GOOGLE_TTS_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';

const MAX_TEXT_LENGTH = 80;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_AUTH_REQUESTS = 120;
const RATE_LIMIT_ANON_REQUESTS = 30;

const tokenCache = new Map<string, { uid: string; expiresAt: number }>();
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const getClientIp = (req: any): string => {
  const header = req.headers?.['x-forwarded-for'];
  const forwardedFor = Array.isArray(header) ? header[0] : header;
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }
  const realIp = req.headers?.['x-real-ip'];
  if (typeof realIp === 'string' && realIp.length > 0) return realIp;
  return 'unknown';
};

const takeRateLimit = (key: string, limit: number): { allowed: boolean; retryAfterMs: number } => {
  const now = Date.now();
  const existing = rateLimitMap.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (existing.count >= limit) {
    return { allowed: false, retryAfterMs: Math.max(0, existing.resetAt - now) };
  }

  existing.count += 1;
  return { allowed: true, retryAfterMs: 0 };
};

const getBearerToken = (req: any): string | null => {
  const authHeader = req.headers?.authorization;
  if (typeof authHeader !== 'string') return null;
  const trimmed = authHeader.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) return null;
  const token = trimmed.slice(7).trim();
  return token.length > 0 ? token : null;
};

const verifyFirebaseIdToken = async (idToken: string): Promise<string | null> => {
  const cached = tokenCache.get(idToken);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.uid;
  }

  const firebaseApiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  if (!firebaseApiKey) return null;

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!response.ok) return null;
    const data = (await response.json()) as any;
    const uid = data?.users?.[0]?.localId;
    if (typeof uid !== 'string' || uid.length === 0) return null;

    tokenCache.set(idToken, { uid, expiresAt: Date.now() + 5 * 60_000 });
    return uid;
  } catch {
    return null;
  }
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const googleApiKey =
    process.env.GOOGLE_CLOUD_TTS_API_KEY || process.env.VITE_GOOGLE_CLOUD_API_KEY;
  if (!googleApiKey) {
    res.status(503).json({ error: 'Google TTS not configured' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const textRaw = body?.text;
  const voiceRaw = body?.voice;

  if (typeof textRaw !== 'string') {
    res.status(400).json({ error: 'Missing text' });
    return;
  }

  const text = textRaw.trim();
  if (text.length === 0) {
    res.status(400).json({ error: 'Empty text' });
    return;
  }
  if (text.length > MAX_TEXT_LENGTH) {
    res.status(413).json({ error: `Text too long (max ${MAX_TEXT_LENGTH} chars)` });
    return;
  }

  const voice: VoiceGender = voiceRaw === 'female' ? 'female' : 'male';

  const idToken = getBearerToken(req);
  const uid = idToken ? await verifyFirebaseIdToken(idToken) : null;

  const limitKey = uid ? `uid:${uid}` : `ip:${getClientIp(req)}`;
  const limit = uid ? RATE_LIMIT_AUTH_REQUESTS : RATE_LIMIT_ANON_REQUESTS;
  const limitResult = takeRateLimit(limitKey, limit);
  if (!limitResult.allowed) {
    res.setHeader('Retry-After', Math.ceil(limitResult.retryAfterMs / 1000).toString());
    res.status(429).json({ error: 'Rate limit exceeded' });
    return;
  }

  const voiceName = voice === 'male' ? 'cmn-TW-Wavenet-B' : 'cmn-TW-Wavenet-A';

  try {
    const response = await fetch(
      `${GOOGLE_TTS_ENDPOINT}?key=${encodeURIComponent(googleApiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Some Google Cloud API key restrictions rely on an allowed HTTP referrer.
          // Since this call runs server-side, we set an explicit referrer to match the site's allowed list.
          Referer: 'https://dubible.com/',
        },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: 'cmn-TW', name: voiceName },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 0.9,
            pitch: 0,
            volumeGainDb: voice === 'male' ? 1.5 : 0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      res.status(502).json({
        error: 'Google TTS request failed',
        status: response.status,
        details: errorText.slice(0, 2000),
      });
      return;
    }

    const data = (await response.json()) as any;
    const audioContent = data?.audioContent;
    if (typeof audioContent !== 'string' || audioContent.length === 0) {
      res.status(502).json({ error: 'Invalid Google TTS response' });
      return;
    }

    const audioBuffer = Buffer.from(audioContent, 'base64');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(audioBuffer);
  } catch (error) {
    res.status(500).json({
      error: 'Unexpected error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
