import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import axios from 'axios';
import multer from 'multer';
import fs from 'fs';
import { chain } from 'stream-chain';
import streamJsonPkg from 'stream-json';
const { parser } = streamJsonPkg;
import streamArrayPkg from 'stream-json/streamers/StreamArray.js';
const { streamArray } = streamArrayPkg;

// Internal imports leveraging local project architecture
import { verifySignature } from '../../lib/verifySignature.js'; 
import { slashQueue } from '../../lib/queues.js'; 

const router = Router();
const upload = multer({ dest: 'uploads/' });

// --- CONFIGURATION & SCHEMAS ---

const SESSION_KEY_PREFIX = 'brainrot:session:';
const BASELINE_KEY_PREFIX = 'brainrot:baseline:';
const SESSION_WINDOW = 10;

const PHENOTYPE_CONFIG = {
  ZOMBIE_VARIANCE_THRESHOLD: 15, //
  DOOM_VELOCITY_TRIGGER: 3.5,     //
  RBP_START_HOUR: 22,            //
  SESSION_GAP_SECONDS: 1200,      //
};

// Rate Limiter: Protects ingestion endpoints
export const dataRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

// Zod Schema for Real-time Ingestion
const IngestRealtimeSchema = z.object({
  walletAddress: z.string().regex(/^([a-z0-9:]{10,})$/i, "Invalid wallet address format"),
  videoId: z.string().min(3),
  duration: z.number().int().positive().max(3600),
  signature: z.string().min(64),
  message: z.string().min(1),
});

interface UserSession {
  dwells: number[];
  lastTimestamps: number[];
  score: number;
  lastUpdate: number;
}

// --- HELPERS ---

// In-memory session store (for dev only, not persistent!)

// --- YOUTUBE SHORTS ACTIVITY TRACKING ---
let globalUserStats = {
  screenTimeMinutes: 0,
  brainrotScore: 0,
};

router.post('/activity', async (req: Request, res: Response) => {
  const { durationSeconds, address } = req.body;
  if (typeof durationSeconds !== 'number' || !address) {
    return res.status(400).json({ error: 'Missing durationSeconds or address' });
  }
  // Update stats
  const minutes = durationSeconds / 60;
  globalUserStats.screenTimeMinutes += minutes;
  // Shorts have a higher "Brainrot" multiplier
  globalUserStats.brainrotScore += minutes * 1.5;
  res.status(200).json({
    success: true,
    stats: globalUserStats
  });
});

router.get('/stats', (req: Request, res: Response) => {
  res.status(200).json(globalUserStats);
});
const _sessionStore: Record<string, UserSession> = {};
const _baselineStore: Record<string, string> = {};

async function getUserSession(walletAddress: string): Promise<UserSession> {
  return _sessionStore[walletAddress] || { dwells: [], lastTimestamps: [], score: 0, lastUpdate: 0 };
}

async function setUserSession(walletAddress: string, session: UserSession) {
  _sessionStore[walletAddress] = session;
}

function calculateVariance(numbers: number[]): number {
  if (numbers.length < 2) return 0;
  const mean = numbers.reduce((a, b) => a + b) / numbers.length;
  return numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (numbers.length - 1);
}

// --- ROUTES ---

/**
 * @route POST /api/data/ingest/realtime
 * @desc Real-time ingestion with cryptographic verification
 */
