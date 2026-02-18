// --- REAL-TIME INGESTION ENDPOINT ---
router.post('/ingest/realtime', async (req: Request, res: Response) => {
  const { walletAddress, videoId, duration } = req.body;
  if (!walletAddress || !videoId || typeof duration !== 'number') {
    return res.status(400).json({ error: 'Missing walletAddress, videoId, or duration' });
  }

  let session = await getUserSession(walletAddress);
  const now = Date.now();
  session.dwells.push(duration);
  session.lastTimestamps.push(now);
  if (session.dwells.length > SESSION_WINDOW) session.dwells.shift();
  if (session.lastTimestamps.length > SESSION_WINDOW) session.lastTimestamps.shift();

  // --- Real-time Scoring Logic ---
  let scoreDelta = 0;
  // 1. Rolling Variance (Zombie Mode)
  const variance = calculateVariance(session.dwells);
  if (session.dwells.length >= 5 && variance < PHENOTYPE_CONFIG.ZOMBIE_VARIANCE_THRESHOLD) {
    scoreDelta += 10;
  }

  // 2. Doomscrolling (Velocity)
  if (session.lastTimestamps.length >= 2) {
    const timeWindowSec = (session.lastTimestamps[session.lastTimestamps.length - 1] - session.lastTimestamps[0]) / 1000;
    const velocity = session.dwells.length / (timeWindowSec / 60);
    if (velocity > PHENOTYPE_CONFIG.DOOM_VELOCITY_TRIGGER) {
      scoreDelta += 15;
    }
  }

  // 3. Category-Based Adjustment (YouTube API)
  let category = 'unknown';
  try {
    // YouTube Data API v3: https://www.googleapis.com/youtube/v3/videos?part=snippet&id=VIDEO_ID&key=API_KEY
    // You must set process.env.YT_API_KEY in your environment
    const ytApiKey = process.env.YT_API_KEY;
    if (ytApiKey) {
      const ytResp = await axios.get(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${ytApiKey}`);
      category = ytResp.data.items?.[0]?.snippet?.categoryId || 'unknown';
      // Optionally map categoryId to category name
      // For demo: treat 23 (Comedy), 24 (Entertainment), 27 (Education), 28 (Science & Tech)
      if (["23", "24"].includes(category)) scoreDelta += 5; // Comedy, Entertainment
      if (["27", "28"].includes(category)) scoreDelta -= 5; // Education, Science & Tech
    }
  } catch (e) {
    // Ignore category errors
  }

  // 4. Temporal Penalty (RBP)
  const hour = new Date(now).getHours();
  if (hour >= PHENOTYPE_CONFIG.RBP_START_HOUR || hour < 5) {
    scoreDelta *= 3;
  }

  // 5. Update score
  session.score += scoreDelta;
  session.lastUpdate = now;

  // 6. Trigger blockchain slashing if score exceeds threshold
  let slashed = false;
  if (session.score >= 100) {
    try {
      // Call /api/slash/ai-slash (POST) with { walletAddress }
      await axios.post(`${process.env.SLASH_ENDPOINT || 'http://localhost:3333/api/slash/ai-slash'}`, { walletAddress });
      session.score = 0; // Reset score after slashing
      slashed = true;
    } catch (e) {
      // Log but do not block
      console.error('Slashing failed:', e);
    }
  }

  await setUserSession(walletAddress, session);
  res.json({ success: true, score: session.score, slashed, category });
});
import { Router, Request, Response } from 'express';
import { redis, connectRedis } from '../../redisClient';
import multer from 'multer';
import fs from 'fs';
import axios from 'axios';
import { chain } from 'stream-chain';
import streamJsonPkg from 'stream-json';
const { parser } = streamJsonPkg;
import streamArrayPkg from 'stream-json/streamers/StreamArray.js';
const { streamArray } = streamArrayPkg;


const router = Router();
const upload = multer({ dest: 'uploads/' });

// --- REDIS SESSION HELPERS ---
const SESSION_KEY_PREFIX = 'brainrot:';
const SESSION_WINDOW = 10; // last 10 dwell times

interface UserSession {
  dwells: number[];
  lastTimestamps: number[];
  score: number;
  lastUpdate: number;
}

async function getUserSession(walletAddress: string): Promise<UserSession> {
  await connectRedis();
  const raw = await redis.get(SESSION_KEY_PREFIX + walletAddress);
  if (!raw) {
    return { dwells: [], lastTimestamps: [], score: 0, lastUpdate: 0 };
  }
  return JSON.parse(raw);
}

async function setUserSession(walletAddress: string, session: UserSession) {
  await connectRedis();
  await redis.set(SESSION_KEY_PREFIX + walletAddress, JSON.stringify(session));
}

/**
 * OPTIMIZED CONFIGURATION
 * Based on the "Digital Phenotyping" architecture
 */
const PHENOTYPE_CONFIG = {
  ZOMBIE_VARIANCE_THRESHOLD: 15, // Low variance in dwell time = machine-like
  DISSOCIATION_INDEX_LIMIT: 300,  // High dwell vs low engagement
  DOOM_VELOCITY_TRIGGER: 3.5,     // Videos per minute
  RBP_START_HOUR: 22,             // Revenge Bedtime Procrastination window
  SESSION_GAP_SECONDS: 1200       // 20 minute inactivity break
};

// --- CORE UTILITIES ---

/**
 * Calculates Dwell Time Variance to detect "Zombie Mode"
 * High variance = Active choice. Low variance = Passive consumption.
 */
function calculateVariance(numbers: number[]): number {
  if (numbers.length < 2) return 0;
  const mean = numbers.reduce((a, b) => a + b) / numbers.length;
  return numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (numbers.length - 1);
}

// --- REFACTORED ROUTES ---

router.post('/audit/advanced', async (req: Request, res: Response) => {
  const { historyData } = req.body;
  if (!historyData || !Array.isArray(historyData)) return res.status(400).json({ error: 'Invalid data' });

  // 1. Sort Chronologically for accurate delta calculation
  const sorted = [...historyData].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const sessions: any[] = [];
  let currentSession: any[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    
    // Inferred Dwell Time
    const dwell = next ? (new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime()) / 1000 : 0;
    
    currentSession.push({ ...current, dwell });

    // Break Session on Gap or End of Array
    if (!next || dwell > PHENOTYPE_CONFIG.SESSION_GAP_SECONDS) {
      if (currentSession.length > 3) {
        const dwells = currentSession.map(v => v.dwell).filter(d => d < 3600); // Filter outliers
        const sessionVariance = calculateVariance(dwells);
        const videoCount = currentSession.length;
        const totalDurationMin = dwells.reduce((a, b) => a + b, 0) / 60;
        const velocity = videoCount / (totalDurationMin || 1);
        const startHour = new Date(currentSession[0].timestamp).getHours();

        // 2. Multi-State Classification
        let phenotype = 'INTENTIONAL_USE';
        
        // Zombie Mode: Low Variance + High Volume
        if (sessionVariance < PHENOTYPE_CONFIG.ZOMBIE_VARIANCE_THRESHOLD && videoCount > 10) {
          phenotype = 'ZOMBIE_MODE_DETECTED';
        } 
        // Doomscrolling: High Velocity + High Variance
        else if (velocity > PHENOTYPE_CONFIG.DOOM_VELOCITY_TRIGGER) {
          phenotype = 'DOOMSCROLL_DETECTED';
        }
        // Revenge Bedtime Procrastination
        if (startHour >= PHENOTYPE_CONFIG.RBP_START_HOUR || startHour <= 4) {
          phenotype += '_WITH_SLEEP_DEPRIVATION';
        }

        sessions.push({
          session_start: currentSession[0].timestamp,
          metrics: {
            video_count: videoCount,
            variance: sessionVariance.toFixed(2),
            velocity: velocity.toFixed(2),
            duration_min: totalDurationMin.toFixed(1)
          },
          classification: phenotype,
          is_pathological: phenotype !== 'INTENTIONAL_USE'
        });
      }
      currentSession = [];
    }
  }

  res.json({ success: true, analysis: sessions });
});

/**
 * Optimized Ingest with automated ESM cleanup
 */
router.post('/ingest', upload.single('history_file'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });

  const results: any[] = [];
  const readStream = fs.createReadStream(req.file.path);

  const pipeline = chain([
    readStream,
    parser(),
    streamArray(),
    (data) => {
      const item = data.value;
      const videoId = item.titleUrl?.match(/v=([^&]+)/)?.[1];
      return videoId ? {
        videoId,
        title: item.title?.replace('Watched ', ''),
        timestamp: item.time,
        isShort: item.titleUrl?.includes('shorts/') // Initial heuristic check
      } : null;
    }
  ]);

  pipeline.on('data', (d) => results.push(d));
  pipeline.on('end', () => {
    fs.unlinkSync(req.file!.path);
    res.json({ total: results.length, preview: results.slice(0, 3) });
  });
  
  pipeline.on('error', (e) => {
    if (fs.existsSync(req.file!.path)) fs.unlinkSync(req.file!.path);
    res.status(500).json({ error: e.message });
  });
});

export default router;