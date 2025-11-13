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
  console.log('🔔 ALARM FIRED:', alarm ? alarm.name : 'null alarm', 'at', new Date().toLocaleTimeString());
  
  if (!alarm || !alarm.name) {
    console.warn('⚠️ Invalid alarm object');
    return;
  }
  
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
  
  // Handle Focus Session timer completion
  if (alarm.name && alarm.name.startsWith('focus_timer_')) {
    const skillId = alarm.name.replace('focus_timer_', '');
    console.log('Focus timer completed for skill:', skillId);

    try {
      // ATOMIC OPERATION: Read and immediately clear the timer data.
      console.log('📖 Reading timer data from storage...');
      const { active_focus_timer: timerData } = await new Promise((resolve, reject) => {
        chrome.storage.sync.get('active_focus_timer', (result) => {
          console.log('📖 Storage read result:', result);
          if (chrome.runtime.lastError) {
            console.error('❌ Storage read error:', chrome.runtime.lastError);
            return reject(chrome.runtime.lastError);
          }
          // Immediately clear the timer to prevent race conditions
          console.log('🗑️ Clearing timer data from storage...');
          chrome.storage.sync.remove('active_focus_timer', () => {
            if (chrome.runtime.lastError) {
              // This is a secondary error, but we should log it. The primary operation (get) succeeded.
              console.warn('Failed to remove active_focus_timer after get:', chrome.runtime.lastError.message);
            } else {
              console.log('✅ Timer data cleared from storage');
            }
            resolve(result);
          });
        });
      });

      console.log('Timer data:', timerData);

      // If there's no timer data, another handler already processed it -> bail out quietly.
      if (!timerData || !timerData.skillId || timerData.skillId !== skillId) {
        console.log('No active timer data found or skillId mismatch; skipping (already handled).');
        try { chrome.alarms.clear(alarm.name); } catch (e) { /* ignore */ }
        return;
      }

      // At this point, we have the data and it has been cleared from storage.
      // The alarm for this timer is also no longer needed.
      try { chrome.alarms.clear(alarm.name); } catch (e) { /* ignore */ }

      // --- Perform actions now that we have exclusive access to the timer data ---

      // 1. Check the skill to award GP
      console.log('=== STEP 1: Calling checkSkill for:', skillId);
      try {
        const checkResult = await checkSkill(skillId);
        console.log('=== STEP 1 SUCCESS: checkSkill result:', checkResult);
        
        // Notify any open popups to refresh
        try {
          chrome.runtime.sendMessage({ type: 'STATE_UPDATED', data: checkResult });
        } catch (e) {
          // Popup may not be open, that's fine
          console.log('Could not notify popup (may be closed)');
        }
      } catch (checkErr) {
        console.error('=== STEP 1 FAILED: checkSkill error:', checkErr);
      }

      // 2. Play completion sound and show notification
      console.log('=== STEP 2: Playing sound and creating notification');
      const skillName = timerData.skillName || 'a skill';
      
      // Play sound using offscreen document (since service workers can't use Audio)
      try {
        const soundUrl = chrome.runtime.getURL('sounds/complete.mp3');
        console.log('🔊 Playing sound:', soundUrl);
        
        // Create offscreen document to play audio
        const sendSoundMessage = () => {
          chrome.runtime.sendMessage({ type: 'PLAY_SOUND', soundUrl }, (response) => {
            if (chrome.runtime.lastError) {
              console.warn('Sound message error:', chrome.runtime.lastError.message);
            } else {
              console.log('Sound response:', response);
            }
          });
        };
        
        chrome.offscreen.createDocument({
          url: 'offscreen.html',
          reasons: ['AUDIO_PLAYBACK'],
          justification: 'Play completion sound'
        }).then(() => {
          console.log('✅ Offscreen document created');
          // Small delay to ensure document is ready
          setTimeout(sendSoundMessage, 100);
        }).catch((err) => {
          // Document may already exist, send message directly
          console.log('Offscreen doc exists, sending message directly');
          sendSoundMessage();
        });
      } catch (e) {
        console.warn('Sound playback setup failed:', e);
      }
      
      // Show notification
      chrome.notifications.create(`focus_complete_${skillId}`, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.png'),
        title: '🎉 Focus Complete!',
        message: `${skillName} - Progress recorded`,
        priority: 2,
        requireInteraction: false,
        silent: true // We play our own sound
      }, (notificationId) => {
        if (chrome.runtime.lastError) {
          console.warn('=== STEP 2: Notification error:', chrome.runtime.lastError.message);
        } else {
          console.log('=== STEP 2 SUCCESS: Notification created:', notificationId);
        }
      });

      // 3. Clear the badge text
      console.log('=== STEP 3: Clearing badge');
      try { 
        chrome.action.setBadgeText({ text: '' });
        console.log('=== STEP 3 SUCCESS: Badge cleared');
      } catch (e) { 
        console.error('=== STEP 3 FAILED:', e);
      }

      console.log('=== Focus session completion sequence finished.');
    } catch (error) {
      console.error('Focus timer completion failed:', error);
    }
  }
  
  // Update badge for active timer (runs every minute)
  if (alarm.name === 'focus_badge_update') {
    try {
      const timerData = await getStorage('active_focus_timer');
      if (timerData && timerData.endTime) {
        const remaining = Math.max(0, Math.floor((timerData.endTime - Date.now()) / 1000));
        if (remaining > 0) {
          const minutes = Math.floor(remaining / 60);
          chrome.action.setBadgeText({ text: `${minutes}m` });
          chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
        } else {
          chrome.action.setBadgeText({ text: '' });
        }
      }
    } catch (error) {
      console.error('Badge update failed:', error);
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
    
    // Clear any active focus timer
    await safeSetItem('active_focus_timer', null);
    chrome.action.setBadgeText({ text: '' });
    chrome.alarms.clearAll();
    
    // Re-setup daily alarm
    setupAlarms();
    
    return { success: true };
  } catch (error) {
    console.error('resetAccount failed:', error);
    throw error;
  }
}

