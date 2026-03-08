// Top-level log to verify logging works when file is loaded
logAgent(`${AGENT_LOG_PREFIX} MODULE_LOADED`, { time: new Date().toISOString() });
import { OpenAI } from 'openai';

export interface VideoMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  url?: string;
  isShorts?: boolean;
}

export interface BrainrotAnalysis {
  rot_score: number;
  rot_velocity: number;
  reasoning: string;
  source: 'agent' | 'fallback';
}

interface UserBaselineState {
  samples: number[];
  rollingBaseline: number;
  aiWeight: number;
}

const USER_BASELINES: Record<string, UserBaselineState> = {};
const BASELINE_WINDOW = 40;
const AI_MAX_INFLUENCE = 0.75;
const AGENT_LOG_PREFIX = '[BrainrotAgent]';

// Helper to log to both stderr and stdout for maximum visibility
function logAgent(...args: any[]) {
  // Print to stderr
  console.error(...args);
  // Print to stdout
  try {
    // If the first arg is a string, prefix with AGENT_LOG_PREFIX for stdout too
    if (typeof args[0] === 'string' && !args[0].startsWith(AGENT_LOG_PREFIX)) {
      process.stdout.write(`${AGENT_LOG_PREFIX} `);
    }
    // Print all args to stdout
    process.stdout.write(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ') + '\n');
  } catch {}
}
const AGENT_MODEL = process.env.GITHUB_MODELS_MODEL || 'openai/gpt-4o-mini';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      console.error(`${AGENT_LOG_PREFIX} MODEL_DISABLED: GITHUB_TOKEN not set, using fallback heuristic scoring`);
      // Return a dummy client that we'll check for before using
      return null as any;
    }
    client = new OpenAI({
      baseURL: 'https://models.github.ai/inference',
      apiKey: githubToken,
    });
  }
  return client;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

function computeHeuristicScore(metadata: VideoMetadata): number {
  const text = `${metadata.title || ''} ${metadata.description || ''} ${(metadata.tags || []).join(' ')}`.toLowerCase();

  const highRisk = [
    'subway surfers', 'ai voice', 'sigma', 'rizz', 'brainrot', 'clickbait', 'prank',
    'challenge', 'viral', 'insane', 'shocking', 'satisfying', 'skibidi', 'mrbeast', 'shorts'
  ];
  const lowRisk = [
    'tutorial', 'course', 'lecture', 'science', 'engineering', 'mathematics', 'algorithm',
    'documentation', 'deep dive', 'long form', 'dr. stone', 'history of', 'education', 'study'
  ];

  let score = metadata.isShorts ? 0.55 : 0.3;

  highRisk.forEach((k) => {
    if (text.includes(k)) score += 0.07;
  });

  lowRisk.forEach((k) => {
    if (text.includes(k)) score -= 0.08;
  });

  if ((metadata.title || '').length < 25) score += 0.05;
  if ((metadata.description || '').length > 500) score -= 0.04;

  return clamp01(score);
}

