// background service worker (MV3)
// Centralized state management with proper error handling and no code duplication

import { todayKey, nextLocalMidnight } from '../utils/date.js';
import { v4 as uuidv4 } from '../utils/id.js';
import { 
  computeActionDays, 
  computeMomentum7, 
  computeGrowth, 
  applyCompounding 
} from '../utils/calc.js';
import { 
  STORAGE_KEYS, 
  STORAGE_LIMITS, 
  GROWTH_CONFIG, 
  TIME_CONSTANTS, 
  DAILY_LIMITS 
} from '../utils/constants.js';

/**
 * Storage helper functions with error handling
 */
function getStorage(key) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get(key, (res) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(res[key]);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

function estimateSize(obj) {
  try { 
    return new Blob([JSON.stringify(obj)]).size; 
  } catch (e) { 
    return JSON.stringify(obj).length; 
  }
}

function safeSetItem(key, value) {
  return new Promise((resolve, reject) => {
    try {
      const size = estimateSize(value);
      if (size > STORAGE_LIMITS.SYNC_ITEM_SAFE_SIZE) {
        return reject(new Error(`Item size (${size} bytes) exceeds safe sync quota (${STORAGE_LIMITS.SYNC_ITEM_SAFE_SIZE} bytes)`));
      }
      
      const o = {};
      o[key] = value;
      
      chrome.storage.sync.set(o, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

function safeSetAll(obj) {
  const promises = Object.keys(obj).map((k) => safeSetItem(k, obj[k]));
  return Promise.all(promises);
}

/**
 * Alarms setup and handling
 */
function setupAlarms() {
  try {
    chrome.alarms.get('daily-reset', (a) => {
      if (!a) {
        const when = nextLocalMidnight();
        chrome.alarms.create('daily-reset', { 
          when, 
          periodInMinutes: 24 * 60 
        });
      }
    });
  } catch (e) {
    console.error('Failed to setup alarms:', e);
  }
}

async function handleAlarm(alarm) {
  if (!alarm || !alarm.name) return;
  
  if (alarm.name === 'daily-reset') {
    try {
      const items = await new Promise((resolve) => {
        chrome.storage.sync.get([STORAGE_KEYS.SKILLS], (res) => resolve(res));
      });
      
      const skills = items[STORAGE_KEYS.SKILLS] || [];
      let changed = false;
      
      for (const s of skills) {
        if (s.checksTodayCount && s.checksTodayCount !== 0) {
          s.checksTodayCount = 0;
          changed = true;
        }
      }
      
      if (changed) {
        await safeSetItem(STORAGE_KEYS.SKILLS, skills);
      }
    } catch (error) {
      console.error('Daily reset failed:', error);
    }
  }
  
  // Rearm alarms are handled via rearmAt timestamp check in checkSkill
}

/**
 * GET_STATE: Load complete application state
 * This is the only place that reads storage for state assembly
 */
async function getState() {
  try {
    const items = await new Promise((resolve) => {
      chrome.storage.sync.get(null, (res) => resolve(res));
    });
    
    const user = items[STORAGE_KEYS.USER] || null;
    const today = todayKey();
    
    // Helper: count action days using centralized calc.js function
    const countActionDays = (dl, tKey, days) => {
      return computeActionDays(dl, tKey, days);
    };
    
    // Enrich skills with computed fields
    const rawSkills = items[STORAGE_KEYS.SKILLS] || [];
    const skills = rawSkills.map((s) => {
      const dayLog = items[`${STORAGE_KEYS.DAYLOG_PREFIX}${s.id}`] || {byDate: {}};
      const doneToday = !!(dayLog && dayLog.byDate && dayLog.byDate[today]);
      const actionDaysLast30 = countActionDays(dayLog, today, TIME_CONSTANTS.ACTIVITY_LOOKBACK_DAYS);
      const actionDaysLast7 = countActionDays(dayLog, today, TIME_CONSTANTS.MOMENTUM_LOOKBACK_DAYS);
      const activityScore = Math.round(Math.min(100, Math.max(0, (actionDaysLast30 / TIME_CONSTANTS.ACTIVITY_LOOKBACK_DAYS) * 100)));
      return Object.assign({}, s, { doneToday, actionDaysLast30, actionDaysLast7, activityScore });
    });
    
    // Compute user-level summary
    let growthPercent = 0;
    let activityScore = 0;
    let personalityGrowthIndex = 0;
    let dailyGP = 0;
    
    if (skills.length > 0) {
      growthPercent = skills.reduce((acc, it) => acc + (it.cumulativeGrowth || 0), 0) / skills.length;
      activityScore = Math.round(skills.reduce((acc, it) => acc + (it.activityScore || 0), 0) / skills.length);
      
      // Personality Growth Index: direct SUM of GP across all skills
      const totalCum = skills.reduce((acc, it) => acc + (it.cumulativeGrowth || 0), 0);
      personalityGrowthIndex = Math.round(totalCum * 100);
      
      // BUGFIX: Compute today's GP earned using ENRICHED skills array (has checksTodayCount)
      for (const s of skills) {
        const dayLog = items[`${STORAGE_KEYS.DAYLOG_PREFIX}${s.id}`] || {byDate: {}};
        const actionDays7 = countActionDays(dayLog, today, TIME_CONSTANTS.MOMENTUM_LOOKBACK_DAYS);
        const momentum7 = Math.min(1, actionDays7 / TIME_CONSTANTS.MOMENTUM_LOOKBACK_DAYS);
        const g = computeGrowth(GROWTH_CONFIG.BASE_RATE, momentum7);
        const checksToday = s.checksTodayCount || 0;
        
        let contrib = 0;
        if (checksToday >= 1) contrib += g;
        if (checksToday >= 2) contrib += GROWTH_CONFIG.SECOND_CHECK_MULTIPLIER * g;
        
        dailyGP += Math.round(contrib * 100);
      }
    }
    
    const meta = items[STORAGE_KEYS.META] || {};
    
    // Calculate global unique active days in last 7 days
    let uniqueActiveDaysLast7 = 0;
    if (rawSkills.length > 0) {
      const last7Days = [];
      const now = new Date();
      for (let i = 0; i < TIME_CONSTANTS.MOMENTUM_LOOKBACK_DAYS; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        last7Days.push(todayKey(d));
      }
      
      const activeDaysSet = new Set();
      for (const s of rawSkills) {
        const dayLog = items[`${STORAGE_KEYS.DAYLOG_PREFIX}${s.id}`] || {byDate: {}};
        for (const dayKey of last7Days) {
          if (dayLog.byDate && dayLog.byDate[dayKey]) {
            activeDaysSet.add(dayKey);
          }
        }
      }
      uniqueActiveDaysLast7 = activeDaysSet.size;
    }
    
    const summary = { 
      growthPercent: Number(growthPercent.toFixed(2)), 
      activityScore, 
      personalityGrowthIndex, 
      dailyGP, 
      uniqueActiveDaysLast7,
      todayKey: today 
    };
    
    // Include dayLogs map for achievements analysis
    const dayLogs = {};
    for (const s of rawSkills) {
      dayLogs[s.id] = items[`${STORAGE_KEYS.DAYLOG_PREFIX}${s.id}`] || {byDate: {}};
    }
    
    return { user, skills, meta, summary, dayLogs };
  } catch (error) {
    console.error('getState failed:', error);
    throw error;
  }
}

/**
 * ADD_SKILL: Create a new skill
 * ATOMIC OPERATION - no race condition possible
 */
async function addSkill(payload) {
  if (!payload || !payload.name) {
    throw new Error('Skill name is required');
  }
  
  const name = String(payload.name).trim();
  if (name.length === 0) {
    throw new Error('Skill name cannot be empty');
  }
  if (name.length > DAILY_LIMITS.MAX_SKILL_NAME_LENGTH) {
    throw new Error(`Skill name too long (max ${DAILY_LIMITS.MAX_SKILL_NAME_LENGTH} characters)`);
  }
  
  const skill = {
    id: uuidv4(),
    name,
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
  
  try {
    const items = await new Promise((resolve) => {
      chrome.storage.sync.get([STORAGE_KEYS.SKILLS], (res) => resolve(res));
    });
    
    const skills = items[STORAGE_KEYS.SKILLS] || [];
    skills.push(skill);
    
    await safeSetItem(STORAGE_KEYS.SKILLS, skills);
    return skill;
  } catch (error) {
    console.error('addSkill failed:', error);
    throw error;
  }
}

/**
 * CHECK_SKILL: Record a skill check with growth calculation
 * ATOMIC OPERATION - reads and writes in single transaction
 */
async function checkSkill(skillId) {
  if (!skillId) {
    throw new Error('Skill ID is required');
  }
  
  const dayLogKey = `${STORAGE_KEYS.DAYLOG_PREFIX}${skillId}`;
  const today = todayKey();
  const now = Date.now();
  
  try {
    const items = await new Promise((resolve) => {
      chrome.storage.sync.get([dayLogKey, STORAGE_KEYS.SKILLS], (res) => resolve(res));
    });
    
    const skills = items[STORAGE_KEYS.SKILLS] || [];
    const idx = skills.findIndex((s) => s.id === skillId);
    
    if (idx === -1) {
      throw new Error('Skill not found');
    }
    
    const skill = skills[idx];
    
    // Enforce rearm period
    if (skill.rearmAt && now < skill.rearmAt) {
      const remainingMs = skill.rearmAt - now;
      const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
      throw new Error(`REARM:Please wait ${remainingHours} more hour(s) before checking again`);
    }
    
    // Enforce daily check limit
    const checksToday = skill.checksTodayCount || 0;
    if (checksToday >= DAILY_LIMITS.MAX_CHECKS_PER_DAY) {
      throw new Error('DAILY_CAP:Maximum checks per day reached. Try again tomorrow!');
    }
    
    // Prepare dayLog
    const dayLog = items[dayLogKey] || {byDate: {}};
    
    // Calculate growth using centralized calc.js functions
    const momentum7 = computeMomentum7(dayLog, today);
    const g = computeGrowth(GROWTH_CONFIG.BASE_RATE, momentum7);
    
    // Apply second-check penalty
    const isSecond = checksToday === 1;
    const gAdjusted = isSecond ? GROWTH_CONFIG.SECOND_CHECK_MULTIPLIER * g : g;
    
    // Apply compounding
    skill.cumulativeGrowth = applyCompounding(skill.cumulativeGrowth, gAdjusted);
    
    // Update counts and timestamps
    skill.totalChecks = (skill.totalChecks || 0) + 1;
    if (!skill.firstCheckAt) skill.firstCheckAt = now;
    skill.lastCheckAt = now;
    skill.checksTodayCount = (skill.checksTodayCount || 0) + 1;
    skill.rearmAt = now + TIME_CONSTANTS.REARM_DURATION_MS;
    
    // Mark dayLog for today
    dayLog.byDate = dayLog.byDate || {};
    dayLog.byDate[today] = 1;
    
    // Persist both skill list and dayLog atomically
    const setObj = {};
    setObj[dayLogKey] = dayLog;
    setObj[STORAGE_KEYS.SKILLS] = skills;
    
    await safeSetAll(setObj);
    
    // Schedule rearm alarm
    try {
      chrome.alarms.create(`rearm_${skillId}`, { when: skill.rearmAt });
    } catch (e) {
      console.warn('Failed to create rearm alarm:', e);
    }
    
    // Return updated state so UI can update immediately
    return await getState();
  } catch (error) {
    console.error('checkSkill failed:', error);
    throw error;
  }
}

/**
 * UPDATE_SKILL: Update skill properties
 * ATOMIC OPERATION - replaces GET_STATE + SAVE_SKILLS pattern from popup
 */
async function updateSkill(skillId, patch) {
  if (!skillId) {
    throw new Error('Skill ID is required');
  }
  if (!patch || typeof patch !== 'object') {
    throw new Error('Patch object is required');
  }
  
  try {
    const items = await new Promise((resolve) => {
      chrome.storage.sync.get([STORAGE_KEYS.SKILLS], (res) => resolve(res));
    });
    
    const skills = items[STORAGE_KEYS.SKILLS] || [];
    const idx = skills.findIndex((s) => s.id === skillId);
    
    if (idx === -1) {
      throw new Error('Skill not found');
    }
    
    // Apply patch (whitelist allowed fields to prevent corruption)
    const allowedFields = ['name', 'emoji', 'category'];
    const updated = { ...skills[idx] };
    
    for (const field of allowedFields) {
      if (field in patch) {
        if (field === 'name') {
          const name = String(patch.name).trim();
          if (name.length === 0) throw new Error('Skill name cannot be empty');
          if (name.length > DAILY_LIMITS.MAX_SKILL_NAME_LENGTH) {
            throw new Error(`Skill name too long (max ${DAILY_LIMITS.MAX_SKILL_NAME_LENGTH} characters)`);
          }
          updated.name = name;
        } else {
          updated[field] = patch[field];
        }
      }
    }
    
    skills[idx] = updated;
    await safeSetItem(STORAGE_KEYS.SKILLS, skills);
    
    return updated;
  } catch (error) {
    console.error('updateSkill failed:', error);
    throw error;
  }
}

/**
 * DELETE_SKILL: Remove a skill and its daylog
 * ATOMIC OPERATION - removes skill and cleans up associated data
 */
async function deleteSkill(skillId) {
  if (!skillId) {
    throw new Error('Skill ID is required');
  }
  
  try {
    const dayLogKey = `${STORAGE_KEYS.DAYLOG_PREFIX}${skillId}`;
    
    const items = await new Promise((resolve) => {
      chrome.storage.sync.get([STORAGE_KEYS.SKILLS], (res) => resolve(res));
    });
    
    const skills = items[STORAGE_KEYS.SKILLS] || [];
    const filtered = skills.filter((s) => s.id !== skillId);
    
    if (filtered.length === skills.length) {
      throw new Error('Skill not found');
    }
    
    // Remove skill from array
    await safeSetItem(STORAGE_KEYS.SKILLS, filtered);
    
    // Clean up daylog
    await new Promise((resolve) => {
      chrome.storage.sync.remove([dayLogKey], () => resolve());
    });
    
    return { success: true };
  } catch (error) {
    console.error('deleteSkill failed:', error);
    throw error;
  }
}

/**
 * SET_NAME: Update user name
 */
async function setName(name) {
  const n = typeof name === 'string' ? name.trim() : '';
  
  try {
    const userObj = {
      name: n, 
      mode: 'local', 
      id: `local_${Math.random().toString(36).slice(2, 9)}`
    };
    
    await safeSetItem(STORAGE_KEYS.USER, userObj);
    return { name: n };
  } catch (error) {
    console.error('setName failed:', error);
    throw error;
  }
}

/**
 * Reset account - completely clear all data and reinitialize
 */
async function resetAccount() {
  try {
    // Clear all chrome.storage.sync data
    await new Promise((resolve, reject) => {
      chrome.storage.sync.clear(() => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
    
    // Reinitialize with fresh meta and user data
    const meta = {
      version: 1,
      welcome: true
    };
    
    const user = {
      name: '',
      mode: 'local'
    };
    
    await safeSetItem(STORAGE_KEYS.META, meta);
    await safeSetItem(STORAGE_KEYS.USER, user);
    await safeSetItem(STORAGE_KEYS.SKILLS, []);
    
    // Clear all alarms and re-setup
    await new Promise((resolve) => {
      chrome.alarms.clearAll(() => resolve());
    });
    setupAlarms();
    
    return { ok: true, message: 'Account reset successfully' };
  } catch (error) {
    console.error('Reset account failed:', error);
    throw new Error('Failed to reset account: ' + error.message);
  }
}

/**
 * Message handler with structured error responses
 */
async function handleMessage(msg, sender) {
  if (!msg || !msg.type) {
    throw new Error('Invalid message: type is required');
  }
  
  try {
    switch (msg.type) {
      case 'GET_STATE':
        return await getState();
      
      case 'ADD_SKILL':
        return await addSkill(msg.payload);
      
      case 'CHECK_SKILL':
        if (!msg.payload || !msg.payload.skillId) {
          throw new Error('Skill ID is required');
        }
        return await checkSkill(msg.payload.skillId);
      
      case 'UPDATE_SKILL':
        if (!msg.payload || !msg.payload.skillId) {
          throw new Error('Skill ID is required');
        }
        return await updateSkill(msg.payload.skillId, msg.payload.patch);
      
      case 'DELETE_SKILL':
        if (!msg.payload || !msg.payload.skillId) {
          throw new Error('Skill ID is required');
        }
        return await deleteSkill(msg.payload.skillId);
      
      case 'SET_NAME':
        if (!msg.payload) {
          throw new Error('Payload is required');
        }
        return await setName(msg.payload.name);
      
      case 'RESET_ACCOUNT':
        return await resetAccount();
      
      // Legacy support for SAVE_SKILLS (deprecated - use UPDATE_SKILL instead)
      case 'SAVE_SKILLS':
        console.warn('SAVE_SKILLS is deprecated. Use UPDATE_SKILL for atomic operations.');
        if (!msg.payload || !Array.isArray(msg.payload.skills)) {
          throw new Error('Invalid payload: skills array is required');
        }
        await safeSetItem(STORAGE_KEYS.SKILLS, msg.payload.skills);
        return { ok: true };
      
      default:
        throw new Error(`Unknown message type: ${msg.type}`);
    }
  } catch (error) {
    // Structured error for better UI handling
    const errorCode = error.message.includes(':') 
      ? error.message.split(':')[0] 
      : 'ERROR';
    const errorMessage = error.message.includes(':') 
      ? error.message.split(':')[1] 
      : error.message;
    
    throw { code: errorCode, message: errorMessage };
  }
}

/**
 * Initialization and event listeners
 */

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const meta = (await getStorage(STORAGE_KEYS.META)) || {};
    meta.version = meta.version || 1;
    meta.welcome = meta.welcome || true;
    await safeSetItem(STORAGE_KEYS.META, meta);
  } catch (e) {
    console.error('Installation initialization failed:', e);
  }
});

// Setup alarms on worker start (resilient to worker termination)
setupAlarms();

// Alarm listener
chrome.alarms.onAlarm.addListener((alarm) => {
  handleAlarm(alarm).catch((error) => {
    console.error('Alarm handler failed:', error);
  });
});

// Message listener with proper error handling
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Re-establish alarms on every message (cheap check, ensures resilience)
  setupAlarms();
  
  handleMessage(msg, sender)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => {
      const errorObj = typeof error === 'object' && error.code 
        ? error 
        : { code: 'ERROR', message: String(error) };
      
      sendResponse({ 
        ok: false, 
        error: errorObj.message,
        code: errorObj.code
      });
    });
  
  // Keep channel open for async response
  return true;
});

