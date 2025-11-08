// calc.js — growth calculations and sorting using multiplicative compounding

// Compute number of action days in the last N days from a dayLog { byDate: { 'YYYY-MM-DD': 1 }}
// Returns integer in [0..days]. If dayLog or dayLog.byDate is missing, returns 0.
export function computeActionDays(dayLog, todayKey, days = 7) {
  if (!dayLog || !dayLog.byDate) return 0;
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
  return computeActionDays(dayLog, todayKey, 7);
}

export function computeActionDaysLast30(dayLog, todayKey) {
  return computeActionDays(dayLog, todayKey, 30);
}

export function computeMomentum7(dayLog, todayKey) {
  const actionDays = computeActionDaysLast7(dayLog, todayKey);
  return Math.min(1, actionDays / 7);
}

export function computeGrowth(baseG = 0.001, momentum7 = 0) {
  // momentum7 must be in [0,1]
  const m = Math.max(0, Math.min(1, Number(momentum7) || 0));
  const raw = Number(baseG || 0) + 0.003 * m;
  // clamp both sides to avoid drift/out-of-range values
  const g = Math.max(0.001, Math.min(0.004, raw));
  return g;
}

export function applyCompounding(cumulativeGrowth, g) {
  // cumulativeGrowth stored as percentage (e.g., 1.5 means +1.5%)
  const cg = Number(cumulativeGrowth) || 0;
  const level = 1 + cg / 100;
  const next = level * (1 + Number(g) || 0);
  const newCum = (next - 1) * 100;
  // Round to 1e-6 to prevent drift when repeatedly compounding and storing
  return Math.round(newCum * 1e6) / 1e6;
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
  const currentPGI = Number(currentPersonalityGrowthIndex) || 0;
  const dailyContrib = Number(dailyContribution) || 0;
  const newPGI = currentPGI + dailyContrib;
  return Math.round(newPGI * 1e6) / 1e6;
}

/**
 * Calculate skill level from totalPoints using a non-linear progression.
 * level = floor(sqrt(totalPoints / 10))
 * Returns: { level, currentPoints, requiredPoints, totalPoints }
 */
export function calculateLevel(totalPoints) {
  // scale totalPoints so small fractional GP become more visible in progression
  const tpRaw = Number(totalPoints) || 0;
  const tp = tpRaw * 100; // scale: 1% -> 100 points
  const level = Math.floor(Math.sqrt(tp / 10));
  const pointsForCurrentLevel = 10 * Math.pow(level, 2);
  const pointsForNextLevel = 10 * Math.pow(level + 1, 2);
  const currentPoints = Math.max(0, tp - pointsForCurrentLevel);
  const requiredPoints = pointsForNextLevel - pointsForCurrentLevel;
  // keep numeric stability
  return {
    level,
    // round to integers after scaling for cleaner display
    currentPoints: Math.round(currentPoints),
    requiredPoints: Math.round(requiredPoints),
    totalPoints: Math.round(tp),
  };
}

/**
 * Calculate personality-level (same math) and map to a descriptive title.
 * Titles:
 * 0-9: Enthusiast
 * 10-19: Adept
 * 20-29: Virtuoso
 * 30-39: Expert
 * 40+: Master
 */
export function calculatePersonalityLevel(totalPoints) {
  const base = calculateLevel(totalPoints);
  const lvl = base.level;
  let title = 'Enthusiast';
  if (lvl >= 40) title = 'Master';
  else if (lvl >= 30) title = 'Expert';
  else if (lvl >= 20) title = 'Virtuoso';
  else if (lvl >= 10) title = 'Adept';

  return Object.assign({ title }, base);
}
