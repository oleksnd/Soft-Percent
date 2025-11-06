// calc.js — growth calculations and sorting using multiplicative compounding

// Compute number of action days in the last 7 days from a dayLog { byDate: { 'YYYY-MM-DD': 1 }}
export function computeActionDaysLast7(dayLog, todayKey, days = 7) {
  if (!dayLog || !dayLog.byDate) return 0;
  let count = 0;
  const parts = todayKey.split('-').map(Number);
  const today = new Date(parts[0], parts[1] - 1, parts[2]);
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (dayLog.byDate[key]) count++;
  }
  return count;
}

export function computeMomentum7(dayLog, todayKey) {
  const actionDays = computeActionDaysLast7(dayLog, todayKey, 7);
  return Math.min(1, actionDays / 7);
}

export function computeGrowth(baseG, momentum7) {
  const g = baseG + 0.003 * momentum7;
  return Math.min(0.004, g);
}

export function applyCompounding(cumulativeGrowth, g) {
  // cumulativeGrowth stored as percentage (e.g., 1.5 means +1.5%)
  const level = 1 + (cumulativeGrowth || 0) / 100;
  const next = level * (1 + g);
  const newCum = (next - 1) * 100;
  return newCum;
}

export function sortSkills(skills) {
  return (skills || []).slice().sort((a, b) => {
    const ga = a.cumulativeGrowth || 0;
    const gb = b.cumulativeGrowth || 0;
    if (ga === gb) return (a.createdAt || 0) - (b.createdAt || 0);
    return gb - ga;
  });
}

export function aggregateSummary(skills) {
  const total = (skills || []).reduce((s, it) => s + (it.totalChecks || 0), 0);
  const avg = skills && skills.length ? Math.round(total / skills.length) : 0;
  return {totalChecks: total, avgPerSkill: avg};
}