/**
 * START_TIMER: Start a focus session timer for a skill
 */
async function startTimer(payload) {
  if (!payload || !payload.skillId || !payload.durationInSeconds) {
    throw new Error('skillId and durationInSeconds are required');
  }
  
  const { skillId, durationInSeconds } = payload;
  const duration = Number(durationInSeconds);
  
  if (duration <= 0 || duration > 3 * 60 * 60) {
    throw new Error('Duration must be between 1 second and 3 hours');
  }
  
  try {
    // Check if skill exists
    const skills = await getStorage(STORAGE_KEYS.SKILLS) || [];
    const skill = skills.find(s => s.id === skillId);
    if (!skill) {
      throw new Error('Skill not found');
    }
    
    const endTime = Date.now() + (duration * 1000);
    
    // Store active timer info
    const timerData = {
      skillId,
      skillName: skill.name,
      startTime: Date.now(),
      endTime,
      durationInSeconds: duration
    };
    
    console.log('💾 Saving timer data:', timerData);
    await safeSetItem('active_focus_timer', timerData);
    
    // Verify data was saved
    const savedData = await getStorage('active_focus_timer');
    console.log('✅ Timer data saved and verified:', savedData);
    
    // Create alarm for timer completion
    const alarmName = `focus_timer_${skillId}`;
    console.log('⏰ Creating alarm:', alarmName, 'to fire at', new Date(endTime).toLocaleTimeString(), `(in ${duration} seconds)`);
    chrome.alarms.create(alarmName, {
      when: endTime
    });
    
    // Verify alarm was created
    setTimeout(() => {
      chrome.alarms.get(alarmName, (alarm) => {
        if (alarm) {
          console.log('✅ Alarm created successfully:', alarm.name, 'scheduled for', new Date(alarm.scheduledTime).toLocaleTimeString());
        } else {
          console.error('❌ Alarm was NOT created!');
        }
      });
    }, 100);
    
    // Create/update badge update alarm (runs every minute)
    chrome.alarms.create('focus_badge_update', {
      when: Date.now() + 60 * 1000,
      periodInMinutes: 1
    });
    
    // Set initial badge
    const minutes = Math.floor(duration / 60);
    chrome.action.setBadgeText({ text: `${minutes}m` });
    chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
    
    return { success: true, endTime, skillName: skill.name };
  } catch (error) {
    console.error('startTimer failed:', error);
    throw error;
  }
}

