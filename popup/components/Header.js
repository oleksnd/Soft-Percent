import {LoginCta} from './LoginCta.js';

export function Header(user = {}, onSetName, onAuthClick, onLogout) {
  const wrap = document.createElement('div');
  wrap.className = 'header';

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = user && user.name ? (user.name[0] || 'U').toUpperCase() : 'U';

  const content = document.createElement('div');
  content.className = 'header-content';

  // User block (left): title, small text, badges
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

  // inline name input (hidden by default)
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = user && user.name ? user.name : '';
  nameInput.style.display = 'none';
  nameInput.maxLength = 40;
  nameInput.setAttribute('aria-label', 'Your name');

  // title area with pencil icon for edit
  const titleRow = document.createElement('div');
  titleRow.style.display = 'flex';
  titleRow.style.alignItems = 'center';
  titleRow.style.gap = '8px';

  const pencilBtn = document.createElement('button');
  pencilBtn.className = 'btn btn-ghost';
  pencilBtn.style.padding = '6px';
  pencilBtn.setAttribute('aria-label', 'Edit name');
  // sharper inline SVG pencil icon (keeps size small and scales with font)
  pencilBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/>
      <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="currentColor"/>
    </svg>
  `;

  const saveBtn = document.createElement('button');
  // neutral Save button shown inline while editing
  saveBtn.className = 'btn';
  saveBtn.textContent = 'Save';
  saveBtn.style.display = 'none';
  saveBtn.style.marginLeft = '8px';

  let editing = false;

  // nameRow holds the input and save button inline (hidden by default)
  const nameRow = document.createElement('div');
  nameRow.style.display = 'none';
  nameRow.style.width = '100%';
  nameRow.style.gap = '8px';
  nameRow.style.alignItems = 'center';

  // ensure input grows and save stays inline
  nameInput.style.flex = '1';
  nameInput.style.minWidth = '0';
  saveBtn.style.flex = '0 0 auto';

  nameRow.appendChild(nameInput);
  nameRow.appendChild(saveBtn);

  // Save button will sit inline to the right of the input (no editing badge)

  pencilBtn.addEventListener('click', () => {
    editing = true;
    // hide title row elements (title + pencil)
    titleRow.style.display = 'none';
    // show inline input + save button in place
    nameRow.style.display = 'flex';
    nameInput.style.display = '';
    // show save button
    saveBtn.style.display = '';
    // show editing badge
    nameInput.focus();
  });

  saveBtn.addEventListener('click', () => {
    const v = nameInput.value.trim();
    title.textContent = v || 'Welcome';
    titleRow.style.display = '';
    nameRow.style.display = 'none';
    editing = false;
    // hide save button
    saveBtn.style.display = 'none';
    onSetName && onSetName(v);
  });

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
    if (e.key === 'Escape') {
      nameInput.value = user && user.name ? user.name : '';
      editing = false;
      titleRow.style.display = '';
      nameRow.style.display = 'none';
      // hide save button
      saveBtn.style.display = 'none';
    }
  });

  titleRow.appendChild(title);
  titleRow.appendChild(pencilBtn);

  // Buttons row: Edit name, Continue with Google, Logout (visible only if signed in)
  const buttonRow = document.createElement('div');
  buttonRow.className = 'button-row';
  buttonRow.style.display = 'flex';
  buttonRow.style.gap = '8px';
  buttonRow.style.alignItems = 'center';
  buttonRow.style.flexWrap = 'nowrap';

  // Edit name button (already created)
  // Continue with Google (stub) - neutral style
  let loginBtnEl;
  try {
    const loginBtn = LoginCta(onAuthClick);
    // ensure neutral styling and no wrapping of text
    loginBtn.className = 'btn';
    loginBtn.style.whiteSpace = 'nowrap';
    loginBtnEl = loginBtn;
  } catch (e) {
    const fallback = document.createElement('button');
    fallback.className = 'btn';
    fallback.textContent = 'Continue with Google';
    fallback.addEventListener('click', () => { if (onAuthClick) onAuthClick(); });
    loginBtnEl = fallback;
  }

  const logoutBtn = document.createElement('button');
  logoutBtn.className = 'btn';
  logoutBtn.textContent = 'Logout';
  logoutBtn.setAttribute('aria-label', 'Logout');
  logoutBtn.style.whiteSpace = 'nowrap';
  logoutBtn.addEventListener('click', () => { onLogout && onLogout(); });
  // hide logout if not signed in
  if (!user || user.mode !== 'signedIn') logoutBtn.style.display = 'none';

  // append buttons in order (Edit name removed from row; pencil sits next to title)
  buttonRow.appendChild(loginBtnEl);
  buttonRow.appendChild(logoutBtn);

  // assemble content
  content.appendChild(titleRow);
  content.appendChild(nameRow);
  content.appendChild(small);
  content.appendChild(badges);
  content.appendChild(buttonRow);

  wrap.appendChild(avatar);
  wrap.appendChild(content);
  return wrap;
}
