import {LoginCta} from './LoginCta.js';

export function Header(user = {}, onSetName, onAuthClick, onLogout, onOpenSettings) {
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

  // badges removed — action days not relevant in new GP system
  const badges = document.createElement('div');
  badges.className = 'small';
  badges.style.display = 'none';

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

  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'btn btn-ghost';
  settingsBtn.style.padding = '6px';
  settingsBtn.setAttribute('aria-label', 'Settings');
  settingsBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81a.488.488 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" fill="currentColor"/>
    </svg>
  `;
  settingsBtn.addEventListener('click', () => {
    if (onOpenSettings) onOpenSettings();
  });

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
  titleRow.appendChild(settingsBtn);

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
  content.appendChild(buttonRow);

  wrap.appendChild(avatar);
  wrap.appendChild(content);
  return wrap;
}