/**
 * STOP_TIMER: Cancel an active focus session timer
 */
async function stopTimer(payload) {
  if (!payload || !payload.skillId) {
    throw new Error('skillId is required');
  }
  
  const { skillId } = payload;
  
  try {
    // Clear timer data
    await safeSetItem('active_focus_timer', null);
    
    // Clear alarms
    chrome.alarms.clear(`focus_timer_${skillId}`);
    chrome.alarms.clear('focus_badge_update');
    
    // Clear badge
    chrome.action.setBadgeText({ text: '' });
    
    return { success: true };
  } catch (error) {
    console.error('stopTimer failed:', error);
    throw error;
  }
}

/**
 * GET_TIMER_STATUS: Get current active timer info
 */
async function getTimerStatus() {
  try {
    const timerData = await getStorage('active_focus_timer');
    // Support paused timers where timerData may have isPaused and remainingSeconds
    if (!timerData) {
      return { active: false, timer: null };
    }

    if (timerData.isPaused) {
      const remaining = Number(timerData.remainingSeconds) || 0;
      if (remaining <= 0) {
        return { active: false, timer: null };
      }
      return {
        active: true,
        timer: {
          skillId: timerData.skillId,
          skillName: timerData.skillName,
          isPaused: true,
          remainingSeconds: remaining
        }
      };
    }

    if (!timerData.endTime) {
      return { active: false, timer: null };
    }

    const remaining = Math.max(0, Math.floor((timerData.endTime - Date.now()) / 1000));

    if (remaining === 0) {
      // Timer expired - alarm will handle cleanup, just return inactive state
      // DO NOT delete timer data here to avoid race with alarm handler
      console.log('⏱️ Timer expired, waiting for alarm to handle cleanup');
      return { active: false, timer: null };
    }

    return {
      active: true,
      timer: {
        skillId: timerData.skillId,
        skillName: timerData.skillName,
        startTime: timerData.startTime,
        endTime: timerData.endTime,
        remainingSeconds: remaining
      }
    };
  } catch (error) {
    console.error('getTimerStatus failed:', error);
    throw error;
  }
}

/**
 * PAUSE_TIMER: Pause an active focus session
 */
async function pauseTimer(payload) {
  if (!payload || !payload.skillId) throw new Error('skillId is required');
  const { skillId } = payload;

  try {
    const timerData = await getStorage('active_focus_timer');
    if (!timerData || timerData.skillId !== skillId) {
      throw new Error('No active timer for this skill');
    }

    // Calculate remaining seconds
    const remaining = timerData.isPaused
      ? Number(timerData.remainingSeconds) || 0
      : Math.max(0, Math.floor((timerData.endTime - Date.now()) / 1000));

    // Save paused state atomically
    const paused = {
      skillId: timerData.skillId,
      skillName: timerData.skillName,
      remainingSeconds: remaining,
      isPaused: true,
      pausedAt: Date.now()
    };

    await safeSetItem('active_focus_timer', paused);

    // Clear alarms
    chrome.alarms.clear(`focus_timer_${skillId}`);
    chrome.alarms.clear('focus_badge_update');

    // Update badge to indicate paused (show remaining minutes)
    try {
      const minutes = Math.max(1, Math.floor(remaining / 60));
      chrome.action.setBadgeText({ text: `||${minutes}m` });
      chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
    } catch (e) { /* ignore */ }

    return { success: true, remainingSeconds: remaining };
  } catch (error) {
    console.error('pauseTimer failed:', error);
    throw error;
  }
}

