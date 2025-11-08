/**
 * achievements engine — analyzes user data for today's temporary achievements
 *
 * API: analyzeAchievements(userData)
 * userData: {
 *   skills: [ { id, name, ... } ],
 *   dayLogs: { [skillId]: { byDate: { 'YYYY-MM-DD': value } } },
 *   todayKey?: 'YYYY-MM-DD' // optional (defaults to local today)
 * }
 *
 * Returns: [ { id, title, description, icon } ]
 */
import { computeActionDays } from './calc.js';

function todayKeyFromDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYMD(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function daysBetween(aKey, bKey) {
  const a = parseYMD(aKey);
  const b = parseYMD(bKey);
  const diff = Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export function analyzeAchievements(userData = {}) {
  const skills = userData.skills || [];
  const dayLogs = userData.dayLogs || {};
  const todayKey = userData.todayKey || todayKeyFromDate();

  const achievements = [];

  // Helper to get dayLog object for a skill id
  const getDayLog = (skillId) => {
    return dayLogs && dayLogs[skillId] ? dayLogs[skillId] : null;
  };

  // 1) Hit day: count total completed today across all skills (byDate value truthy)
  let totalToday = 0;
  for (const s of skills) {
    const dl = getDayLog(s.id);
    if (dl && dl.byDate && dl.byDate[todayKey]) totalToday += 1;
  }
  if (totalToday >= 5) {
    achievements.push({
      id: 'hit_day',
      title: 'Ударный день',
      description: `Вы выполнили ${totalToday} заданий сегодня — отличный темп!`,
      icon: '🚀'
    });
  }

  // Per-skill achievements
  for (const s of skills) {
    const dl = getDayLog(s.id) || { byDate: {} };
    const byDate = dl.byDate || {};

    // ensure today's action exists for streak/comeback/personal record checks
    const didToday = !!byDate[todayKey];

    // 2) 3-day streak: performed today && yesterday && dayBefore
    if (didToday) {
      const parts = todayKey.split('-').map(Number);
      const todayD = new Date(parts[0], parts[1] - 1, parts[2]);
      const yesterday = new Date(todayD); yesterday.setDate(todayD.getDate() - 1);
      const dayBefore = new Date(todayD); dayBefore.setDate(todayD.getDate() - 2);
      const ky1 = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
      const ky2 = `${dayBefore.getFullYear()}-${String(dayBefore.getMonth() + 1).padStart(2,'0')}-${String(dayBefore.getDate()).padStart(2,'0')}`;
      if (byDate[ky1] && byDate[ky2]) {
        achievements.push({
          id: `streak_3_${s.id}`,
          title: 'Набираете темп',
          description: `Вы выполняли «${s.name}» 3 дня подряд — продолжайте в том же духе!`,
          icon: '🔥'
        });
      }
    }

    // 3) Comeback: performed today and last performed more than or equal 7 days ago
    if (didToday) {
      // find most recent previous day with an entry
      const dates = Object.keys(byDate).filter(k => k !== todayKey).sort();
      if (dates.length > 0) {
        const last = dates[dates.length - 1];
        const gap = daysBetween(todayKey, last);
        if (gap >= 7) {
          achievements.push({
            id: `comeback_${s.id}`,
            title: 'Камбэк!',
            description: `Вы вернулись к «${s.name}» после перерыва в ${gap} дней — круто!`,
            icon: '🔁'
          });
        }
      }
    }

    // 4) Personal record: requires numeric quantities; compare last two numeric entries
    // Gather ordered date keys and numeric values
    const numericEntries = Object.keys(byDate).map(k => ({k, v: byDate[k]})).filter(it => typeof it.v === 'number' && !isNaN(it.v)).sort((a,b) => (a.k < b.k ? -1 : 1));
    if (numericEntries.length >= 2) {
      const last = numericEntries[numericEntries.length - 1];
      const prev = numericEntries[numericEntries.length - 2];
      if (last.k === todayKey && typeof last.v === 'number' && typeof prev.v === 'number') {
        if (last.v > prev.v) {
          const increase = prev.v === 0 ? null : Math.round(((last.v - prev.v) / Math.max(prev.v, 1)) * 100);
          const desc = increase === null ? `Новый результат в «${s.name}»: ${last.v}` : `Вы улучшили результат в «${s.name}» на +${increase}% (${prev.v} → ${last.v})`;
          achievements.push({
            id: `personal_record_${s.id}`,
            title: 'Личный рекорд!',
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
