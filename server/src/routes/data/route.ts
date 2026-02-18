import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { chain } from 'stream-chain';
import streamJsonPkg from 'stream-json';
const { parser } = streamJsonPkg;
import streamArrayPkg from 'stream-json/streamers/StreamArray.js';
const { streamArray } = streamArrayPkg;
import dotenv from 'dotenv';

// ESM Support
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const router = Router();
const upload = multer({ dest: 'uploads/' });

// --- CONFIGURATION & WEIGHTS ---

const CATEGORY_WEIGHTS: Record<string, number> = {
  'News & Politics': 0.9, 
  'Education': 0.1,       
  'Science & Tech': 0.1,  
  'Comedy': 0.8,          
  'Entertainment': 0.7,   
  'Gaming': 0.6           
};

const DOOM_THRESHOLDS = {
  VELOCITY_TRIGGER: 3.0, 
  SESSION_INERTIA: 30,   
  SHORT_DURATION: 60     
};

// --- HELPER FUNCTIONS ---

async function classifyContentType(videoId: string): Promise<string> {
  try {
    const response = await axios.head(`https://www.youtube.com/shorts/${videoId}`, {
      maxRedirects: 0, 
      validateStatus: (status) => status >= 200 && status < 400
    });
    
    if (response.status === 200) return 'SHORT';
    if (response.status === 303) return 'VIDEO';
    
    return 'UNKNOWN';
  } catch (error) {
    return 'UNKNOWN'; 
  }
}

function calculateImpliedDuration(currentDate: Date, previousDate: Date): number {
  const diffMs = Math.abs(previousDate.getTime() - currentDate.getTime());
  return diffMs / 1000; 
}

// --- ROUTES ---

// 1. INGEST & STREAM PIPELINE
router.post('/ingest', upload.single('history_file'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const results: any[] = [];
  let processedCount = 0;

  try {
    const pipeline = chain([
      fs.createReadStream(req.file.path),
      parser(),
      streamArray(),
      (data: { value: any; }) => {
        const item = data.value;
        const videoIdMatch = item.titleUrl?.match(/v=([^&]+)/);
        if (!videoIdMatch) return null;

        return {
          videoId: videoIdMatch[1],
          title: item.title?.replace('Watched ', ''),
          timestamp: new Date(item.time),
          channelUrl: item.subtitles?.[0]?.url || null
        };
      }
    ]);

    pipeline.on('data', (data) => {
      if (data) {
        results.push(data);
        processedCount++;
      }
    });

    pipeline.on('error', (err) => {
      console.error('Stream Pipeline error:', err);
      if (fs.existsSync(req.file!.path)) fs.unlinkSync(req.file!.path);
      if (!res.headersSent) res.status(500).json({ error: err.message });
    });

    pipeline.on('end', () => {
      if (fs.existsSync(req.file!.path)) fs.unlinkSync(req.file!.path);
      
      res.json({
        success: true,
        message: 'Ingestion complete',
        total_videos_scanned: processedCount,
        preview: results.slice(0, 5)
      });
    });

  } catch (e: any) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, error: e.message });
  }
});

// 2. AUDIT & METRICS ENGINE
router.post('/audit/doomscroll', async (req: Request, res: Response) => {
  const { historyData } = req.body;
  
  if (!historyData || !Array.isArray(historyData)) {
    return res.status(400).json({ error: 'Invalid history data format' });
  }

  // Ensure descending order (newest first)
  const sortedHistory = [...historyData].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const sessions: any[] = [];
  let currentSession: any = { videos: [], startTime: null, endTime: null };
  
  for (let i = 0; i < sortedHistory.length - 1; i++) {
    const current = sortedHistory[i];
    const next = sortedHistory[i + 1]; 
    
    const impliedDuration = calculateImpliedDuration(new Date(current.timestamp), new Date(next.timestamp));
    
    currentSession.videos.push({ ...current, impliedDuration });
    if (!currentSession.startTime) currentSession.startTime = current.timestamp;

    // Session break logic: > 20 mins gap
    if (impliedDuration > (20 * 60)) {
      currentSession.endTime = current.timestamp;
      
      const startMs = new Date(currentSession.startTime).getTime();
      const endMs = new Date(currentSession.endTime).getTime();
      const sessionDurationMin = Math.abs(startMs - endMs) / 60000;
      const videoCount = currentSession.videos.length;
      const scrollVelocity = videoCount / (sessionDurationMin || 1);
      
      const isDoomscroll = (scrollVelocity > DOOM_THRESHOLDS.VELOCITY_TRIGGER) && 
                           (sessionDurationMin > DOOM_THRESHOLDS.SESSION_INERTIA);

      sessions.push({
        date: currentSession.startTime,
        duration_minutes: sessionDurationMin.toFixed(1),
        video_count: videoCount,
        scroll_velocity: scrollVelocity.toFixed(2),
        phenotype: isDoomscroll ? 'DOOMSCROLL_DETECTED' : 'INTENTIONAL_VIEWING',
        videos: [...currentSession.videos]
      });

      currentSession = { videos: [], startTime: null, endTime: null };
    }
  }

  res.json({
    success: true,
    total_sessions_analyzed: sessions.length,
    doomscroll_sessions: sessions.filter(s => s.phenotype === 'DOOMSCROLL_DETECTED').length,
    data: sessions
  });
});

// 3. ENRICHMENT & CLASSIFICATION ROUTE
router.post('/classify', async (req: Request, res: Response) => {
  const { videoIds } = req.body;

  if (!videoIds || !Array.isArray(videoIds)) {
    return res.status(400).json({ error: 'Missing videoIds array' });
  }

  try {
    const classificationResults = [];

    // Simple rate-limited serial loop
    for (const id of videoIds) {
      const type = await classifyContentType(id);
      classificationResults.push({ id, type });
      await new Promise(r => setTimeout(r, 100)); 
    }

    res.json({
      success: true,
      results: classificationResults
    });

  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;