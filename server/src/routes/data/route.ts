
// import { Router, Request, Response } from 'express';
// import multer from 'multer';
// import fs from 'fs';
// import axios from 'axios';
// import { chain } from 'stream-chain';
// import { parser } from 'stream-json';
// import { streamArray } from 'stream-json/streamers/StreamArray';
// import dotenv from 'dotenv';
// dotenv.config();

// const router = Router();
// const upload = multer({ dest: 'uploads/' });

// // --- CONFIGURATION & WEIGHTS ---

// // Cognitive Load Weights (Lower = Higher Brainrot potential)
// // Based on research: Entertainment/Comedy (24, 23) have high dopamine frequency.
// const CATEGORY_WEIGHTS: Record<string, number> = {
//   'News & Politics': 0.9, // High Anxiety (Doomscrolling)
//   'Education': 0.1,       // Intent-driven
//   'Science & Tech': 0.1,  // Intent-driven
//   'Comedy': 0.8,          // High Dopamine (Brainrot)
//   'Entertainment': 0.7,   // High Dopamine
//   'Gaming': 0.6           // Moderate Dopamine
// };

// // Thresholds for "Doomscrolling" detection
// const DOOM_THRESHOLDS = {
//   VELOCITY_TRIGGER: 3.0, // > 3 videos per minute
//   SESSION_INERTIA: 30,   // > 30 mins continuous session
//   SHORT_DURATION: 60     // Seconds
// };

// // --- HELPER FUNCTIONS ---

// /**
//  * Heuristic 3: Network Redirect Method (Zero-Quota)
//  * Detects if a video is a Short by checking if YouTube redirects 
//  * the /shorts/ URL to /watch.
//  * 
//  * Returns: 'SHORT' | 'VIDEO' | 'UNKNOWN'
//  */
// async function classifyContentType(videoId: string): Promise<string> {
//   try {
//     const response = await axios.head(`https://www.youtube.com/shorts/${videoId}`, {
//       maxRedirects: 0, // CRITICAL: Stop axios from following the 303 redirect automatically
//       validateStatus: (status) => status >= 200 && status < 400
//     });
    
//     // HTTP 200 = It stayed on /shorts/, so it IS a Short
//     if (response.status === 200) return 'SHORT';
    
//     // HTTP 303 = It redirected to /watch, so it is Long-form
//     if (response.status === 303) return 'VIDEO';
    
//     return 'UNKNOWN';
//   } catch (error) {
//     return 'UNKNOWN'; // Video likely private or deleted
//   }
// }

// /**
//  * Calculates the "Implied Duration" of a view.
//  * Since Takeout only gives "Time Started", we infer duration by 
//  * looking at the time difference between this video and the PREVIOUS one watched.
//  */
// function calculateImpliedDuration(currentDate: Date, previousDate: Date): number {
//   const diffMs = previousDate.getTime() - currentDate.getTime();
//   return Math.abs(diffMs / 1000); // Seconds
// }

// // --- ROUTES ---

// // 1. INGEST & STREAM PIPELINE
// // Uploads Google Takeout watch-history.json and processes it via streams
// router.post('/ingest', upload.single('history_file'), async (req: Request, res: Response) => {
//   if (!req.file) return res.status(400).json({ error: 'No file provided' });

//   const results: any =;
//   let processedCount = 0;

//   try {
//     const pipeline = chain(+)/);
//         if (!videoIdMatch) return null;

//         return {
//           videoId: videoIdMatch[1],
//           title: item.title?.replace('Watched ', ''),
//           timestamp: new Date(item.time),
//           channelUrl: item.subtitles?.?.url |

// | null
//         };
//       }
//     ]);

//     pipeline.on('data', (data) => {
//       if (data) {
//         results.push(data);
//         processedCount++;
//       }
//     });

//     pipeline.on('end', async () => {
//       // Cleanup temp file
//       fs.unlinkSync(req.file!.path);
      
//       // Send preliminary data back (In production, save to DB here)
//       res.json({
//         success: true,
//         message: 'Ingestion complete',
//         total_videos_scanned: processedCount,
//         preview: results.slice(0, 5) // Show first 5 for validation
//       });
//     });