function parseAgentJson(content: string | null | undefined): Partial<BrainrotAnalysis> {
  if (!content) return {};
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function getUserBaseline(walletAddress: string): UserBaselineState {
  if (!USER_BASELINES[walletAddress]) {
    USER_BASELINES[walletAddress] = {
      samples: [],
      rollingBaseline: 0.5,
      aiWeight: 0.25,
    };
  }
  return USER_BASELINES[walletAddress];
}

function updateBaseline(state: UserBaselineState, score: number) {
  state.samples.push(score);
  if (state.samples.length > BASELINE_WINDOW) {
    state.samples.shift();
  }
  state.rollingBaseline = average(state.samples) || state.rollingBaseline;
  const historyRatio = Math.min(1, state.samples.length / BASELINE_WINDOW);
  state.aiWeight = Math.min(AI_MAX_INFLUENCE, 0.25 + historyRatio * 0.5);
}


export async function analyzeVideoContent(
  walletAddress: string,
  videoMetadata: VideoMetadata,
  durationSeconds: number
): Promise<BrainrotAnalysis> {
  // Log missing or empty metadata fields
  const missingFields: string[] = [];
  if (!videoMetadata.title) missingFields.push('title');
  if (!videoMetadata.description) missingFields.push('description');
  if (!videoMetadata.tags || !Array.isArray(videoMetadata.tags) || videoMetadata.tags.length === 0) missingFields.push('tags');
  if (!videoMetadata.url) missingFields.push('url');
  if (typeof videoMetadata.isShorts !== 'boolean') missingFields.push('isShorts');
  if (missingFields.length > 0) {
    logAgent(`${AGENT_LOG_PREFIX} MISSING_METADATA`, { missingFields, videoMetadata });
  }

  // Block or skip any test/placeholder shorts
  if ((videoMetadata.title || '').toLowerCase().includes('test shorts')) {
    logAgent(`${AGENT_LOG_PREFIX} SKIP_TEST_SHORTS`, { reason: 'Test/placeholder shorts detected, skipping analysis.', title: videoMetadata.title });
    return {
      rot_score: 0,
      rot_velocity: 0,
      reasoning: 'Skipped: Test/placeholder shorts detected.',
      source: 'fallback',
    };
  }

  logAgent(`${AGENT_LOG_PREFIX} FUNCTION_CALLED: Starting analysis for ${walletAddress}`);
  const baselineState = getUserBaseline(walletAddress);
  const heuristicScore = computeHeuristicScore(videoMetadata);

  logAgent(`${AGENT_LOG_PREFIX} INPUT`, {
    walletAddress,
    durationSeconds,
    metadata: {
      title: videoMetadata.title || '',
      description: videoMetadata.description || '',
      tags: videoMetadata.tags || [],
      url: videoMetadata.url || '',
      isShorts: !!videoMetadata.isShorts,
    },
    baseline: {
      rollingBaseline: baselineState.rollingBaseline,
      sampleCount: baselineState.samples.length,
      aiWeight: baselineState.aiWeight,
    },
    heuristicScore,
  });

  let agentScore = heuristicScore;
  let agentVelocity = heuristicScore;
  let agentReasoning = 'Fallback heuristic used because model response was unavailable.';
  let source: 'agent' | 'fallback' = 'fallback';

  if (process.env.GITHUB_TOKEN) {
    try {
      const agentPayload = {
        durationSeconds,
        metadata: videoMetadata,
        userBaseline: baselineState.rollingBaseline,
      };

      logAgent(`${AGENT_LOG_PREFIX} MODEL_REQUEST`, {
        model: AGENT_MODEL,
        payload: agentPayload,
      });

      const apiClient = getClient();
      const response = await apiClient.chat.completions.create({
        model: AGENT_MODEL,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content:
              "You are a Cognitive Auditor for attention quality. Evaluate YouTube metadata for brainrot intensity. Return ONLY JSON with keys: rot_score (0-1), rot_velocity (0-1), reasoning (string). High risk: clickbait, sensory overload, slop overlays, junk trends. Low risk: long-form, technical tutorials, educational science, Dr. Stone-like educational framing.",
          },
          {
            role: 'user',
            content: JSON.stringify(agentPayload),
          },
        ],
        response_format: { type: 'json_object' },
      });

      let rawContent: string | null = null;
      let parsed: Partial<BrainrotAnalysis> = {};
      try {
        rawContent = response.choices?.[0]?.message?.content;
        logAgent(`${AGENT_LOG_PREFIX} RAW_AGENT_RESPONSE`, { rawContent });
        parsed = parseAgentJson(rawContent) as Partial<BrainrotAnalysis>;
      } catch (parseError) {
        logAgent(`${AGENT_LOG_PREFIX} PARSE_ERROR`, {
          error: String((parseError as Error)?.message || parseError),
          rawContent,
          response,
        });
      }
      const parsedScore = clamp01(Number(parsed.rot_score));
      const parsedVelocity = clamp01(Number(parsed.rot_velocity));

      if (Number.isFinite(parsedScore)) {
        agentScore = parsedScore;
      } else {
        logAgent(`${AGENT_LOG_PREFIX} INVALID_SCORE`, { parsedScore, parsed });
      }
      if (Number.isFinite(parsedVelocity)) {
        agentVelocity = parsedVelocity;
      } else {
        logAgent(`${AGENT_LOG_PREFIX} INVALID_VELOCITY`, { parsedVelocity, parsed });
      }
      if (typeof parsed.reasoning === 'string' && parsed.reasoning.trim().length > 0) {
        agentReasoning = parsed.reasoning;
      } else {
        logAgent(`${AGENT_LOG_PREFIX} MISSING_REASONING`, { parsed });
      }
      source = 'agent';

      logAgent(`${AGENT_LOG_PREFIX} MODEL_RESPONSE`, {
        parsed,
        agentScore,
        agentVelocity,
      });
    } catch (error) {
      agentReasoning = `Fallback heuristic due to model error: ${String((error as Error)?.message || error)}`;
      logAgent(`${AGENT_LOG_PREFIX} MODEL_ERROR`, {
        error: String((error as Error)?.message || error),
        stack: (error as Error)?.stack,
      });
      if (typeof error === 'object' && error !== null) {
        logAgent(`${AGENT_LOG_PREFIX} MODEL_ERROR_OBJECT`, error);
      }
      logAgent(`${AGENT_LOG_PREFIX} FALLBACK_USED`, { reason: agentReasoning });
    }
  } else {
    agentReasoning = 'Fallback heuristic used because GITHUB_TOKEN is missing.';
    logAgent(`${AGENT_LOG_PREFIX} MODEL_DISABLED`, {
      reason: 'GITHUB_TOKEN is missing',
    });
  }

  const aiWeight = baselineState.aiWeight;
  const blendedScore = clamp01((1 - aiWeight) * heuristicScore + aiWeight * agentScore);

  const baselineGap = Math.max(0, blendedScore - baselineState.rollingBaseline);
  const minutes = Math.max(durationSeconds / 60, 0.05);
  const adaptiveVelocity = clamp01((0.45 * agentVelocity) + (0.55 * blendedScore) + Math.min(0.3, baselineGap * 1.2));
  const rotVelocity = clamp01(adaptiveVelocity * Math.min(1.2, 0.7 + minutes * 0.1));

  updateBaseline(baselineState, blendedScore);

  const fullReasoning = [
    `source=${source}`,
    `heuristic_score=${heuristicScore.toFixed(3)}`,
    `agent_score=${agentScore.toFixed(3)}`,
    `agent_weight=${aiWeight.toFixed(3)} (max ${AI_MAX_INFLUENCE})`,
    `baseline=${baselineState.rollingBaseline.toFixed(3)}`,
    `blended_score=${blendedScore.toFixed(3)}`,
    `rot_velocity=${rotVelocity.toFixed(3)}`,
    `agent_reasoning=${agentReasoning}`,
  ].join(' | ');

  logAgent(`${AGENT_LOG_PREFIX} DECISION`, {
    walletAddress,
    source,
    rot_score: blendedScore,
    rot_velocity: rotVelocity,
    aiWeight,
    baseline: baselineState.rollingBaseline,
    reasoning: fullReasoning,
  });

  return {
    rot_score: blendedScore,
    rot_velocity: rotVelocity,
    reasoning: fullReasoning,
    source,
  };
}
