import {sortSkills} from '../utils/calc.js';
import analyzeAchievements from '../utils/achievements.js';
import {AchievementBanner} from './components/AchievementBanner.js';
import {FocusSessionBanner} from './components/FocusSessionBanner.js';

// components
import {Header} from './components/Header.js';
import {GrowthSummary} from './components/GrowthSummary.js';
import {SkillList} from './components/SkillList.js';
import {EmptyState} from './components/EmptyState.js';
import {SettingsDropdown} from './components/SettingsDropdown.js';
import {ResetModal} from './components/ResetModal.js';
import {GlobalMomentum} from './components/GlobalMomentum.js';

const root = document.getElementById('app');

function sendMessage(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (res) => resolve(res));
  });
}

async function requestState() {
  const res = await sendMessage({type: 'GET_STATE'});
  if (!res || !res.ok) return {user: null, skills: []};
  return res.result;
}

function showToast(msg, timeout = 3000) {
  let t = document.getElementById('sp-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'sp-toast';
    t.style.position = 'fixed';
    t.style.left = '12px';
    t.style.right = '12px';
    t.style.bottom = '12px';
    t.style.background = '#0f172a';
    t.style.color = '#fff';
    t.style.padding = '8px 12px';
    t.style.borderRadius = '8px';
    t.style.boxShadow = '0 6px 18px rgba(2,6,23,0.2)';
    t.style.zIndex = '9999';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => { t.style.display = 'none'; }, timeout);
}

async function main() {
  const state = await requestState();
  renderState(state);
}

