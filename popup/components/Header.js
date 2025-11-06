import {LoginCta} from './LoginCta.js';

export function Header(user = {}, onSetName, onAuthClick, onLogout, onToggleEditMode) {
  const wrap = document.createElement('div');
  wrap.className = 'header';

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = user && user.name ? (user.name[0] || 'U').toUpperCase() : 'U';

  const content = document.createElement('div');
  content.className = 'header-content';

  const topRow = document.createElement('div');
  topRow.className = 'header-top';

  const left = document.createElement('div');
  left.style.display = 'flex';
  left.style.flexDirection = 'column';
  left.style.gap = '6px';

  const title = document.createElement('div');
  title.className = 'h1';
  title.tabIndex = 0;
  title.textContent = user && user.name ? user.name : 'Welcome';

  const small = document.createElement('div');
  small.className = 'small';
  small.textContent = user && user.mode === 'local' ? 'Local mode • long‑term stats may be lost' : 'Signed in';

  const badges = document.createElement('div');
  badges.className = 'small';
  badges.textContent = 'Action days 0/30';

  // inline edit name
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = user && user.name ? user.name : '';
  nameInput.style.display = 'none';
  nameInput.maxLength = 40;

  let editing = false;
  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn-ghost';
  editBtn.textContent = 'Edit';
  editBtn.addEventListener('click', () => {
    editing = !editing;
    if (editing) {
      title.style.display = 'none';
      nameInput.style.display = '';
      nameInput.focus();
      editBtn.textContent = 'Save';
    } else {
      const v = nameInput.value.trim();
      title.textContent = v || 'Welcome';
      title.style.display = '';
      nameInput.style.display = 'none';
      editBtn.textContent = 'Edit';
      onSetName && onSetName(v);
    }
  });

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') editBtn.click();
    if (e.key === 'Escape') {
      nameInput.value = user && user.name ? user.name : '';
      editing = false;
      title.style.display = '';
      nameInput.style.display = 'none';
      editBtn.textContent = 'Edit';
    }
  });

  left.appendChild(title);
  left.appendChild(nameInput);
  left.appendChild(small);
  left.appendChild(badges);

  // place login CTA under user description
  if (!user || user.mode !== 'signedIn') {
    try {
      const login = LoginCta(onAuthClick);
      login.className = 'btn btn-primary login-cta';
      const loginWrap = document.createElement('div');
      loginWrap.style.marginTop = '8px';
      loginWrap.appendChild(login);
      left.appendChild(loginWrap);
    } catch (e) {
      // ignore
    }
  }

  const right = document.createElement('div');
  right.className = 'header-actions';

  const editModeBtn = document.createElement('button');
  editModeBtn.className = 'btn btn-ghost';
  editModeBtn.textContent = 'Edit mode';
  editModeBtn.setAttribute('aria-pressed', 'false');
  editModeBtn.addEventListener('click', () => {
    const pressed = editModeBtn.getAttribute('aria-pressed') === 'true';
    editModeBtn.setAttribute('aria-pressed', String(!pressed));
    onToggleEditMode && onToggleEditMode(!pressed);
  });

  const logoutBtn = document.createElement('button');
  logoutBtn.className = 'btn btn-ghost';
  logoutBtn.textContent = 'Logout';
  logoutBtn.addEventListener('click', () => { onLogout && onLogout(); });

  right.appendChild(editModeBtn);
  right.appendChild(logoutBtn);

  topRow.appendChild(left);
  topRow.appendChild(right);

  content.appendChild(topRow);

  wrap.appendChild(avatar);
  wrap.appendChild(content);
  return wrap;
}
