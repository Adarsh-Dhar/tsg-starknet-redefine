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

// Internal imports
import { redis } from '../../redisClient';
import { verifySignature } from '../../lib/verifySignature'; // Ensure this utility exists
import { slashQueue } from '../../lib/queues'; // Ensure BullMQ/Bee-Queue is configured

const router = Router();
const upload = multer({ dest: 'uploads/' });

// --- CONFIGURATION & SCHEMAS ---

const SESSION_KEY_PREFIX = 'brainrot:session:';
const BASELINE_KEY_PREFIX = 'brainrot:baseline:';
const SESSION_WINDOW = 10;

const PHENOTYPE_CONFIG = {
  ZOMBIE_VARIANCE_THRESHOLD: 15,
  DOOM_VELOCITY_TRIGGER: 3.5,
  RBP_START_HOUR: 22,
  SESSION_GAP_SECONDS: 1200,
};

// Rate Limiter: 30 requests per minute per IP
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
  duration: z.number().int().positive().max(3600), // Max 1 hour per video
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

async function getUserSession(walletAddress: string): Promise<UserSession> {
  const raw = await redis.get(SESSION_KEY_PREFIX + walletAddress);
  if (!raw) return { dwells: [], lastTimestamps: [], score: 0, lastUpdate: 0 };
  return JSON.parse(raw);
}

async function setUserSession(walletAddress: string, session: UserSession) {
  await redis.set(SESSION_KEY_PREFIX + walletAddress, JSON.stringify(session), 'EX', 86400); // 24h TTL
}

function calculateVariance(numbers: number[]): number {
  if (numbers.length < 2) return 0;
  const mean = numbers.reduce((a, b) => a + b) / numbers.length;
  return numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (numbers.length - 1);
}

// --- ROUTES ---

/**
 * @route POST /api/data/ingest/realtime
 * @desc Production-level real-time ingestion with signature verification and async slashing
 */