function renderState(state) {
  const skills = sortSkills(state.skills || []);

  root.innerHTML = '';

  // Focus Session Banner (always render at top, hidden by default)
  const focusBanner = new FocusSessionBanner({
    onStop: async () => {
      await refresh();
    },
    onError: (error) => {
      showToast(String(error));
    }
  });
  root.appendChild(focusBanner.render());

  // Track dropdown state
  let dropdownElement = null;

  const header = Header(state.user, async (name) => {
    await sendMessage({type: 'SET_NAME', payload: {name}});
    showToast('Name saved');
    await refresh();
  }, () => showToast('Auth flow not implemented yet — coming soon'), async () => {
    // logout handler: clear user and refresh
    await sendMessage({type: 'SET_NAME', payload: {name: ''}});
    showToast('Logged out');
    await refresh();
  }, () => {
    // onOpenSettings - toggle dropdown
    if (dropdownElement) {
      dropdownElement.remove();
      dropdownElement = null;
    } else {
      // Create and show dropdown
      const headerEl = root.querySelector('.header');
      if (!headerEl) return;
      
      // Position dropdown relative to header
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.display = 'inline-block';
      
      dropdownElement = SettingsDropdown(() => {
        // onResetAccount - close dropdown and show modal
        if (dropdownElement) {
          dropdownElement.remove();
          dropdownElement = null;
        }
        
        const modal = ResetModal(async () => {
          // onConfirm - send RESET_ACCOUNT message
          showToast('Resetting account...');
          const res = await sendMessage({type: 'RESET_ACCOUNT'});
          if (res && res.ok) {
            showToast('Account reset successfully');
            await refresh();
          } else {
            showToast(res?.error || 'Failed to reset account');
          }
        }, () => {
          // onCancel - just close modal (handled by modal itself)
        });
        
        document.body.appendChild(modal);
      });
      
      wrapper.appendChild(dropdownElement);
      headerEl.appendChild(wrapper);
      
      // Close dropdown when clicking outside
      const closeDropdown = (e) => {
        if (dropdownElement && !dropdownElement.contains(e.target)) {
          dropdownElement.remove();
          dropdownElement = null;
          document.removeEventListener('click', closeDropdown);
        }
      };
      
      // Delay to avoid immediate close from the same click that opened it
      setTimeout(() => {
        document.addEventListener('click', closeDropdown);
      }, 0);
    }
  });
  root.appendChild(header);

  if (!skills || skills.length === 0) {
    root.appendChild(EmptyState({onAdd: async (name) => {
      try {
        // support payload being either a string or an object {name, emoji}
        const payload = typeof name === 'string' ? {name} : name || {};
        const r = await sendMessage({type: 'ADD_SKILL', payload});
        if (r && r.ok) {
          showToast('Skill added');
          await refresh();
        } else {
          showToast('Failed to add skill');
        }
      } catch (e) { showToast('Failed to add skill'); }
    }, onSetName: async (name) => {
      await sendMessage({type: 'SET_NAME', payload: {name}});
      showToast('Name saved');
      await refresh();
    }}));
    return;
  }

  // use summary computed by background (includes growthPercent and activityScore)
  root.appendChild(GrowthSummary(state.summary || {}));

  // Global Momentum indicator (under growth summary)
  const activeDays = state.summary?.uniqueActiveDaysLast7 || 0;
  root.appendChild(GlobalMomentum(activeDays));

  // Achievements banner (between summary and skills)
  try {
    const achievements = analyzeAchievements({skills: state.skills || [], dayLogs: state.dayLogs || {}, todayKey: state.summary && state.summary.todayKey});
    if (achievements && achievements.length) {
      const banner = AchievementBanner(achievements);
      root.appendChild(banner);
    }
  } catch (e) {
    // ignore achievements errors — should not block UI
  }

  const listEl = SkillList(skills, {
    onCheck: async (skillId) => {
      const r = await sendMessage({type: 'CHECK_SKILL', payload: {skillId}});
      if (r && r.ok) {
        showToast('Nice — progress recorded');
        // if the background returned the updated state, use it to immediately re-render
        if (r.result && (r.result.skills || r.result.summary)) {
          try { renderState(r.result); } catch (e) { await refresh(); }
        } else {
          await refresh();
        }
      } else {
        const err = r && r.error ? r.error : 'unknown';
        if (String(err).includes('daily_cap')) showToast('Two checks per day are credited. Try tomorrow.');
        else if (String(err).includes('rearm')) showToast('This skill re-arms later.');
        else showToast('Could not record action');
      }
    },
    onAdd: async (payload) => {
      // payload may be a string (name) or object {name, emoji}
      const pl = typeof payload === 'string' ? {name: payload} : (payload || {});
      const r = await sendMessage({type: 'ADD_SKILL', payload: pl});
      if (r && r.ok) { showToast('Skill added'); await refresh(); }
      else showToast('Failed to add');
    },
    onError: (e) => { showToast(String(e)); },
    onEdit: async (skillId, patch) => {
      // patch contains {name, emoji} - use atomic UPDATE_SKILL message
      const setRes = await sendMessage({
        type: 'UPDATE_SKILL', 
        payload: { skillId, patch }
      });
      if (setRes && setRes.ok) { 
        showToast('Saved'); 
        await refresh(); 
      } else {
        showToast(setRes.error || 'Failed to save');
      }
    },
    onDelete: async (skillId) => {
      // Use atomic DELETE_SKILL message
      const setRes = await sendMessage({
        type: 'DELETE_SKILL',
        payload: { skillId }
      });
      if (setRes && setRes.ok) { 
        showToast('Deleted'); 
        await refresh(); 
      } else {
        showToast(setRes.error || 'Failed to delete');
      }
    }
  });
  root.appendChild(listEl);

  // Schedule a refresh at next local midnight so temporary banners (achievements) disappear
  try {
    if (window._midnightRefreshTimer) clearTimeout(window._midnightRefreshTimer);
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5, 0); // 00:00:05
    const ms = Math.max(0, next.getTime() - Date.now());
    window._midnightRefreshTimer = setTimeout(() => { refresh(); }, ms);
  } catch (e) {
    // ignore
  }
}

async function refresh() { await main(); }

// Listen for state updates from background (e.g., when timer completes)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'STATE_UPDATED' && message.data) {
    console.log('📩 Received STATE_UPDATED from background, refreshing popup...');
    renderState(message.data);
    showToast('✅ Progress recorded!', 2000);
  }
  return false; // No asynchronous response, keep channel closed
});

main();

// expose for dev
window.sp = {requestState, refresh};

// non-modal auth click handler: components dispatch `sp:auth-click`
// this shows an inline toast so we avoid native alerts
window.addEventListener('sp:auth-click', () => {
  showToast('Auth flow not implemented yet — coming soon');
});
