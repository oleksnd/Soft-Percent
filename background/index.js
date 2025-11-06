// background service worker (MV3)
// Self-contained version (no import statements) to avoid "import outside a module" if Chrome
// treats this file as a non-module during install. This inlines alarms and messaging logic.

// Basic storage helper (small wrapper around chrome.storage)
const STORAGE_KEYS = { META: 'sp_meta' };

function getStorage(key) {
  return new Promise((resolve) => chrome.storage.sync.get(key, (res) => resolve(res[key])));
}

function estimateSize(obj) {
  try { return new Blob([JSON.stringify(obj)]).size; } catch (e) { return JSON.stringify(obj).length; }
}

function safeSetItem(key, value) {
  // simple guard for chrome.storage.sync per-item limit
  const size = estimateSize(value);
  if (size > 7000) return Promise.reject(new Error('item size exceeds safe sync quota'));
  const o = {};
  o[key] = value;
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(o, () => {
      const err = chrome.runtime.lastError;
      if (err) return reject(err);
      resolve();
    });
  });
}

function safeSetAll(obj) {
  // write items one-by-one so we can enforce per-item size checks
  const promises = Object.keys(obj).map((k) => safeSetItem(k, obj[k]));
  return Promise.all(promises);
}

// small local helpers (todayKey, uuid) duplicated here to avoid imports
function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// onInstalled: init storage.version and welcome flag
chrome.runtime.onInstalled.addListener(() => {
  (async () => {
    const meta = (await getStorage(STORAGE_KEYS.META)) || {};
    meta.version = meta.version || 1;
    meta.welcome = meta.welcome || true;
    try {
      await safeSetItem(STORAGE_KEYS.META, meta);
    } catch (e) {
      // best-effort; ignore storage failures on install
    }
  })();
});

// Alarms: schedule daily-reset at ~00:05 local time and clear daily_ keys
function nextMidnightTimestamp() {
  const now = new Date();
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 5, 0, 0);
  return t.getTime();
}

function setupAlarms() {
  try {
    chrome.alarms.get('daily-reset', (a) => {
      if (!a) {
        const when = nextMidnightTimestamp();
        chrome.alarms.create('daily-reset', { when, periodInMinutes: 24 * 60 });
      }
    });
  } catch (e) {
    // ignore alarm creation errors
  }
}

function handleAlarm(alarm) {
  if (!alarm || !alarm.name) return Promise.resolve();
  if (alarm.name === 'daily-reset') {
    // Reset checksTodayCount for all skills at local midnight
    return new Promise((resolve) => {
      chrome.storage.sync.get(['skills'], (items) => {
        if (chrome.runtime.lastError) return resolve();
        const skills = items.skills || [];
        let changed = false;
        for (const s of skills) {
          if (s.checksTodayCount && s.checksTodayCount !== 0) {
            s.checksTodayCount = 0;
            changed = true;
          }
        }
        if (!changed) return resolve();
        chrome.storage.sync.set({skills}, () => resolve());
      });
    });
  }
  // rearm alarms (one-shot) — simply used to wake the worker; no-op here
  if (alarm.name && alarm.name.startsWith('rearm_')) {
    // nothing to do; state is stored in skill.rearmAt and will be enforced on CHECK_SKILL
    return Promise.resolve();
  }
  return Promise.resolve();
}

// Messaging handler — supports GET_STATE, ADD_SKILL, TOGGLE_CHECK_TODAY, SET_NAME
function getState() {
  return new Promise((resolve) => {
    // load everything once so we can include dayLog doneToday flags
    chrome.storage.sync.get(null, (items) => {
      const user = items.user || null;
      const today = todayKey();

      // helper: count action days in last N days from a dayLog
      const countActionDays = (dl, tKey, days) => {
        if (!dl || !dl.byDate) return 0;
        const parts = tKey.split('-').map(Number);
        const base = new Date(parts[0], parts[1] - 1, parts[2]);
        let cnt = 0;
        for (let i = 0; i < days; i++) {
          const d = new Date(base);
          d.setDate(base.getDate() - i);
          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          if (dl.byDate[k]) cnt++;
        }
        return cnt;
      };

      const skills = (items.skills || []).map((s) => {
        const dayLog = items[`daylog_${s.id}`] || {byDate: {}};
        const doneToday = !!(dayLog && dayLog.byDate && dayLog.byDate[today]);
        const actionDaysLast30 = countActionDays(dayLog, today, 30);
        const activityScore = Math.round(Math.min(100, Math.max(0, (actionDaysLast30 / 30) * 100)));
        return Object.assign({}, s, { doneToday, actionDaysLast30, activityScore });
      });

      // compute user-level summary: average cumulativeGrowth across skills, and mean activityScore
      let growthPercent = 0;
      let activityScore = 0;
      if (skills.length > 0) {
        growthPercent = skills.reduce((acc, it) => acc + (it.cumulativeGrowth || 0), 0) / skills.length;
        activityScore = Math.round(skills.reduce((acc, it) => acc + (it.activityScore || 0), 0) / skills.length);
      }

      const meta = items.meta || {};
      const summary = { growthPercent: Number(growthPercent.toFixed(2)), activityScore };
      resolve({user, skills, meta, summary});
    });
  });
}

