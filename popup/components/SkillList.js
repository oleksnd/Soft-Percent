import {sortSkills} from '../../utils/calc.js';

function msToHms(ms) {
  if (!ms || ms <= 0) return '0m';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function SkillList(skills, handlers = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'skill-list';

  skills.forEach((s) => {
    const row = document.createElement('div');
    row.className = 'skill-row';

    const left = document.createElement('div');
    left.className = 'skill-left';

    const emoji = document.createElement('div');
    emoji.className = 'emoji';
    emoji.textContent = s.emoji || '⭐';

    const meta = document.createElement('div');
    function renderMeta() {
      meta.innerHTML = '';
      const nameDiv = document.createElement('div');
      nameDiv.className = 'skill-name';
      nameDiv.textContent = s.name;
      const info = document.createElement('div');
      info.className = 'skill-meta';
      info.textContent = `since start • +${(s.cumulativeGrowth || 0).toFixed(2)}%`;
      meta.appendChild(nameDiv);
      meta.appendChild(info);
      if (s.doneToday) {
        const badge = document.createElement('div');
        badge.className = 'badge badge-done';
        badge.style.marginTop = '6px';
        badge.textContent = 'DONE today';
        meta.appendChild(badge);
      }
    }
    renderMeta();
    left.appendChild(emoji);
    left.appendChild(meta);

    // right-side controls container
    const rightControls = document.createElement('div');
    rightControls.style.display = 'flex';
    rightControls.style.alignItems = 'center';
    rightControls.style.gap = '8px';

    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.setAttribute('aria-label', `Mark ${s.name} done today`);
    btn.textContent = '✓';
    // disable if rearm active or reached daily cap
    const now = Date.now();
    const rearmAt = s.rearmAt || 0;
    const checksToday = s.checksTodayCount || 0;
    if (now < rearmAt || checksToday >= 2) {
      btn.disabled = true;
    }
    if (now < rearmAt) {
      btn.title = `Re-arms in ${msToHms(rearmAt - now)}`;
    } else if (checksToday >= 2) {
      btn.title = 'Daily checks limit reached';
    }

    // settings / edit button
  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'btn btn-ghost';
  settingsBtn.textContent = 'Settings';
  settingsBtn.setAttribute('aria-label', `Edit ${s.name}`);
    let editing = false;
    let deleteConfirm = false;
    settingsBtn.addEventListener('click', () => {
      if (!editing) {
        // switch to edit mode
        editing = true;
        const nameInput = document.createElement('input');
        nameInput.value = s.name;
        nameInput.style.width = '160px';
        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-primary';
        saveBtn.textContent = 'Save';
        const delBtn = document.createElement('button');
        delBtn.className = 'btn';
        delBtn.textContent = 'Delete';

        // replace meta children with inputs
        meta.innerHTML = '';
        meta.appendChild(nameInput);
        meta.appendChild(saveBtn);
        meta.appendChild(delBtn);

        nameInput.focus();

        saveBtn.addEventListener('click', async () => {
          const newName = nameInput.value.trim();
          if (newName && newName !== s.name) {
            if (handlers.onEdit) await handlers.onEdit(s.id, {name: newName});
          }
          editing = false;
        });

        delBtn.addEventListener('click', async () => {
          if (!deleteConfirm) {
            deleteConfirm = true;
            delBtn.textContent = 'Confirm';
            const cancelDel = document.createElement('button');
            cancelDel.className = 'btn';
            cancelDel.textContent = 'Cancel';
            meta.appendChild(cancelDel);
            cancelDel.addEventListener('click', () => {
              deleteConfirm = false;
              // restore row
              editing = false;
              renderMeta();
            });
          } else {
            // confirmed delete
            if (handlers.onDelete) await handlers.onDelete(s.id);
          }
        });

        nameInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') saveBtn.click();
          if (e.key === 'Escape') { editing = false; refreshUI(); }
        });
      } else {
        // if clicked while editing, cancel
        editing = false;
        refreshUI();
      }
    });
    rightControls.appendChild(settingsBtn);
    rightControls.appendChild(btn);

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = '…';
      try {
        if (handlers.onCheck) await handlers.onCheck(s.id);
      } catch (e) {
        // re-enable on failure
        btn.disabled = false;
        btn.textContent = '✓';
        if (handlers.onError) handlers.onError(e);
      }
    });
    row.appendChild(left);
    row.appendChild(rightControls);
    wrap.appendChild(row);
  });

  const footer = document.createElement('div');
  footer.className = 'footer';
  // inline add skill
  const addRow = document.createElement('div');
  addRow.style.display = 'flex';
  addRow.style.gap = '8px';
  const addInput = document.createElement('input');
  addInput.placeholder = 'New skill name';
  addInput.maxLength = 40;
  addInput.style.flex = '1';
  addInput.setAttribute('aria-label', 'New skill name');
  const addConfirm = document.createElement('button');
  addConfirm.className = 'btn btn-primary';
  addConfirm.textContent = 'Add';
  const addCancel = document.createElement('button');
  addCancel.className = 'btn';
  addCancel.textContent = 'Cancel';
  addCancel.style.display = 'none';

  addConfirm.addEventListener('click', async () => {
    const v = addInput.value.trim();
    if (!v) return;
    if (handlers.onAdd) {
      try {
        await handlers.onAdd(v);
        addInput.value = '';
      } catch (e) {
        if (handlers.onError) handlers.onError(e);
      }
    }
  });

  addInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addConfirm.click();
    if (e.key === 'Escape') { addInput.value = ''; }
  });

  addRow.appendChild(addInput);
  addRow.appendChild(addConfirm);
  addRow.appendChild(addCancel);
  footer.appendChild(addRow);
  wrap.appendChild(footer);
  return wrap;
}
