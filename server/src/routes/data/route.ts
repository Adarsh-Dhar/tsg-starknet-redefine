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
import { analyzeVideoContent, type VideoMetadata } from './analyze.js';
import prisma from '../../lib/prisma.js';

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

// --- AGENT-CONTROLLED ACTIVITY TRACKING ---
interface UserStats {
  screenTimeMinutes: number;
  brainrotScore: number;
  lastRotScore: number;
  lastRotVelocity: number;
  healthySessions: number;
  riskySessions: number;
  lastReasoning: string;
  shouldSlash: boolean;
  lastTransferBucket: number;
}

const userStatsStore: Record<string, UserStats> = {};
const transferInFlight: Record<string, boolean> = {};

const ActivitySchema = z.object({
  durationSeconds: z.number().positive().max(3600),
  address: z.string().min(3),
  metadata: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
      url: z.string().optional(),
      isShorts: z.boolean().optional(),
    })
    .optional(),
});

function getUserStats(address: string): UserStats {
  if (!userStatsStore[address]) {
    userStatsStore[address] = {
      screenTimeMinutes: 0,
      brainrotScore: 0,
      lastRotScore: 0,
      lastRotVelocity: 0,
      healthySessions: 0,
      riskySessions: 0,
      lastReasoning: '',
      shouldSlash: false,
      lastTransferBucket: 0,
    };
  }

  return userStatsStore[address];
}

router.post('/analyze', async (req: Request, res: Response) => {
  const parsed = ActivitySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.issues });
  }

  const { durationSeconds, address, metadata } = parsed.data;
  const safeMetadata: VideoMetadata = {
    title: metadata?.title || '',
    description: metadata?.description || '',
    tags: metadata?.tags || [],
    url: metadata?.url || '',
    isShorts: metadata?.isShorts || false,
  };

  const analysis = await analyzeVideoContent(address, safeMetadata, durationSeconds);

  return res.status(200).json({
    success: true,
    analysis,
  });
});

router.post('/activity', async (req: Request, res: Response) => {
  const parsed = ActivitySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.issues });
  }

  const { durationSeconds, address, metadata } = parsed.data;
  const userStats = getUserStats(address);
  const minutes = durationSeconds / 60;

  const safeMetadata: VideoMetadata = {
    title: metadata?.title || '',
    description: metadata?.description || '',
    tags: metadata?.tags || [],
    url: metadata?.url || '',
    isShorts: metadata?.isShorts || false,
  };

  console.info('[ActivityRoute] ACTIVITY_RECEIVED', {
    address,
    durationSeconds,
    title: safeMetadata.title,
    isShorts: safeMetadata.isShorts,
  });

  const analysis = await analyzeVideoContent(address, safeMetadata, durationSeconds);

  console.info('[ActivityRoute] AGENT_DECISION', {
    address,
    rot_score: analysis.rot_score,
    rot_velocity: analysis.rot_velocity,
    source: analysis.source,
    reasoning: analysis.reasoning,
  });

  // Agent-controlled scoring: higher rot velocity for higher risk content.
  const grossIncrease = minutes * 100 * Math.max(0.05, analysis.rot_velocity);

  // Recovery mechanism: healthy content decays accumulated brainrot.
  const isHealthySession = analysis.rot_score < 0.35 && analysis.rot_velocity < 0.45;
  const recovery = isHealthySession ? minutes * 35 : 0;

  userStats.screenTimeMinutes += minutes;
  userStats.brainrotScore = Math.max(0, userStats.brainrotScore + grossIncrease - recovery);
  userStats.lastRotScore = analysis.rot_score;
  userStats.lastRotVelocity = analysis.rot_velocity;
  userStats.lastReasoning = analysis.reasoning;

  if (isHealthySession) {
    userStats.healthySessions += 1;
  } else {
    userStats.riskySessions += 1;
  }

  userStats.shouldSlash = analysis.rot_score >= 0.8;

  // Server-driven score transfer (single source of truth).
  // Every +100 score bucket triggers one deduct request.
  const currentBucket = Math.floor(userStats.brainrotScore / 100);
  if (currentBucket > userStats.lastTransferBucket && !transferInFlight[address]) {
    const bucketDelta = currentBucket - userStats.lastTransferBucket;
    transferInFlight[address] = true;
    try {
      const response = await fetch('http://localhost:3333/api/score-transfer/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: address,
          scoreIncrease: bucketDelta * 100,
        }),
      });

      if (response.ok) {
        userStats.lastTransferBucket = currentBucket;
      }
    } catch (transferError) {
      console.error('[ActivityRoute] Auto deduct failed:', transferError);
    } finally {
      transferInFlight[address] = false;
    }
  }

  // Persist audit records
  try {
    const scoringDecision = await (prisma as any).scoringDecision.create({
      data: {
        address,
        rotScore: analysis.rot_score,
        rotVelocity: analysis.rot_velocity,
        heuristicScore: 0,
        agentScore: analysis.rot_score,
        aiWeight: 0.75,
        baseline: 0.5,
        reasoning: analysis.reasoning,
        source: analysis.source,
      },
    });

    await (prisma as any).activityEvent.create({
      data: {
        address,
        videoUrl: safeMetadata.url,
        videoTitle: safeMetadata.title?.substring(0, 255),
        videoDesc: safeMetadata.description?.substring(0, 1000),
        isShorts: safeMetadata.isShorts,
        durationSeconds,
        scoringId: scoringDecision.id,
      },
    });

    await (prisma as any).scoreLedger.create({
      data: {
        address,
        scoreBefore: userStats.brainrotScore - grossIncrease + recovery,
        scoreDelta: grossIncrease - recovery,
        scoreAfter: userStats.brainrotScore,
        reason: isHealthySession ? 'recovery' : 'activity',
      },
    });
  } catch (dbError) {
    console.error('[ActivityRoute] Failed to persist audit records:', dbError);
  }

  return res.status(200).json({
    success: true,
    stats: userStats,
    analysis: {
      rot_score: analysis.rot_score,
      rot_velocity: analysis.rot_velocity,
      reasoning: analysis.reasoning,
      source: analysis.source,
      isHealthySession,
    },
  });
});

router.get('/stats', (req: Request, res: Response) => {
  const address = String(req.query.address || 'global');
  res.status(200).json(getUserStats(address));
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

    // Sync legacy ingest score into unified user stats
    const unifiedStats = getUserStats(walletAddress);
    unifiedStats.brainrotScore = session.score;
    unifiedStats.screenTimeMinutes += (duration / 60);

    // Milestone tracker for 100-point blocks
    const _milestoneStore: Record<string, number> = global._milestoneStore || (global._milestoneStore = {});
    const currentMilestone = Math.floor(session.score / 100);
    const lastSlashedMilestone = _milestoneStore[walletAddress] || 0;

    let slashed = false;
    // Trigger if they crossed a new 100-point boundary (up to 10000 points/100x)
    if (currentMilestone > lastSlashedMilestone && currentMilestone <= 100) {
      const jumps = currentMilestone - lastSlashedMilestone;
      const totalPenalty = jumps * 0.01;
      // Trigger the slash with the calculated amount
      await slashQueue.add('execute-penalty', {
        walletAddress,
        amount: totalPenalty
      });
      _milestoneStore[walletAddress] = currentMilestone;
      slashed = true;
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