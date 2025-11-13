/**
 * achievements engine — analyzes user data for today's temporary achievements
 *
 * API: analyzeAchievements(userData)
 * userData: {
 *   skills: [ { id, name, cumulativeGrowth, totalChecks, ... } ],
 *   dayLogs: { [skillId]: { byDate: { 'YYYY-MM-DD': value } } },
 *   todayKey?: 'YYYY-MM-DD' // optional (defaults to local today)
 * }
 *
 * Returns: [ { id, title, description, icon } ]
 */
import { computeActionDays } from './calc.js';
import { todayKey as getTodayKey } from './date.js';
import { ACHIEVEMENT_CONFIG, LEVEL_CONFIG } from './constants.js';

function parseYMD(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function daysBetween(aKey, bKey) {
  const a = parseYMD(aKey);
  const b = parseYMD(bKey);
  const diff = Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
  return Math.abs(diff); // Return absolute value to avoid negative gaps
}

// Calculate level from cumulative growth (GP) using fast skill progression formula
// base 25 GP, multiplier 1.15 (same as main calculateLevel in calc.js for skills)
function calculateLevel(cumulativeGrowth) {
  const gpDisplay = cumulativeGrowth * 100; // Convert to GP
  const BASE_GP_SKILL = 25;
  const MULTIPLIER_SKILL = 1.15;

  let level = 0;
  let totalPointsNeeded = 0;
  let pointsForNextLevel = BASE_GP_SKILL;

  while (gpDisplay >= totalPointsNeeded + pointsForNextLevel) {
    level++;
    totalPointsNeeded += pointsForNextLevel;
    pointsForNextLevel = Math.floor(BASE_GP_SKILL * Math.pow(MULTIPLIER_SKILL, level));
  }

  return level;
}

export function analyzeAchievements(userData = {}) {
  const skills = userData.skills || [];
  const dayLogs = userData.dayLogs || {};
  const todayKey = userData.todayKey || getTodayKey();

  const achievements = [];

  // Helper to get dayLog object for a skill id
  const getDayLog = (skillId) => {
    return dayLogs && dayLogs[skillId] ? dayLogs[skillId] : null;
  };

  // Calculate total checks across all skills (for first-time achievements)
  let totalChecksAllTime = 0;
  for (const s of skills) {
    totalChecksAllTime += s.totalChecks || 0;
  }

  // ========================================
  // FIRST-TIME ACHIEVEMENTS
  // ========================================

  // 1) The Journey Begins: Very first task ever completed
  if (totalChecksAllTime === 1) {
    achievements.push({
      id: 'first_step',
      title: 'The Journey Begins',
      description: "You've completed your very first task. Every great journey starts with a single step.",
      icon: '🌱'
    });
  }

  // 2) A New Skill: First skill added (detected when skill has 0 totalChecks and was just created)
  for (const s of skills) {
    if ((s.totalChecks || 0) === 0) {
      achievements.push({
        id: `new_skill_${s.id}`,
        title: 'A New Skill!',
        description: `You've added "${s.name}" to your list. Let the growth begin!`,
        icon: '✨'
      });
    }
  }

  // ========================================
  // QUANTITY-BASED ACHIEVEMENTS
  // ========================================

  // 3) Skill Collector: 5 skills in total
  if (skills.length === 5) {
    achievements.push({
      id: 'skill_collector',
      title: 'Skill Collector',
      description: "You now have 5 skills to grow. Your ambitions are inspiring!",
      icon: '📚'
    });
  }

  // 4) Power Day / Marathon Day: Based on tasks completed today
  let totalToday = 0;
  for (const s of skills) {
    const dl = getDayLog(s.id);
    if (dl && dl.byDate && dl.byDate[todayKey]) totalToday += 1;
  }
  
  if (totalToday >= 10) {
    // Marathon Day (higher threshold)
    achievements.push({
      id: 'marathon_day',
      title: 'Marathon Day',
      description: `Wow, ${totalToday} tasks in one day! You're on fire!`,
      icon: '☄️'
    });
  } else if (totalToday >= ACHIEVEMENT_CONFIG.HIT_DAY_THRESHOLD) {
    // Power Day (standard threshold)
    achievements.push({
      id: 'hit_day',
      title: 'Power Day',
      description: `You've completed ${totalToday} tasks today — what a great pace!`,
      icon: '🚀'
    });
  }

  // ========================================
  // PER-SKILL ACHIEVEMENTS
  // ========================================

  for (const s of skills) {
    const dl = getDayLog(s.id) || { byDate: {} };
    const byDate = dl.byDate || {};

    // ensure today's action exists for streak/comeback/level checks
    const didToday = !!byDate[todayKey];

    // ========================================
    // CONSISTENCY ACHIEVEMENTS
    // ========================================

    // 5) On a Roll: 3-day streak
    if (didToday) {
      const parts = todayKey.split('-').map(Number);
      const todayD = new Date(parts[0], parts[1] - 1, parts[2]);
      const yesterday = new Date(todayD); yesterday.setDate(todayD.getDate() - 1);
      const dayBefore = new Date(todayD); dayBefore.setDate(todayD.getDate() - 2);
      const ky1 = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
      const ky2 = `${dayBefore.getFullYear()}-${String(dayBefore.getMonth() + 1).padStart(2,'0')}-${String(dayBefore.getDate()).padStart(2,'0')}`;
      if (byDate[ky1] && byDate[ky2]) {
        achievements.push({
          id: `streak_${ACHIEVEMENT_CONFIG.STREAK_THRESHOLD}_${s.id}`,
          title: 'On a Roll!',
          description: `You've practiced "${s.name}" for ${ACHIEVEMENT_CONFIG.STREAK_THRESHOLD} days in a row. Keep it up!`,
          icon: '🔥'
        });
      }
    }

    // 6) Unstoppable: 7-day streak
    if (didToday) {
      let streakCount = 1; // Today counts
      const parts = todayKey.split('-').map(Number);
      const todayD = new Date(parts[0], parts[1] - 1, parts[2]);
      
      // Check previous 6 days
      let allPresent = true;
      for (let i = 1; i <= 6; i++) {
        const checkDate = new Date(todayD);
        checkDate.setDate(todayD.getDate() - i);
        const checkKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2,'0')}-${String(checkDate.getDate()).padStart(2,'0')}`;
        if (byDate[checkKey]) {
          streakCount++;
        } else {
          allPresent = false;
          break;
        }
      }
      
      if (allPresent && streakCount >= 7) {
        achievements.push({
          id: `streak_7_${s.id}`,
          title: 'Unstoppable!',
          description: `A 7-day streak in "${s.name}"! This is what consistency looks like.`,
          icon: '🏅'
        });
      }
    }

    // 7) Welcome Back: Comeback after long break
    if (didToday) {
      // find most recent previous day with an entry
      const dates = Object.keys(byDate).filter(k => k !== todayKey).sort();
      if (dates.length > 0) {
        const last = dates[dates.length - 1];
        const gap = daysBetween(todayKey, last);
        if (gap >= ACHIEVEMENT_CONFIG.COMEBACK_GAP_DAYS) {
          achievements.push({
            id: `comeback_${s.id}`,
            title: 'Welcome Back!',
            description: `You returned to "${s.name}" after a ${gap}-day break. Great to have you back on track!`,
            icon: '🔁'
          });
        }
      }
    }

    // ========================================
    // GROWTH ACHIEVEMENTS
    // ========================================

    // 8) Level Up: First time reaching Level 1
    const currentLevel = calculateLevel(s.cumulativeGrowth || 0);
    if (currentLevel === 1 && didToday) {
      // Check if this is the first time hitting level 1 (simplification: show if at level 1 and completed today)
      achievements.push({
        id: `level_up_1_${s.id}`,
        title: 'Level Up!',
        description: `Congratulations! You've reached Level 1 in "${s.name}".`,
        icon: '🎉'
      });
    }

    // 9) Master in the Making: Reached Level 5
    if (currentLevel === 5 && didToday) {
      achievements.push({
        id: `level_up_5_${s.id}`,
        title: 'Master in the Making',
        description: `You've reached Level 5 in "${s.name}". Your dedication is remarkable.`,
        icon: '👑'
      });
    }

    // ========================================
    // PERFORMANCE ACHIEVEMENTS
    // ========================================

    // 10) Personal Best: Improved numeric record
    const numericEntries = Object.keys(byDate)
      .map(k => ({k, v: byDate[k]}))
      .filter(it => typeof it.v === 'number' && !isNaN(it.v))
      .sort((a,b) => (a.k < b.k ? -1 : 1));
      
    if (numericEntries.length >= 2) {
      const last = numericEntries[numericEntries.length - 1];
      const prev = numericEntries[numericEntries.length - 2];
      if (last.k === todayKey && typeof last.v === 'number' && typeof prev.v === 'number') {
        if (last.v > prev.v) {
          const increase = prev.v === 0 ? null : Math.round(((last.v - prev.v) / Math.max(prev.v, 1)) * 100);
          const desc = increase === null 
            ? `New record in "${s.name}": ${last.v}!` 
            : `You've improved your record in "${s.name}" by +${increase}% (${prev.v} → ${last.v})!`;
          achievements.push({
            id: `personal_record_${s.id}`,
            title: 'Personal Best!',
            description: desc,
            icon: '🏆'
          });
        }
      }
    }
  }

  return achievements;
}

export default analyzeAchievements;
