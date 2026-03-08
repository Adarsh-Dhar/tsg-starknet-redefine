# AI-Driven Brainrot Scoring Implementation Summary

## Overview
Successfully migrated from static duration-based scoring to an **AI-powered Cognitive Auditor** using GitHub Models (GPT-4o-mini) with adaptive baseline scoring, full audit trail, and agent-controlled slash/recovery mechanics.

---

## Architecture

### 1. AI Scoring Engine ([server/src/routes/data/analyze.ts](server/src/routes/data/analyze.ts))

**Core Features:**
- **Adaptive Baseline Tracking**: Maintains rolling 40-sample window per user to calculate personalized risk baseline
- **75% Max AI Influence**: Agent score is blended with deterministic heuristics using dynamic weight (0.25 → 0.75) that scales with user history
- **Dual Scoring System**: 
  - `rot_score` (0-1): Content quality assessment
  - `rot_velocity` (0-1): Decay/escalation rate factoring duration and baseline gap
- **Full Reasoning Trace**: Complete agent output + computed intermediate values preserved in responses and database
- **Graceful Fallback**: Heuristic-only mode if GITHUB_TOKEN missing or API errors occur

**Scoring Logic:**
```typescript
blendedScore = (1 - aiWeight) * heuristicScore + aiWeight * agentScore
rotVelocity = clamp01(
  0.45 * agentVelocity + 
  0.55 * blendedScore + 
  min(0.3, baselineGap * 1.2)
) * min(1.2, 0.7 + minutes * 0.1)
```

**User Baseline State:**
- Samples: Last 40 scoring events
- Rolling Baseline: Average of sample window
- AI Weight: Starts at 0.25, grows to 0.75 as history accumulates

---

### 2. Refactored Activity Endpoint ([server/src/routes/data/route.ts](server/src/routes/data/route.ts))

**Key Changes:**
- **New POST `/api/data/activity` Payload**: 
  - Accepts `metadata` object with `{ title, description, tags, url, isShorts }`
  - Per-user stats tracking (replaced global singleton)
- **Agent-Controlled Scoring**:
  - `grossIncrease = minutes * 100 * max(0.05, rot_velocity)`
  - Recovery mechanism: `recovery = isHealthySession ? minutes * 35 : 0`
  - Healthy session threshold: `rot_score < 0.35 && rot_velocity < 0.45`
- **Slash Trigger**: `shouldSlash = rot_score >= 0.8`
- **Audit Persistence**: Writes to `ScoringDecision`, `ActivityEvent`, and `ScoreLedger` tables on every activity report

**New `/api/data/analyze` Endpoint**:
- Returns raw analysis JSON without modifying user state (for debugging/testing)

---

### 3. Frontend Metadata Capture

#### [frontend/public/content.js](frontend/public/content.js)
- **New `extractVideoMetadata()` Helper**: Scrapes YouTube DOM for title, description, keywords
- **Expanded Reporting**: Sends `{ duration, metadata: { title, description, tags, url, isShorts } }`
- **Broadened Scope**: Now tracks both `/watch` and `/shorts/` routes (previously Shorts-only)

#### [frontend/public/background.js](frontend/public/background.js)
- **Metadata Relay**: Forwards `msg.metadata` to backend in all three listener paths (port connection, runtime message, legacy relay)

---

### 4. Database Schema Extensions ([server/prisma/schema.prisma](server/prisma/schema.prisma))

**New Models:**

```prisma
model ActivityEvent {
  id              String   @id @default(cuid())
  address         String
  videoUrl        String?
  videoTitle      String?
  videoDesc       String?
  isShorts        Boolean
  durationSeconds Int
  timestamp       DateTime @default(now())
  scoringId       String?  @unique
  scoring         ScoringDecision? @relation(fields: [scoringId], references: [id])
}

model Session {
  id              String   @id @default(cuid())
  address         String
  startTime       DateTime
  endTime         DateTime?
  totalDuration   Int
  eventCount      Int
  sessionType     String   // "healthy", "risky", "mixed"
  avgRotScore     Float
  avgRotVelocity  Float
}

model ScoreLedger {
  id              String   @id @default(cuid())
  address         String
  scoreBefore     Float
  scoreDelta      Float
  scoreAfter      Float
  reason          String   // "activity", "recovery", "slash", "manual"
  timestamp       DateTime @default(now())
  eventId         String?
}

model ScoringDecision {
  id              String   @id @default(cuid())
  address         String
  rotScore        Float
  rotVelocity     Float
  heuristicScore  Float
  agentScore      Float
  aiWeight        Float
  baseline        Float
  reasoning       String   // Full trace with all intermediate values
  source          String   // "agent" or "fallback"
  timestamp       DateTime @default(now())
  event           ActivityEvent?
}
```

**Migration Applied**: `20260308035626_add_agent_scoring_models`

---

### 5. Slash Route Integration ([server/src/routes/slash/route.ts](server/src/routes/slash/route.ts))

**Changes:**
- Added optional `reason` parameter to POST body
- Added `userAddress` validation
- Response now includes `reason` field for audit clarity

---

## Configuration Requirements

### Environment Variables (`.env`)
```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxx  # GitHub PAT with models:read scope
YT_API_KEY=xxxxxxxxxxxxxxxxxxxxx       # (Optional) YouTube Data API v3 key
STARKNET_RPC_URL=https://starknet-sepolia.public.blastapi.io
VAULT_ADDRESS=0x...
STARKNET_ACCOUNT_ADDRESS=0x...
STARKNET_PRIVATE_KEY=0x...
DATABASE_URL=file:./prisma/dev.db
```

