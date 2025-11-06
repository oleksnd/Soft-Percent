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
  emoji.style.cursor = 'pointer';
  emoji.title = 'Change emoji';

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

    // emoji picker for existing skill (hidden by default)
    const emojiPicker = document.createElement('div');
    emojiPicker.className = 'emoji-picker';
    emojiPicker.style.display = 'none';
    emojiPicker.style.marginLeft = '8px';
    emojiPicker.style.gap = '6px';
    emojiPicker.style.alignItems = 'center';
    emojiPicker.style.flexWrap = 'wrap';
    emojiPicker.style.padding = '6px 0';

    const ROW_EMOJIS = ['🎓','🏃‍♂️','💼','📚','🧘‍♀️','🏋️‍♂️','🎨','🧪','💻','🛠️','⭐'];
    ROW_EMOJIS.forEach((e) => {
      const be = document.createElement('button');
      be.className = 'btn';
      be.textContent = e;
      be.style.padding = '6px 8px';
      be.style.fontSize = '18px';
      be.addEventListener('click', async (ev) => {
        // update UI immediately
        emoji.textContent = e;
        // hide all other pickers
        Array.from(document.querySelectorAll('.emoji-picker')).forEach(p => p.style.display = 'none');
        // persist change
        if (handlers.onEdit) {
          try {
            await handlers.onEdit(s.id, {emoji: e});
          } catch (err) {
            if (handlers.onError) handlers.onError(err);
          }
        }
      });
      emojiPicker.appendChild(be);
    });
    left.appendChild(emojiPicker);

    // show/hide picker when emoji clicked
    emoji.addEventListener('click', (ev) => {
      // close other pickers
      Array.from(document.querySelectorAll('.emoji-picker')).forEach(p => { if (p !== emojiPicker) p.style.display = 'none'; });
      emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'flex' : 'none';
    });

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

  // Add button (shows the add panel when clicked)
  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-primary';
  addBtn.textContent = 'Add skill';

  footer.appendChild(addBtn);
  wrap.appendChild(footer);

  // Add panel (hidden initially) — contains name input, emoji picker and confirm
  const addPanel = document.createElement('div');
  addPanel.style.display = 'none';
  addPanel.style.marginTop = '8px';
  addPanel.style.display = 'flex';
  addPanel.style.flexDirection = 'column';
  addPanel.style.gap = '8px';

  const addInput = document.createElement('input');
  addInput.placeholder = 'New skill name';
  addInput.maxLength = 40;
  addInput.setAttribute('aria-label', 'New skill name');

  // emoji picker row
  const emojiRow = document.createElement('div');
  emojiRow.style.display = 'flex';
  emojiRow.style.gap = '8px';

  // default emoji set (feel free to adjust)
  const EMOJIS = ['🎓','🏃‍♂️','💼','📚','🧘‍♀️','🏋️‍♂️','🎨','🧪','💻','🛠️'];
  let selectedEmoji = '⭐';

  EMOJIS.forEach((e) => {
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = e;
    b.style.padding = '6px 8px';
    b.style.fontSize = '18px';
    b.addEventListener('click', () => {
      selectedEmoji = e;
      // highlight selection
      Array.from(emojiRow.children).forEach(c => c.classList.remove('selected-emoji'));
      b.classList.add('selected-emoji');
    });
    emojiRow.appendChild(b);
  });

  // pre-select first emoji
  if (emojiRow.firstChild) emojiRow.firstChild.classList.add('selected-emoji');

  const addControls = document.createElement('div');
  addControls.style.display = 'flex';
  addControls.style.gap = '8px';

  const addConfirm = document.createElement('button');
  addConfirm.className = 'btn btn-primary';
  addConfirm.textContent = 'Add';

  const addCancel = document.createElement('button');
  addCancel.className = 'btn';
  addCancel.textContent = 'Cancel';

  addControls.appendChild(addConfirm);
  addControls.appendChild(addCancel);

  addPanel.appendChild(addInput);
  addPanel.appendChild(emojiRow);
  addPanel.appendChild(addControls);
  footer.appendChild(addPanel);

  addBtn.addEventListener('click', () => {
    addPanel.style.display = addPanel.style.display === 'none' ? 'flex' : 'none';
    if (addPanel.style.display !== 'none') {
      addInput.focus();
    }
  });

  addCancel.addEventListener('click', () => {
    addInput.value = '';
    addPanel.style.display = 'none';
  });

  addConfirm.addEventListener('click', async () => {
    const v = addInput.value.trim();
    if (!v) return;
    if (handlers.onAdd) {
      try {
        // pass name and emoji
        await handlers.onAdd({name: v, emoji: selectedEmoji});
        addInput.value = '';
        addPanel.style.display = 'none';
      } catch (e) {
        if (handlers.onError) handlers.onError(e);
      }
    }
  });

  addInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addConfirm.click();
    if (e.key === 'Escape') { addInput.value = ''; addPanel.style.display = 'none'; }
  });
  return wrap;
}
