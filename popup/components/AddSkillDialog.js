export function AddSkillDialog({onConfirm, onCancel} = {}) {
  const dlg = document.createElement('div');
  dlg.className = 'dialog';
  dlg.style.padding = '8px 0';

  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.gap = '8px';

  const name = document.createElement('input');
  name.placeholder = 'New skill name';
  name.style.flex = '1';
  name.maxLength = 40;

  const confirm = document.createElement('button');
  confirm.className = 'btn btn-primary';
  confirm.textContent = 'Add';

  const cancel = document.createElement('button');
  cancel.className = 'btn';
  cancel.textContent = 'Cancel';

  confirm.addEventListener('click', () => {
    const v = name.value.trim();
    if (!v) return; // validation: non-empty
    onConfirm && onConfirm(v);
  });

  cancel.addEventListener('click', () => {
    onCancel && onCancel();
  });

  name.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirm.click();
    if (e.key === 'Escape') cancel.click();
  });

  row.appendChild(name);
  row.appendChild(confirm);
  row.appendChild(cancel);
  dlg.appendChild(row);
  // focus handle
  setTimeout(() => name.focus(), 20);
  return dlg;
}