function addSkill(payload) {
  if (!payload || !payload.name) return Promise.reject(new Error('invalid payload'));
  const skill = {
    id: uuidv4(),
    name: String(payload.name).trim(),
    emoji: payload.emoji || '⭐',
    category: payload.category || 'Other',
    createdAt: Date.now(),
    firstCheckAt: null,
    totalChecks: 0,
    cumulativeGrowth: 0,
    lastCheckAt: null,
    checksTodayCount: 0,
    rearmAt: 0
  };
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['skills'], (items) => {
      const skills = items.skills || [];
      skills.push(skill);
      safeSetItem('skills', skills).then(() => resolve(skill)).catch((err) => reject(err));
    });
  });
}

function checkSkill(skillId) {
  if (!skillId) return Promise.reject(new Error('skillId required'));
  const today = todayKey();
  const dayLogKey = `daylog_${skillId}`;
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get([dayLogKey, 'skills'], (items) => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
      const skills = items.skills || [];
      const idx = skills.findIndex((s) => s.id === skillId);
      if (idx === -1) return reject(new Error('skill not found'));
      const skill = skills[idx];
      const now = Date.now();

      // enforce 4-hour rearm
      if (skill.rearmAt && now < skill.rearmAt) {
        return reject(new Error('rearm'));
      }

      // enforce max 2 credited checks per local day
      const checksToday = skill.checksTodayCount || 0;
      if (checksToday >= 2) return reject(new Error('daily_cap'));

      // prepare dayLog
      const dayLog = items[dayLogKey] || {byDate: {}};

      // compute actionDaysLast7
      const computeActionDaysLast7 = (dl, tKey) => {
        if (!dl || !dl.byDate) return 0;
        const parts = tKey.split('-').map(Number);
        const todayD = new Date(parts[0], parts[1] - 1, parts[2]);
        let cnt = 0;
        for (let i = 0; i < 7; i++) {
          const d = new Date(todayD);
          d.setDate(todayD.getDate() - i);
          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          if (dl.byDate[k]) cnt++;
        }
        return cnt;
      };

      const actionDays = computeActionDaysLast7(dayLog, today);
      const momentum7 = Math.min(1, actionDays / 7);
      const baseG = 0.001;
      let g = baseG + 0.003 * momentum7;
      g = Math.min(0.004, g);

      const isSecond = checksToday === 1;
      const gAdjusted = isSecond ? 0.5 * g : g;

      // apply compounding on cumulativeGrowth stored as percent
      const prevLevel = 1 + ((skill.cumulativeGrowth || 0) / 100);
      const nextLevel = prevLevel * (1 + gAdjusted);
      skill.cumulativeGrowth = (nextLevel - 1) * 100;

      // update counts and times
      skill.totalChecks = (skill.totalChecks || 0) + 1;
      if (!skill.firstCheckAt) skill.firstCheckAt = now;
      skill.lastCheckAt = now;
      skill.checksTodayCount = (skill.checksTodayCount || 0) + 1;
      skill.rearmAt = now + 4 * 60 * 60 * 1000; // 4 hours

      // mark dayLog for done today
      dayLog.byDate = dayLog.byDate || {};
      dayLog.byDate[today] = 1;

      // persist skill and dayLog and schedule a rearm alarm
      const setObj = {};
      setObj[dayLogKey] = dayLog;
      setObj['skills'] = skills;
      safeSetAll(setObj).then(() => {
        try { chrome.alarms.create(`rearm_${skillId}`, {when: skill.rearmAt}); } catch (e) {}
        resolve({skill});
      }).catch((err) => reject(err));
    });
  });
}

function setName(name) {
  const n = typeof name === 'string' ? name.trim() : '';
  return new Promise((resolve, reject) => {
    const userObj = {name: n, mode: 'local', id: `local_${Math.random().toString(36).slice(2,9)}`};
    safeSetItem('user', userObj).then(() => resolve({name: n})).catch((err) => reject(err));
  });
}

function handleMessage(msg, sender) {
  if (!msg || !msg.type) return Promise.reject(new Error('invalid message'));
  switch (msg.type) {
    case 'GET_STATE':
      return getState();
    case 'ADD_SKILL':
      return addSkill(msg.payload);
    case 'CHECK_SKILL':
      return checkSkill(msg.payload && msg.payload.skillId);
    case 'SAVE_SKILLS':
      // payload: { skills: [...] }
      if (!msg.payload || !Array.isArray(msg.payload.skills)) return Promise.reject(new Error('invalid payload'));
      return safeSetItem('skills', msg.payload.skills).then(() => ({ok: true}));
    case 'GET_TODAY_STATUS':
      return getState(); // GET_STATE includes doneToday flags computed from dayLog
    case 'SET_NAME':
      return setName(msg.payload && msg.payload.name);
    default:
      return Promise.reject(new Error('unknown message type ' + String(msg.type)));
  }
}

// Boot
setupAlarms();

chrome.alarms.onAlarm.addListener((alarm) => {
  // handle alarm quietly
  handleAlarm(alarm).catch(() => {});
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleMessage(msg, sender).then((res) => sendResponse({ok: true, result: res})).catch((err) => sendResponse({ok: false, error: String(err)}));
  // keep channel open
  return true;
});
