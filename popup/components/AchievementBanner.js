import { todayKey } from '../../utils/date.js';

// AchievementBanner
// - Stacks multiple achievement cards into a compact list
// - Shows a corner counter when there are more than `maxVisible` items
// - Automatic daily reset: cached banners are cleared once per day so they don't accumulate
export function AchievementBanner(achievements = []) {
  const wrap = document.createElement('div');
  wrap.className = 'achievements';

  const STORAGE_KEY = 'achievements_cache_v1';
  const RESET_KEY = 'achievements_last_reset_v1';
  const maxVisible = 1;
  let expanded = false;

  // Load cached achievements, handle daily reset, then merge and render
  async function init() {
    try {
      const get = (keys) => new Promise((res) => chrome.storage.local.get(keys, (r) => res(r)));
      const set = (obj) => new Promise((res) => chrome.storage.local.set(obj, () => res()));

      const data = await get([STORAGE_KEY, RESET_KEY]);
      const lastReset = data[RESET_KEY] || null;
      const today = todayKey();

      let cache = Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];

      // If last reset wasn't today, clear cache so banners don't accumulate across days
      if (lastReset !== today) {
        cache = [];
        await set({ [RESET_KEY]: today, [STORAGE_KEY]: cache });
      }

      // Merge incoming achievements into cache (avoid duplicates by id)
      const map = new Map(cache.map((a) => [a.id, a]));
      for (const a of achievements || []) {
        if (!map.has(a.id)) {
          map.set(a.id, Object.assign({}, a, { seenAt: Date.now() }));
        }
      }
      cache = Array.from(map.values());
      await set({ [STORAGE_KEY]: cache });

      render(cache, set);
    } catch (err) {
      // Fallback: render directly from incoming achievements
      render(achievements, async () => {});
    }
  }

  // Render function now shows up to `maxVisible` cards and a corner counter for the rest
  // `showAll` - when true, render full list, otherwise limit to maxVisible
  function render(list = [], persistSet = async () => {}, showAll) {
    wrap.innerHTML = '';
    if (!list || !list.length) return;

    // Container for stacked cards
    const show = (typeof showAll === 'boolean') ? showAll : expanded;
    const stack = document.createElement('div');
    stack.className = 'achievement-cascade';
  const visible = show ? list : list.slice(Math.max(0, list.length - maxVisible));
    for (const a of visible) {
      const card = document.createElement('div');
      card.className = 'achievement-card card';
      card.style.display = 'flex';
      card.style.alignItems = 'flex-start';
      card.style.gap = '12px';

      const left = document.createElement('div');
      left.className = 'achievement-left';
      left.textContent = a.icon || '🏅';

      const body = document.createElement('div');
      body.className = 'achievement-body';
      const title = document.createElement('div');
      title.className = 'achievement-title';
      title.textContent = a.title || '';
      const desc = document.createElement('div');
      desc.className = 'achievement-desc';
      desc.textContent = a.description || '';
      body.appendChild(title);
      body.appendChild(desc);

      const right = document.createElement('div');
      right.className = 'achievement-right';
      const close = document.createElement('button');
      close.className = 'btn btn-ghost achievement-close';
      close.setAttribute('aria-label', 'Close achievement');
      close.textContent = '✕';
      close.addEventListener('click', async () => {
        // remove this achievement from persistent cache
        try {
          const get = (keys) => new Promise((res) => chrome.storage.local.get(keys, (r) => res(r)));
          const set = (obj) => new Promise((res) => chrome.storage.local.set(obj, () => res()));
          const data = await get([STORAGE_KEY]);
          const cache = Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY].filter(it => it.id !== a.id) : [];
          await set({ [STORAGE_KEY]: cache });
          // re-render with updated list
          render(cache, set);
        } catch (e) {
          // best-effort: just hide this card
          card.remove();
        }
      });
      right.appendChild(close);

      card.appendChild(left);
      card.appendChild(body);
      card.appendChild(right);
      stack.appendChild(card);
    }

    // collapsed: overlapping cascade; expanded: normal stacked list
    if (show) {
      stack.classList.remove('collapsed');
      stack.classList.add('expanded');
    } else {
      stack.classList.remove('expanded');
      stack.classList.add('collapsed');
    }

    wrap.appendChild(stack);

    // Expand / Collapse control (replaces previous 'Dismiss all')
    if (list.length > maxVisible) {
      const controls = document.createElement('div');
      controls.style.display = 'flex';
      controls.style.justifyContent = 'flex-end';
      controls.style.marginTop = '8px';
      const expandBtn = document.createElement('button');
      expandBtn.className = 'btn btn-ghost';
      expandBtn.textContent = show ? 'Collapse' : 'Expand all';
      expandBtn.addEventListener('click', async () => {
        expanded = !expanded;
        expandBtn.textContent = expanded ? 'Collapse' : 'Expand all';
        // persistSet isn't used for this action; just re-render
        render(list, persistSet);
      });
      controls.appendChild(expandBtn);
      wrap.appendChild(controls);
    }
  }
  init();
  return wrap;
}
