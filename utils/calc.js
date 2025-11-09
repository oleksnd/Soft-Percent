// calc.js — growth calculations and sorting using multiplicative compounding

import { 
  GROWTH_CONFIG, 
  LEVEL_CONFIG, 
  TIME_CONSTANTS, 
  PRECISION,
  DAILY_LIMITS 
} from './constants.js';

// Compute number of action days in the last N days from a dayLog { byDate: { 'YYYY-MM-DD': 1 }}
// Returns integer in [0..days]. If dayLog or dayLog.byDate is missing, returns 0.
export function computeActionDays(dayLog, todayKey, days = TIME_CONSTANTS.MOMENTUM_LOOKBACK_DAYS) {
  if (!dayLog || !dayLog.byDate) return 0;
  if (days <= 0) return 0; // Guard against invalid input
  
  let count = 0;
  const parts = String(todayKey).split('-').map(Number);
  const today = new Date(parts[0], parts[1] - 1, parts[2]);
  
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (dayLog.byDate[key]) count++;
  }
  return count;
}

// Backwards-compatible wrappers
export function computeActionDaysLast7(dayLog, todayKey) {
  return computeActionDays(dayLog, todayKey, TIME_CONSTANTS.MOMENTUM_LOOKBACK_DAYS);
}

export function computeActionDaysLast30(dayLog, todayKey) {
  return computeActionDays(dayLog, todayKey, TIME_CONSTANTS.ACTIVITY_LOOKBACK_DAYS);
}

export function computeMomentum7(dayLog, todayKey) {
  const actionDays = computeActionDaysLast7(dayLog, todayKey);
  return Math.min(1, actionDays / TIME_CONSTANTS.MOMENTUM_LOOKBACK_DAYS);
}

export function computeGrowth(baseG = GROWTH_CONFIG.BASE_RATE, momentum7 = 0) {
  // momentum7 must be in [0,1]
  const m = Math.max(0, Math.min(1, Number(momentum7) || 0));
  const raw = Number(baseG || 0) + GROWTH_CONFIG.MOMENTUM_BONUS * m;
  // clamp both sides to avoid drift/out-of-range values
  const g = Math.max(GROWTH_CONFIG.MIN_RATE, Math.min(GROWTH_CONFIG.MAX_RATE, raw));
  return g;
}

export function applyCompounding(cumulativeGrowth, g) {
  // cumulativeGrowth stored as percentage (e.g., 1.5 means +1.5%)
  const cg = Number(cumulativeGrowth) || 0;
  const level = 1 + cg / 100;
  const next = level * (1 + (Number(g) || 0));
  const newCum = (next - 1) * 100;
  // Round to prevent drift when repeatedly compounding and storing
  return Math.round(newCum * PRECISION.CUMULATIVE_GROWTH_MULTIPLIER) / PRECISION.CUMULATIVE_GROWTH_MULTIPLIER;
}

export function sortSkills(skills) {
  return (skills || []).slice().sort((a, b) => {
    const ga = a.cumulativeGrowth || 0;
    const gb = b.cumulativeGrowth || 0;
    if (ga === gb) return (a.createdAt || 0) - (b.createdAt || 0);
    return gb - ga;
  });
}

export function aggregateSummary(skills, options = {}) {
  const list = skills || [];
  const total = list.reduce((s, it) => s + (it.totalChecks || 0), 0);
  const avg = list.length ? Math.round(total / list.length) : 0;

  // Default activityScore is 0 for backward compatibility
  let activityScore = 0;
  // Sum of today's growth contributions (sum of g for skills completed today)
  let dailyContribution = 0;

  const todayKey = options.todayKey;
  const dayLogs = options.dayLogs; // optional map: skillId -> dayLog
  const getDayLog = typeof options.getDayLog === 'function' ? options.getDayLog : null;

  if (todayKey && (dayLogs || getDayLog)) {
    // Compute per-skill 30-day activity scores
    let sumScore = 0;
    for (const s of list) {
      const dl = getDayLog ? getDayLog(s) : (dayLogs && dayLogs[s.id]);
      const d30 = computeActionDaysLast30(dl, todayKey);
      const perSkillScore = (d30 / 30) * 100;
      sumScore += perSkillScore;
      // accumulate today's contribution: if skill has a record for today, compute g and add
      if (dl && dl.byDate && dl.byDate[todayKey]) {
        const momentum7 = computeMomentum7(dl, todayKey);
        const g = computeGrowth(0.001, momentum7);
        dailyContribution += g;
      }
    }
    activityScore = list.length ? Math.round(sumScore / list.length) : 0;
  }

  return {totalChecks: total, avgPerSkill: avg, activityScore, dailyContribution};
}