router.post('/ingest/realtime', dataRateLimiter, async (req: Request, res: Response) => {
  // 1. Validate Input
  const parseResult = IngestRealtimeSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid input', details: parseResult.error.issues });
  }

  const { walletAddress, videoId, duration, signature, message } = parseResult.data;

  try {
    // 2. Cryptographic Security: Verify that the user actually owns the wallet
    const isOwner = await verifySignature(message, signature, walletAddress);
    if (!isOwner) {
      return res.status(401).json({ error: 'Unauthorized: Invalid signature' });
    }

    // 3. Session Management
    const session = await getUserSession(walletAddress);
    const now = Date.now();
    
    session.dwells.push(duration);
    session.lastTimestamps.push(now);

    if (session.dwells.length > SESSION_WINDOW) session.dwells.shift();
    if (session.lastTimestamps.length > SESSION_WINDOW) session.lastTimestamps.shift();

    // 4. Scoring Engine
    let scoreDelta = 0;

    // A. Personalized Baseline Variance (Zombie Mode)
    let baselineVariance = PHENOTYPE_CONFIG.ZOMBIE_VARIANCE_THRESHOLD;
    const baselineKey = BASELINE_KEY_PREFIX + walletAddress;
    const storedBaseline = await redis.get(baselineKey);
    
    if (storedBaseline) {
      baselineVariance = parseFloat(storedBaseline);
    } else if (session.dwells.length >= 10) {
      baselineVariance = calculateVariance(session.dwells);
      await redis.set(baselineKey, baselineVariance.toString(), 'EX', 604800); // 1 week TTL
    }

    const currentVariance = calculateVariance(session.dwells);
    if (session.dwells.length >= 5 && currentVariance < baselineVariance) {
      scoreDelta += 10;
    }

    // B. Doomscrolling Velocity
    if (session.lastTimestamps.length >= 2) {
      const windowMs = session.lastTimestamps[session.lastTimestamps.length - 1] - session.lastTimestamps[0];
      const velocity = session.dwells.length / (windowMs / 60000);
      if (velocity > PHENOTYPE_CONFIG.DOOM_VELOCITY_TRIGGER) {
        scoreDelta += 15;
      }
    }

    // C. Content Classification (YouTube API with Regex Fallback)
    let category = 'unknown';
    const ytApiKey = process.env.YT_API_KEY;
    
    try {
      if (ytApiKey) {
        const { data } = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
          params: { part: 'snippet', id: videoId, key: ytApiKey }
        });
        category = data.items?.[0]?.snippet?.categoryId || 'unknown';
        
        if (["23", "24"].includes(category)) scoreDelta += 5;   // Comedy/Ent
        if (["27", "28"].includes(category)) scoreDelta -= 10;  // High-value content
      } else {
        throw new Error('No API Key');
      }
    } catch (apiError) {
      // Robust Fallback: Regex matching on video tags/ID if API fails
      if (/edu|learn|science|math|study|tech/i.test(videoId)) scoreDelta -= 5;
      else if (/fun|lol|meme|prank/i.test(videoId)) scoreDelta += 5;
    }

    // D. Late Night Multiplier (RBP)
    const hour = new Date(now).getHours();
    if (hour >= PHENOTYPE_CONFIG.RBP_START_HOUR || hour < 5) {
      scoreDelta *= 3;
    }

    // 5. Enforcement & Persistence
    session.score += scoreDelta;
    session.lastUpdate = now;

    let slashed = false;
    if (session.score >= 100) {
      // Async Slashing: Don't wait for blockchain. Offload to BullMQ worker.
      await slashQueue.add('execute-penalty', { 
        walletAddress, 
        reason: 'Threshold Exceeded',
        score: session.score 
      });
      session.score = 0; 
      slashed = true;
    }

    await setUserSession(walletAddress, session);
    
    return res.json({ 
      success: true, 
      score: session.score, 
      slashed, 
      category,
      message: slashed ? "Penalty enqueued for processing." : "Score updated."
    });

  } catch (error: any) {
    console.error('Real-time ingestion error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route POST /api/data/audit/advanced
 * @desc Historical analysis for batch uploads (Google Takeout)
 */
router.post('/audit/advanced', async (req: Request, res: Response) => {
  const { historyData } = req.body;
  if (!historyData || !Array.isArray(historyData)) {
    return res.status(400).json({ error: 'Invalid history data format' });
  }

  const sorted = [...historyData].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

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
        const variance = calculateVariance(dwells);
        const velocity = currentSession.length / ((dwells.reduce((a, b) => a + b, 0) / 60) || 1);

        sessions.push({
          startTime: currentSession[0].timestamp,
          videoCount: currentSession.length,
          metrics: { variance, velocity },
          isPathological: velocity > PHENOTYPE_CONFIG.DOOM_VELOCITY_TRIGGER
        });
      }
      currentSession = [];
    }
  }

  res.json({ success: true, analysis: sessions });
});

/**
 * @route POST /api/data/ingest
 * @desc Stream-based processing for large JSON uploads
 */
router.post('/ingest', upload.single('history_file'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const results: any[] = [];
  const pipeline = chain([
    fs.createReadStream(req.file.path),
    parser(),
    streamArray(),
    (data: { value: any; }) => {
      const item = data.value;
      const videoId = item.titleUrl?.match(/v=([^&]+)/)?.[1];
      return videoId ? {
        videoId,
        title: item.title?.replace('Watched ', ''),
        timestamp: item.time
      } : null;
    }
  ]);

  pipeline.on('data', (d) => results.push(d));
  pipeline.on('end', () => {
    fs.unlinkSync(req.file!.path);
    res.json({ total: results.length, preview: results.slice(0, 5) });
  });

  pipeline.on('error', (err) => {
    if (fs.existsSync(req.file!.path)) fs.unlinkSync(req.file!.path);
    res.status(500).json({ error: err.message });
  });
});

export default router;