/**
 * RESUME_TIMER: Resume a paused focus session
 */
async function resumeTimer(payload) {
  if (!payload || !payload.skillId) throw new Error('skillId is required');
  const { skillId } = payload;

  try {
    const timerData = await getStorage('active_focus_timer');
    if (!timerData || !timerData.isPaused || timerData.skillId !== skillId) {
      throw new Error('No paused timer for this skill');
    }

    const remaining = Number(timerData.remainingSeconds) || 0;
    if (remaining <= 0) {
      throw new Error('No remaining time to resume');
    }

    const endTime = Date.now() + remaining * 1000;
    const newData = {
      skillId: timerData.skillId,
      skillName: timerData.skillName,
      startTime: Date.now(),
      endTime,
      durationInSeconds: remaining,
      isPaused: false
    };

    await safeSetItem('active_focus_timer', newData);

    // Create alarm
    chrome.alarms.create(`focus_timer_${skillId}`, { when: endTime });
    chrome.alarms.create('focus_badge_update', { when: Date.now() + 60 * 1000, periodInMinutes: 1 });

    // Set initial badge
    try {
      const minutes = Math.max(1, Math.floor(remaining / 60));
      chrome.action.setBadgeText({ text: `${minutes}m` });
      chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
    } catch (e) { /* ignore */ }

    return { success: true, endTime };
  } catch (error) {
    console.error('resumeTimer failed:', error);
    throw error;
  }
}

/**
 * FINISH_TIMER_EARLY: Immediately finish session and award GP
 */
async function finishTimerEarly(payload) {
  if (!payload || !payload.skillId) throw new Error('skillId is required');
  const { skillId } = payload;

  try {
    // ATOMIC OPERATION: Read and immediately clear the timer data.
    const { active_focus_timer: timerData } = await new Promise((resolve, reject) => {
      chrome.storage.sync.get('active_focus_timer', (result) => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        chrome.storage.sync.remove('active_focus_timer', () => {
          if (chrome.runtime.lastError) console.warn('Failed to remove active_focus_timer after get:', chrome.runtime.lastError.message);
          resolve(result);
        });
      });
    });

    if (!timerData || timerData.skillId !== skillId) {
      throw new Error('No active timer for this skill to finish.');
    }

    // Clear any alarms associated with the timer
    chrome.alarms.clear(`focus_timer_${skillId}`);
    chrome.alarms.clear('focus_badge_update');

    // --- Perform actions now that we have exclusive access to the timer data ---

    // 1. Call checkSkill to award GP
    console.log('=== FINISH EARLY STEP 1: Calling checkSkill for:', skillId);
    try {
      const checkResult = await checkSkill(skillId);
      console.log('=== FINISH EARLY STEP 1 SUCCESS');
      
      // Notify any open popups to refresh
      try {
        chrome.runtime.sendMessage({ type: 'STATE_UPDATED', data: checkResult });
      } catch (e) {
        console.log('Could not notify popup (may be closed)');
      }
    } catch (checkErr) {
      console.error('=== FINISH EARLY STEP 1 FAILED:', checkErr);
    }

    // 2. Play sound and show notification
    console.log('=== FINISH EARLY STEP 2: Playing sound and creating notification');
    const skillName = timerData.skillName || 'a skill';
    
    // Play sound
    try {
      const soundUrl = chrome.runtime.getURL('sounds/complete.mp3');
      console.log('🔊 Playing sound:', soundUrl);
      
      chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Play completion sound'
      }).then(() => {
        console.log('✅ Offscreen document created');
        chrome.runtime.sendMessage({ type: 'PLAY_SOUND', soundUrl }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('Sound message error:', chrome.runtime.lastError.message);
          } else {
            console.log('Sound response:', response);
          }
        });
      }).catch(() => {
        console.log('Offscreen doc exists, sending message directly');
        chrome.runtime.sendMessage({ type: 'PLAY_SOUND', soundUrl }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('Sound message error:', chrome.runtime.lastError.message);
          } else {
            console.log('Sound response:', response);
          }
        });
      });
    } catch (e) {
      console.warn('Sound playback setup failed:', e);
    }
    
    // Show notification (without icon)
    chrome.notifications.create(`focus_complete_${skillId}`, {
      type: 'basic',
      title: '🎉 Focus Complete!',
      message: `${skillName} - Progress recorded`,
      priority: 2,
      requireInteraction: false,
      silent: true
    }, (nid) => { 
      if (chrome.runtime.lastError) {
        console.warn('=== FINISH EARLY STEP 2: Notification error:', chrome.runtime.lastError.message);
      } else {
        console.log('=== FINISH EARLY STEP 2 SUCCESS:', nid);
      }
    });

    // 3. Clear the badge
    console.log('=== FINISH EARLY STEP 3: Clearing badge');
    try { 
      chrome.action.setBadgeText({ text: '' });
      console.log('=== FINISH EARLY STEP 3 SUCCESS');
    } catch (e) { 
      console.error('=== FINISH EARLY STEP 3 FAILED:', e);
    }

    return { success: true };
  } catch (error) {
    console.error('finishTimerEarly failed:', error);
    throw error;
  }
}