router.post('/ingest/realtime', dataRateLimiter, async (req: Request, res: Response) => {
  const parseResult = IngestRealtimeSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid input', details: parseResult.error.issues });
  }

  const { walletAddress, videoId, duration, signature, message } = parseResult.data;

  try {
    const isOwner = await verifySignature(message, signature, walletAddress);
    if (!isOwner) return res.status(401).json({ error: 'Unauthorized: Invalid signature' });

    const session = await getUserSession(walletAddress);
    const now = Date.now();
    
    session.dwells.push(duration);
    session.lastTimestamps.push(now);

    if (session.dwells.length > SESSION_WINDOW) session.dwells.shift();
    if (session.lastTimestamps.length > SESSION_WINDOW) session.lastTimestamps.shift();

    let scoreDelta = 0;

    // A. Variance Scoring (Zombie Mode)
    let baselineVariance = PHENOTYPE_CONFIG.ZOMBIE_VARIANCE_THRESHOLD;
    const baselineKey = BASELINE_KEY_PREFIX + walletAddress;
    const storedBaseline = _baselineStore[baselineKey];
    if (storedBaseline) {
      baselineVariance = parseFloat(storedBaseline);
    } else if (session.dwells.length >= 10) {
      baselineVariance = calculateVariance(session.dwells);
      _baselineStore[baselineKey] = baselineVariance.toString();
    }

    const currentVariance = calculateVariance(session.dwells);
    if (session.dwells.length >= 5 && currentVariance < baselineVariance) scoreDelta += 10;

    // B. Doomscrolling Velocity
    if (session.lastTimestamps.length >= 2) {
      const windowMs = session.lastTimestamps[session.lastTimestamps.length - 1] - session.lastTimestamps[0];
      const velocity = session.dwells.length / (windowMs / 60000);
      if (velocity > PHENOTYPE_CONFIG.DOOM_VELOCITY_TRIGGER) scoreDelta += 15;
    }

    // C. Content Classification using YT_API_KEY from .env
    let category = 'unknown';
    const ytApiKey = process.env.YT_API_KEY; 
    
    try {
      if (ytApiKey) {
        const { data } = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
          params: { part: 'snippet', id: videoId, key: ytApiKey }
        });
        category = data.items?.[0]?.snippet?.categoryId || 'unknown';
        if (["23", "24"].includes(category)) scoreDelta += 5; // Comedy/Ent
        if (["27", "28"].includes(category)) scoreDelta -= 10; // High-value content
      }
    } catch (apiError) {
      if (/edu|learn|science|math|study|tech/i.test(videoId)) scoreDelta -= 5;
    }

    // D. Late Night Multiplier
    const hour = new Date(now).getHours();
    if (hour >= PHENOTYPE_CONFIG.RBP_START_HOUR || hour < 5) scoreDelta *= 3;

    session.score += scoreDelta;
    session.lastUpdate = now;

    // FIX: Sync globalUserStats with session
    globalUserStats.brainrotScore = session.score;
    globalUserStats.screenTimeMinutes += (duration / 60);

    let slashed = false;
    if (session.score >= 100) {
      await slashQueue.add('execute-penalty', { walletAddress, score: session.score });
      session.score = 0; 
      slashed = true;
      // Reset global stats if slashed
      globalUserStats.brainrotScore = 0;
    }

    await setUserSession(walletAddress, session);
    return res.json({ success: true, score: session.score, slashed, category });

  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route POST /api/data/audit/advanced
 * @desc Historical analysis for batch uploads
 */
router.post('/audit/advanced', async (req: Request, res: Response) => {
  const { historyData } = req.body;
  if (!historyData || !Array.isArray(historyData)) return res.status(400).json({ error: 'Invalid data' });

  const sorted = [...historyData].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const sessions: any[] = [];
  let currentSession: any[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const dwell = next ? (new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime()) / 1000 : 0;
    
    currentSession.push({ ...current, dwell });
    if (!next || dwell > PHENOTYPE_CONFIG.SESSION_GAP_SECONDS) {
      if (currentSession.length > 3) {
        const dwells = currentSession.map(v => v.dwell).filter(d => d > 0 && d < 3600);
        sessions.push({
          startTime: currentSession[0].timestamp,
          isPathological: (currentSession.length / ((dwells.reduce((a, b) => a + b, 0) / 60) || 1)) > PHENOTYPE_CONFIG.DOOM_VELOCITY_TRIGGER
        });
      }
      currentSession = [];
    }
  }
  res.json({ success: true, analysis: sessions });
});

export default router;