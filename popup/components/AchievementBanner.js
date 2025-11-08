export function AchievementBanner(achievements = []) {
  const wrap = document.createElement('div');
  wrap.className = 'achievements';

  // local dismissed set so user can close banners in this session
  const dismissed = new Set();

  function render() {
    wrap.innerHTML = '';
    const list = achievements.filter(a => !dismissed.has(a.id));
    if (!list.length) return;

    list.forEach((a) => {
      const card = document.createElement('div');
      card.className = 'achievement-card card';
      // left icon
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
      close.addEventListener('click', () => {
        dismissed.add(a.id);
        render();
      });
      right.appendChild(close);

      card.appendChild(left);
      card.appendChild(body);
      card.appendChild(right);
      wrap.appendChild(card);
    });
  }

  render();
  return wrap;
}