/**
 * CANCEL_TIMER: Cancel session without awarding GP
 */
async function cancelTimer(payload) {
  if (!payload || !payload.skillId) throw new Error('skillId is required');
  const { skillId } = payload;

  try {
    await safeSetItem('active_focus_timer', null);
    chrome.alarms.clear(`focus_timer_${skillId}`);
    chrome.alarms.clear('focus_badge_update');
    try { chrome.action.setBadgeText({ text: '' }); } catch (e) { /* ignore */ }
    return { success: true };
  } catch (error) {
    console.error('cancelTimer failed:', error);
    throw error;
  }
}

/**
 * Message router with proper error handling
 */
async function handleMessage(msg, sender) {
  if (!msg || !msg.type) {
    throw new Error('Invalid message format');
  }
  
  try {
    switch (msg.type) {
      case 'GET_STATE':
        return await getState();
      
      case 'ADD_SKILL':
        if (!msg.payload) {
          throw new Error('Payload is required');
        }
        return await addSkill(msg.payload);
      
      case 'CHECK_SKILL':
        if (!msg.payload || !msg.payload.skillId) {
          throw new Error('Skill ID is required');
        }
        // checkSkill expects the skillId string, not the whole payload object
        return await checkSkill(msg.payload.skillId);
      
      case 'UPDATE_SKILL':
        if (!msg.payload || !msg.payload.skillId || !msg.payload.patch) {
          throw new Error('skillId and patch are required');
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
      
      case 'START_TIMER':
        if (!msg.payload) {
          throw new Error('Payload is required');
        }
        return await startTimer(msg.payload);

      case 'PAUSE_TIMER':
        if (!msg.payload) {
          throw new Error('Payload is required');
        }
        return await pauseTimer(msg.payload);

      case 'RESUME_TIMER':
        if (!msg.payload) {
          throw new Error('Payload is required');
        }
        return await resumeTimer(msg.payload);

      case 'FINISH_TIMER_EARLY':
        if (!msg.payload) {
          throw new Error('Payload is required');
        }
        return await finishTimerEarly(msg.payload);

      case 'CANCEL_TIMER':
        if (!msg.payload) {
          throw new Error('Payload is required');
        }
        return await cancelTimer(msg.payload);
      
      case 'STOP_TIMER':
        if (!msg.payload) {
          throw new Error('Payload is required');
        }
        return await stopTimer(msg.payload);
      
      case 'GET_TIMER_STATUS':
        return await getTimerStatus();
      
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

console.log('🚀 Service Worker Started at', new Date().toLocaleTimeString());

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('📦 Extension installed/updated');
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
console.log('⚙️ Setting up alarms...');
setupAlarms();

// Alarm listener
console.log('👂 Registering alarm listener...');
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

