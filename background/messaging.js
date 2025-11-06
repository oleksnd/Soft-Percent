// messaging.js — typed-like message handlers for background
import {todayKey} from '../utils/date.js';
import {v4 as uuidv4} from '../utils/id.js';

// Message types handled: GET_STATE, ADD_SKILL, TOGGLE_CHECK_TODAY, SET_NAME
export async function handleMessage(msg, sender) {
  if (!msg || !msg.type) throw new Error('invalid message');
  switch (msg.type) {
    case 'GET_STATE':
      return getState();
    case 'ADD_SKILL':
      return addSkill(msg.payload);
    case 'TOGGLE_CHECK_TODAY':
      return toggleCheck(msg.payload && msg.payload.skillId);
    case 'SET_NAME':
      return setName(msg.payload && msg.payload.name);
    default:
      throw new Error('unknown message type ' + String(msg.type));
  }
}

async function getState() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['user', 'skills', 'meta'], (items) => {
      resolve({user: items.user || null, skills: items.skills || [], meta: items.meta || {}});
    });
  });
}

async function addSkill(payload) {
  if (!payload || !payload.name) throw new Error('invalid payload');
  const skill = {
    id: uuidv4(),
    name: String(payload.name).trim(),
    emoji: payload.emoji || '⭐',
    category: payload.category || 'Other',
    createdAt: Date.now(),
    firstCheckAt: null,
    totalChecks: 0
  };
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['skills'], (items) => {
      const skills = items.skills || [];
      skills.push(skill);
      chrome.storage.sync.set({skills}, () => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        resolve(skill);
      });
    });
  });
}

async function toggleCheck(skillId) {
  if (!skillId) throw new Error('skillId required');
  const day = todayKey();
  const dailyKey = `daily_${skillId}`;
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get([dailyKey, 'skills'], (items) => {
      const already = items[dailyKey];
      if (already) return resolve({already: true});
      // mark daily
      const setObj = {};
      setObj[dailyKey] = 1;
      // update skill aggregates
      const skills = items.skills || [];
      const idx = skills.findIndex((s) => s.id === skillId);
      if (idx === -1) return reject(new Error('skill not found'));
      const skill = skills[idx];
      skill.totalChecks = (skill.totalChecks || 0) + 1;
      if (!skill.firstCheckAt) skill.firstCheckAt = Date.now();
      chrome.storage.sync.set({[dailyKey]: 1, skills}, () => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        resolve({already: false, skill});
      });
    });
  });
}

async function setName(name) {
  const n = typeof name === 'string' ? name.trim() : '';
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({user: {name: n, mode: 'local', id: `local_${Math.random().toString(36).slice(2,9)}`}}, () => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
      resolve({name: n});
    });
  });
}