### Dependencies Added
- `openai@^5.23.2` (server)

---

## Scoring Policy Summary

| Condition | Impact |
|-----------|--------|
| **High Risk Content** (slop keywords, clickbait, Shorts) | `rot_score` ↑ → faster brainrot accumulation |
| **Educational Content** (tutorials, Dr. Stone, long-form) | `rot_score` ↓ → triggers recovery mode |
| **Healthy Session** (`rot_score < 0.35` && `rot_velocity < 0.45`) | Decay: `-35 points/min` |
| **Risky Session** | Gross increase: `minutes * 100 * rot_velocity` |
| **Slash Threshold** | `rot_score >= 0.8` → sets `shouldSlash` flag (backend must invoke `/api/slash`) |

---

## Agent Behavior Characteristics

### Adaptive Learning
- **Cold Start**: AI influence = 25%, relies heavily on heuristics
- **Mature User**: AI influence grows to 75% after 40+ activity events
- **Baseline Drift Detection**: Rolling baseline updates continuously; agent adjusts velocity based on deviation from user's norm

### Guardrails
- AI score clamped to `[0, 1]`
- Blended score always within `[0, 1]`
- Fallback to heuristics if model unavailable
- Full reasoning trace preserved for dispute resolution

### Recovery Mechanics
- Watching educational content for 10 minutes at `rot_score=0.3` → `-350 points` brainrot decay
- Accumulating risky content at `rot_velocity=0.9` for 5 minutes → `+450 points` increase
- Net effect incentivizes diversified, high-quality watch patterns

---

## Testing & Validation

### Build Status
✅ TypeScript compilation passes  
✅ Prisma migration applied successfully  
✅ No runtime errors in server initialization

### Manual Testing Checklist
- [ ] Start server with `GITHUB_TOKEN` set → verify "agent" source in `/api/data/analyze` response
- [ ] Start server without `GITHUB_TOKEN` → verify "fallback" source + heuristic-only scoring
- [ ] Send activity with high-risk metadata (e.g., title="INSANE Subway Surfers PRANK") → expect `rot_score > 0.7`
- [ ] Send activity with educational metadata (e.g., title="Linear Algebra Lecture 12") → expect `rot_score < 0.4`
- [ ] Accumulate 10 healthy sessions → verify `healthySessions` counter increments and recovery decay applies
- [ ] Exceed `rot_score >= 0.8` → verify `shouldSlash: true` in response (manual `/api/slash` call required for on-chain action)

---

## Next Steps (Optional Enhancements)

1. **Automated Slash Worker**: Currently `shouldSlash` is informational; add background job to invoke `/api/slash` when threshold crossed
2. **Session Aggregation**: Implement session boundary detection (idle timeout) and persist to `Session` table for historical analysis
3. **Model Monitoring**: Log model latency, error rates, and confidence scores to detect drift or API issues
4. **User-Facing Insights**: Expose `reasoning` field in frontend to show "Why was this flagged?" explanations
5. **A/B Testing**: Add feature flag to toggle between agent-driven vs. static scoring for performance comparison
6. **Appeal Mechanism**: Admin endpoint to manually override scoring decisions and retrain baseline

---

## Risk Mitigation

| Risk | Mitigation Strategy |
|------|---------------------|
| **Model Downtime** | Heuristic fallback + `source` field tracking |
| **Non-Determinism** | Full reasoning trace + Prisma audit tables for replay |
| **Economic Attack** | 75% AI cap + clamped scores + baseline drift detection |
| **Privacy Concerns** | Video metadata stored locally (title/desc); no user PII sent to GitHub Models |
| **Latency** | Model calls are non-blocking; stats update immediately with heuristic, agent score enriches asynchronously |

---

## File Inventory

**Created:**
- [server/src/routes/data/analyze.ts](server/src/routes/data/analyze.ts) (186 lines)
- [server/prisma/migrations/20260308035626_add_agent_scoring_models/migration.sql](server/prisma/migrations/20260308035626_add_agent_scoring_models/migration.sql)

**Modified:**
- [server/src/routes/data/route.ts](server/src/routes/data/route.ts) (+85 lines)
- [server/src/routes/slash/route.ts](server/src/routes/slash/route.ts) (+4 lines)
- [server/package.json](server/package.json) (+1 dependency)
- [server/prisma/schema.prisma](server/prisma/schema.prisma) (+68 lines)
- [frontend/public/content.js](frontend/public/content.js) (+26 lines)
- [frontend/public/background.js](frontend/public/background.js) (+3 locations)

**Dependencies Installed:**
- `openai@5.23.2`

---

## Deployment Checklist

- [ ] Generate GitHub Personal Access Token with `models:read` scope
- [ ] Add `GITHUB_TOKEN` to server `.env`
- [ ] Run `pnpm install` in `server/` to resolve OpenAI peer dependency warnings (optional: upgrade `ws` and `zod`)
- [ ] Run `pnpm prisma migrate deploy` in production to apply schema changes
- [ ] Reload Chrome extension to pick up updated `content.js` and `background.js`
- [ ] Monitor server logs for `[ActivityRoute]` and `[analyzeVideoContent]` debug output
- [ ] Verify `ScoringDecision` table populates on first activity report

---

**Implementation Date**: March 8, 2026  
**Agent Model**: GitHub Models GPT-4o-mini  
**Compliance**: User-controlled baselines, adaptive policy, full audit trail
