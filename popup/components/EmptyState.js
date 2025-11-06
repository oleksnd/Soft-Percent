export function EmptyState({onAdd, onSetName} = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'empty';
  const h = document.createElement('div');
  h.style.fontWeight = '700';
  h.textContent = 'Welcome to Soft-Percent';
  const p = document.createElement('p');
  p.className = 'note';
  p.textContent = 'Start gentle: add one skill and check it once per day. No streaks, no pressure.';

  const addRow = document.createElement('div');
  addRow.style.display = 'flex';
  addRow.style.gap = '8px';

  const nameInput = document.createElement('input');
  nameInput.placeholder = 'What would you like to track?';
  nameInput.maxLength = 40;
  nameInput.style.flex = '1';

  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-primary';
  addBtn.textContent = 'Add';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.display = 'none';

  addRow.appendChild(nameInput);
  addRow.appendChild(addBtn);
  addRow.appendChild(cancelBtn);

  const nameLabel = document.createElement('div');
  nameLabel.style.marginTop = '8px';
  const userNameInput = document.createElement('input');
  userNameInput.type = 'text';
  userNameInput.placeholder = 'Your name (optional)';
  userNameInput.style.width = '100%';
  userNameInput.maxLength = 40;
  userNameInput.addEventListener('change', () => {
    const v = userNameInput.value.trim();
    onSetName && onSetName(v);
  });
  nameLabel.appendChild(userNameInput);

  addBtn.addEventListener('click', () => {
    const v = nameInput.value.trim();
    if (!v) return;
    onAdd && onAdd(v);
  });

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addBtn.click();
    if (e.key === 'Escape') { nameInput.value = ''; }
  });

  wrap.appendChild(h);
  wrap.appendChild(p);
  wrap.appendChild(addRow);
  wrap.appendChild(nameLabel);
  // focus
  setTimeout(() => nameInput.focus(), 20);
  return wrap;
}