//   } catch (e: any) {
//     res.status(500).json({ success: false, error: e.message });
//   }
// });

// // 2. AUDIT & METRICS ENGINE
// // Analyzes a list of timestamps to detect "Doomscroll Sessions"
// router.post('/audit/doomscroll', async (req: Request, res: Response) => {
//   const { historyData } = req.body; // Expects array of { videoId, timestamp }
  
//   if (!historyData ||!Array.isArray(historyData)) {
//     return res.status(400).json({ error: 'Invalid history data format' });
//   }

//   // Sort by time descending (newest first)
//   const sortedHistory = historyData.sort((a, b) => 
//     new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
//   );

//   const sessions: any =;
//   let currentSession: any = { videos:, startTime: null, endTime: null };
  
//   // Segmentation Logic: Break history into "Sessions" based on inactivity gaps
//   for (let i = 0; i < sortedHistory.length - 1; i++) {
//     const current = sortedHistory[i];
//     const next = sortedHistory[i + 1]; // "Next" in array is "Previous" in time
    
//     const impliedDuration = calculateImpliedDuration(new Date(current.timestamp), new Date(next.timestamp));
    
//     // Add to current session
//     currentSession.videos.push({...current, impliedDuration });
//     if (!currentSession.startTime) currentSession.startTime = current.timestamp;

//     // If gap > 20 mins, assume user put phone down -> End Session
//     if (impliedDuration > (20 * 60)) {
//       currentSession.endTime = current.timestamp; // Approx end time
      
//       // Calculate Session Metrics
//       const sessionDurationMin = (new Date(currentSession.startTime).getTime() - new Date(currentSession.endTime).getTime()) / 60000;
//       const videoCount = currentSession.videos.length;
      
//       // METRIC: Scroll Velocity (Videos per Minute)
//       const scrollVelocity = videoCount / (sessionDurationMin |

// | 1);
      
//       // CLASSIFICATION: Is this a Doomscroll?
//       // Logic: High velocity + Long duration
//       const isDoomscroll = (scrollVelocity > DOOM_THRESHOLDS.VELOCITY_TRIGGER) && 
//                            (sessionDurationMin > DOOM_THRESHOLDS.SESSION_INERTIA);

//       sessions.push({
//         date: currentSession.startTime,
//         duration_minutes: sessionDurationMin.toFixed(1),
//         video_count: videoCount,
//         scroll_velocity: scrollVelocity.toFixed(2),
//         phenotype: isDoomscroll? 'DOOMSCROLL_DETECTED' : 'INTENTIONAL_VIEWING',
//         videos: currentSession.videos
//       });

//       // Reset for next session
//       currentSession = { videos:, startTime: null, endTime: null };
//     }
//   }

//   res.json({
//     success: true,
//     total_sessions_analyzed: sessions.length,
//     doomscroll_sessions: sessions.filter(s => s.phenotype === 'DOOMSCROLL_DETECTED').length,
//     data: sessions
//   });
// });

// // 3. ENRICHMENT & CLASSIFICATION ROUTE
// // Checks if specific videos are Shorts or Long-form
// router.post('/classify', async (req: Request, res: Response) => {
//   const { videoIds } = req.body; // Array of IDs

//   if (!videoIds ||!Array.isArray(videoIds)) {
//     return res.status(400).json({ error: 'Missing videoIds array' });
//   }

//   try {
//     const classificationResults =;

//     // Process in parallel (batches of 10 to avoid rate limiting/spamming)
//     // Note: In prod, use a proper queue (BullMQ/RabbitMQ)
//     for (const id of videoIds) {
//       const type = await classifyContentType(id);
//       classificationResults.push({ id, type });
      
//       // Artificial delay to be polite to YouTube servers
//       await new Promise(r => setTimeout(r, 100)); 
//     }

//     res.json({
//       success: true,
//       results: classificationResults
//     });

//   } catch (e: any) {
//     res.status(500).json({ success: false, error: e.message });
//   }
// });

// export default router;