// Personality growth accumulator: simple addition of daily contributions
export function applyPersonalityGrowth(currentPersonalityGrowthIndex, dailyContribution) {
  // currentPersonalityGrowthIndex and dailyContribution are expressed in GP (integer-like)
  const currentPGI = Math.round(Number(currentPersonalityGrowthIndex) || 0);
  const dailyContrib = Math.round(Number(dailyContribution) || 0);
  const newPGI = currentPGI + dailyContrib;
  return Math.round(newPGI);
}

/**
 * Calculate skill level from totalPoints using a non-linear progression.
 * level = floor(LEVEL_CONFIG.SKILL_LEVEL_COEFFICIENT * sqrt(totalPoints))
 * Returns: { level, currentPoints, requiredPoints, totalPoints }
 */
export function calculateLevel(totalPoints) {
  // Skill level formula: level = floor(0.1 * sqrt(totalPoints))
  // This makes early levels reachable (level 1 at 100 GP) and scales up for higher levels.
  const tp = Number(totalPoints) || 0; // totalPoints expressed in GP (1% == 1 GP)
  const level = Math.floor(LEVEL_CONFIG.SKILL_LEVEL_COEFFICIENT * Math.sqrt(tp));
  
  // Points needed for current and next level using derived formula:
  // pointsForLevel(L) = (L / coefficient)^2
  const pointsForLevel = (lvl) => Math.pow(lvl / LEVEL_CONFIG.SKILL_LEVEL_COEFFICIENT, 2);
  const pointsForCurrentLevel = pointsForLevel(level);
  const pointsForNextLevel = pointsForLevel(level + 1);
  const currentPoints = Math.max(0, tp - pointsForCurrentLevel);
  const requiredPoints = pointsForNextLevel - pointsForCurrentLevel;

  return {
    level,
    // preserve fractional visibility for small GP values (show two decimals)
    currentPoints: Math.round(currentPoints * 100) / 100,
    requiredPoints: Math.round(requiredPoints),
    totalPoints: Math.round(tp * 100) / 100,
  };
}

/**
 * Calculate personality-level and map to a descriptive title.
 * Uses different coefficient for slower, more balanced progression.
 * Titles defined in LEVEL_CONFIG.PERSONALITY_TITLES
 */
export function calculatePersonalityLevel(totalPoints) {
  // totalPoints is expected in GP units (integer-like)
  const tp = Number(totalPoints) || 0;
  // Personality level formula: level = floor(0.0447 * sqrt(totalPoints))
  const level = Math.floor(LEVEL_CONFIG.PERSONALITY_LEVEL_COEFFICIENT * Math.sqrt(tp));

  // Inverse: points required for a given level:
  // pointsForLevel = (level / 0.0447)^2
  const pointsForLevel = (lvl) => Math.pow((lvl / LEVEL_CONFIG.PERSONALITY_LEVEL_COEFFICIENT), 2);
  const pointsForCurrentLevel = Math.max(0, pointsForLevel(level));
  const pointsForNextLevel = Math.max(0, pointsForLevel(level + 1));
  const currentPoints = Math.max(0, tp - pointsForCurrentLevel);
  const requiredPoints = Math.max(0, Math.round(pointsForNextLevel - pointsForCurrentLevel));

  // Determine title based on level thresholds
  let title = LEVEL_CONFIG.PERSONALITY_TITLES[0];
  const thresholds = Object.keys(LEVEL_CONFIG.PERSONALITY_TITLES)
    .map(Number)
    .sort((a, b) => b - a); // Sort descending
  
  for (const threshold of thresholds) {
    if (level >= threshold) {
      title = LEVEL_CONFIG.PERSONALITY_TITLES[threshold];
      break;
    }
  }

  return {
    title,
    level,
    currentPoints: Math.round(currentPoints),
    requiredPoints: Math.round(requiredPoints),
    totalPoints: Math.round(tp),
  };
}
