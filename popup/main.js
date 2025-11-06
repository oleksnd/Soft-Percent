import {sortSkills} from '../utils/calc.js';

// components
import {Header} from './components/Header.js';
import {GrowthSummary} from './components/GrowthSummary.js';
import {SkillList} from './components/SkillList.js';
import {EmptyState} from './components/EmptyState.js';

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
  const skills = sortSkills(state.skills || []);

  root.innerHTML = '';

  const header = Header(state.user, async (name) => {
    await sendMessage({type: 'SET_NAME', payload: {name}});
    showToast('Name saved');
    await refresh();
  }, () => showToast('Auth flow not implemented yet — coming soon'), async () => {
    // logout handler: clear user and refresh
    await sendMessage({type: 'SET_NAME', payload: {name: ''}});
    showToast('Logged out');
    await refresh();
  }, (on) => {
    // toggle edit mode - show a tiny badge or enable inline edits (noop for now)
    if (on) showToast('Edit mode enabled'); else showToast('Edit mode disabled');
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

  const listEl = SkillList(skills, {
    onCheck: async (skillId) => {
      const r = await sendMessage({type: 'CHECK_SKILL', payload: {skillId}});
      if (r && r.ok) {
        showToast('Nice — progress recorded');
        await refresh();
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
      // patch contains {name, emoji}
      const items = await sendMessage({type: 'GET_STATE'});
      if (!items || !items.ok) return showToast('Failed to edit');
      const skillsNow = items.result.skills || [];
      const idx = skillsNow.findIndex(s => s.id === skillId);
      if (idx === -1) return showToast('Skill not found');
      const skill = skillsNow[idx];
      const updated = Object.assign({}, skill, patch);
      skillsNow[idx] = updated;
      const setRes = await sendMessage({type: 'SAVE_SKILLS', payload: {skills: skillsNow}});
      if (setRes && setRes.ok) { showToast('Saved'); await refresh(); }
      else showToast('Failed to save');
    },
    onDelete: async (skillId) => {
      const items = await sendMessage({type: 'GET_STATE'});
      if (!items || !items.ok) return showToast('Failed to delete');
      const skillsNow = items.result.skills || [];
      const filtered = skillsNow.filter(s => s.id !== skillId);
      const setRes = await sendMessage({type: 'SAVE_SKILLS', payload: {skills: filtered}});
      if (setRes && setRes.ok) { showToast('Deleted'); await refresh(); }
      else showToast('Failed to delete');
    }
  });
  root.appendChild(listEl);
}

async function refresh() { await main(); }

main();

// expose for dev
window.sp = {requestState, refresh};

// non-modal auth click handler: components dispatch `sp:auth-click`
// this shows an inline toast so we avoid native alerts
window.addEventListener('sp:auth-click', () => {
  showToast('Auth flow not implemented yet — coming soon');
});
