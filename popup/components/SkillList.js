import {sortSkills, calculateLevel} from '../../utils/calc.js';

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
  // make left relative so emoji picker can be absolute and not push layout
  left.style.position = 'relative';

  const emoji = document.createElement('div');
  emoji.className = 'emoji';
  // if done today, show green check instead of emoji and disable click/tooltip
  if (s.doneToday) {
    emoji.innerHTML = '<div class="done-indicator"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>';
    emoji.style.cursor = 'default';
  } else {
    emoji.textContent = s.emoji || '⭐';
    emoji.style.cursor = 'pointer';
    emoji.title = 'Change emoji';
  }

    const meta = document.createElement('div');
    function renderMeta() {
      meta.innerHTML = '';
      // name row contains name and optional round done indicator
      const nameRow = document.createElement('div');
      nameRow.style.display = 'flex';
      nameRow.style.alignItems = 'center';
      nameRow.style.gap = '8px';

      const nameDiv = document.createElement('div');
      nameDiv.className = 'skill-name';
      nameDiv.textContent = s.name;
      nameRow.appendChild(nameDiv);

      // done indicator moved to left (replaces emoji) when doneToday

      const info = document.createElement('div');
      info.className = 'skill-meta';
      // show level and GP progress instead of cumulative percent
      try {
        // ensure we pass a numeric value (1% == 1 GP). calculateLevel expects totalPoints.
        const cum = Number(s.cumulativeGrowth) || 0;
        const lvl = calculateLevel(cum);
  // after scaling, show GP as rounded integers for readability
  const current = Number(lvl.currentPoints);
  const required = Number(lvl.requiredPoints);
  const curStr = Math.round(current);
  const reqStr = Math.round(required);
  info.textContent = `since start • Lvl ${lvl.level} • ${curStr}/${reqStr} GP`;
      } catch (e) {
        // fallback to previous percent display if something unexpected happens
        const cg = Number(s.cumulativeGrowth) || 0;
        info.textContent = `since start • +${cg.toFixed(4)}%`;
      }
      meta.appendChild(nameRow);
      meta.appendChild(info);
    }
    renderMeta();
    left.appendChild(emoji);
    left.appendChild(meta);

    // emoji picker for existing skill (hidden by default)
    const emojiPicker = document.createElement('div');
    emojiPicker.className = 'emoji-picker';
  emojiPicker.style.display = 'none';
  emojiPicker.style.position = 'absolute';
  emojiPicker.style.left = '44px';
  emojiPicker.style.top = '36px';
  // use slightly larger gap, wrap, and tighter padding so the right edge hugs the last emoji
  emojiPicker.style.gap = '8px';
  emojiPicker.style.alignItems = 'center';
  emojiPicker.style.flexWrap = 'wrap';
  emojiPicker.style.padding = '6px';
  emojiPicker.style.background = '#fff';
  emojiPicker.style.border = '1px solid #e6eef7';
  emojiPicker.style.boxShadow = '0 6px 18px rgba(2,6,23,0.06)';
  emojiPicker.style.borderRadius = '8px';
  emojiPicker.style.zIndex = '40';

    const ROW_EMOJIS = ['🎓','🏃‍♂️','💼','📚','🧘‍♀️','🏋️‍♂️','🎨','🧪','💻','🛠️','⭐','🧠','🎯','📝','🌱','🎵'];
    ROW_EMOJIS.forEach((e) => {
      const be = document.createElement('button');
      be.className = 'btn';
      be.textContent = e;
      // make emoji buttons square so grid edges hug content
      be.style.padding = '6px';
      be.style.fontSize = '18px';
      be.style.width = '40px';
      be.style.height = '40px';
      be.style.display = 'inline-flex';
      be.style.alignItems = 'center';
      be.style.justifyContent = 'center';
      be.addEventListener('click', async (ev) => {
        // update UI immediately
        emoji.textContent = e;
        // hide all other pickers and remove their handlers
        Array.from(document.querySelectorAll('.emoji-picker')).forEach(p => {
          if (p !== emojiPicker) {
            p.style.display = 'none';
            if (p._outsideClickHandler) document.removeEventListener('click', p._outsideClickHandler);
          }
        });
        // persist change
        if (handlers.onEdit) {
          try {
            await handlers.onEdit(s.id, {emoji: e});
          } catch (err) {
            if (handlers.onError) handlers.onError(err);
          }
        }
        // close this picker and remove its handler
        emojiPicker.style.display = 'none';
        if (emojiPicker._outsideClickHandler) {
          document.removeEventListener('click', emojiPicker._outsideClickHandler);
          emojiPicker._outsideClickHandler = null;
        }
      });
      emojiPicker.appendChild(be);
    });
    left.appendChild(emojiPicker);

    // show/hide picker when emoji clicked (only if not done today)
    emoji.addEventListener('click', (ev) => {
      if (s.doneToday) return; // don't open picker for completed task
      // close other pickers and remove their outside handlers
      Array.from(document.querySelectorAll('.emoji-picker')).forEach(p => {
        if (p !== emojiPicker) {
          p.style.display = 'none';
          if (p._outsideClickHandler) document.removeEventListener('click', p._outsideClickHandler);
          p._outsideClickHandler = null;
        }
      });
      const willOpen = emojiPicker.style.display === 'none';
      emojiPicker.style.display = willOpen ? 'flex' : 'none';

      if (willOpen) {
        // attach outside-click handler (delayed to avoid immediate trigger from this click)
        const outside = (e) => {
          if (!emojiPicker.contains(e.target) && e.target !== emoji) {
            emojiPicker.style.display = 'none';
            document.removeEventListener('click', outside);
            emojiPicker._outsideClickHandler = null;
          }
        };
        emojiPicker._outsideClickHandler = outside;
        setTimeout(() => document.addEventListener('click', outside), 0);
      } else {
        if (emojiPicker._outsideClickHandler) {
          document.removeEventListener('click', emojiPicker._outsideClickHandler);
          emojiPicker._outsideClickHandler = null;
        }
      }
    });

    // right-side controls container
    const rightControls = document.createElement('div');
    rightControls.style.display = 'flex';
    rightControls.style.alignItems = 'center';
    rightControls.style.gap = '8px';

  const btn = document.createElement('button');
  btn.className = 'btn-done';
  btn.setAttribute('aria-label', `Mark ${s.name} done today`);
  // prettier check svg
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" stroke="#0f172a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
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
    // helper to hide/show right-side controls while editing
    function setControlsVisible(visible) {
      settingsBtn.style.display = visible ? '' : 'none';
      btn.style.display = visible ? '' : 'none';
    }
    let deleteConfirm = false;
    settingsBtn.addEventListener('click', () => {
      if (!editing) {
        // switch to edit mode
        // hide the right controls (settings and done) to avoid overflow
        setControlsVisible(false);
        editing = true;
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = s.name;
  // use same flexible input style as header name input
  nameInput.style.flex = '1';
  nameInput.style.minWidth = '0';
  nameInput.maxLength = 80;
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = 'Save';
  // cancel button always available
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn';
  cancelBtn.textContent = 'Cancel';
  const delBtn = document.createElement('button');
  delBtn.className = 'btn';
  delBtn.textContent = 'Delete';
  // layout: input on top, controls below; add spacing between input and buttons
  delBtn.style.marginLeft = '12px';

        // replace meta children with inputs
        meta.innerHTML = '';
        meta.appendChild(nameInput);
        meta.appendChild(saveBtn);
        meta.appendChild(delBtn);

        nameInput.focus();

  saveBtn.addEventListener('click', async () => {
          const newName = nameInput.value.trim();
          // always attempt to save (even if unchanged) as requested
          try {
            // optimistic UI update
            s.name = newName;
            renderMeta();
            if (handlers.onEdit) await handlers.onEdit(s.id, {name: newName});
          } catch (err) {
            if (handlers.onError) handlers.onError(err);
          }
          editing = false;
          // restore controls
          setControlsVisible(true);
        });

        cancelBtn.addEventListener('click', () => {
          // discard changes and restore view
          nameInput.value = s.name;
          editing = false;
          // restore controls visibility (fix: controls disappeared after cancel)
          setControlsVisible(true);
          renderMeta();
        });

        // create controls row below input with spacing
        const controlsRow = document.createElement('div');
        controlsRow.style.display = 'flex';
        controlsRow.style.alignItems = 'center';
        controlsRow.style.gap = '8px';
        controlsRow.style.marginTop = '10px';

        // append buttons into controlsRow
        controlsRow.appendChild(saveBtn);
        controlsRow.appendChild(cancelBtn);
        controlsRow.appendChild(delBtn);
        meta.appendChild(nameInput);
        meta.appendChild(controlsRow);

  delBtn.addEventListener('click', async () => {
          if (!deleteConfirm) {
            deleteConfirm = true;
            delBtn.textContent = 'Confirm';
            const cancelDel = document.createElement('button');
            cancelDel.className = 'btn';
            cancelDel.textContent = 'Cancel';
            cancelDel.style.marginLeft = '8px';
            controlsRow.appendChild(cancelDel);
            cancelDel.addEventListener('click', () => {
              deleteConfirm = false;
              // restore row
              editing = false;
              setControlsVisible(true);
              renderMeta();
            });
          } else {
            // confirmed delete
            if (handlers.onDelete) await handlers.onDelete(s.id);
            // after delete the row will disappear on refresh; ensure controls visible for safety
            setControlsVisible(true);
          }
        });

        nameInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') saveBtn.click();
          if (e.key === 'Escape') { editing = false; setControlsVisible(true); renderMeta(); }
        });
      } else {
        // if clicked while editing, cancel
        editing = false;
        setControlsVisible(true);
        renderMeta();
      }
    });
  rightControls.appendChild(settingsBtn);
  rightControls.appendChild(btn);

    // remember original content so we can restore it after async work
    const _origBtnInner = btn.innerHTML;
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      // show a spinner-like indicator
      btn.textContent = '…';
      try {
        if (handlers.onCheck) await handlers.onCheck(s.id);
      } catch (e) {
        // bubble error to popup if provided
        if (handlers.onError) handlers.onError(e);
      } finally {
        // if the button was removed from DOM by a refresh, skip restoring
        if (!btn.isConnected) return;
        btn.disabled = false;
        btn.innerHTML = _origBtnInner;
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
  addPanel.style.flexDirection = 'column';
  addPanel.style.gap = '8px';

  const addInput = document.createElement('input');
  addInput.type = 'text';
  addInput.placeholder = 'New skill name';
  addInput.maxLength = 80;
  addInput.setAttribute('aria-label', 'New skill name');
  // use same flexible input style as header
  addInput.style.flex = '1';
  addInput.style.minWidth = '0';

  // emoji picker row
  const emojiRow = document.createElement('div');
  emojiRow.style.display = 'flex';
  emojiRow.style.gap = '8px';
  // allow wrapping to next line instead of creating inner scrollbars
  emojiRow.style.flexWrap = 'wrap';
  emojiRow.style.maxWidth = '100%';
  emojiRow.style.overflowX = 'hidden';
  emojiRow.style.paddingBottom = '6px';

  // default emoji set (expanded with more activities and growth icons)
  const EMOJIS = ['🎓','🏃‍♂️','💼','📚','🧘‍♀️','🏋️‍♂️','🎨','🧪','💻','🛠️','⭐','🧠','🎯','📝','🌱','🎵'];
  let selectedEmoji = '⭐';

  EMOJIS.forEach((e) => {
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = e;
    // compact emoji buttons to help wrapping
    b.style.padding = '6px';
    b.style.fontSize = '18px';
    b.style.width = '44px';
    b.style.height = '44px';
    b.style.display = 'inline-flex';
    b.style.alignItems = 'center';
    b.style.justifyContent = 'center';
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
  addControls.style.marginTop = '10px';

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
  // ensure buttons are below emoji row and slightly lower
  addPanel.appendChild(addControls);
  footer.appendChild(addPanel);

  addBtn.addEventListener('click', () => {
    // hide the Add Skill button and show the panel
    addBtn.style.display = 'none';
    addPanel.style.display = 'flex';
    // focus the input
    addInput.focus();
    // attach outside-click handler to close the addPanel when clicking outside
    const outsideAdd = (e) => {
      if (!addPanel.contains(e.target) && e.target !== addBtn) {
        addPanel.style.display = 'none';
        addBtn.style.display = '';
        document.removeEventListener('click', outsideAdd);
        addPanel._outsideClickHandler = null;
      }
    };
    addPanel._outsideClickHandler = outsideAdd;
    // delay attachment so the opening click doesn't immediately close it
    setTimeout(() => document.addEventListener('click', outsideAdd), 0);
  });

  addCancel.addEventListener('click', () => {
    addInput.value = '';
    addPanel.style.display = 'none';
    addBtn.style.display = '';
    if (addPanel._outsideClickHandler) {
      document.removeEventListener('click', addPanel._outsideClickHandler);
      addPanel._outsideClickHandler = null;
    }
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
        // restore Add Skill button
        addBtn.style.display = '';
        if (addPanel._outsideClickHandler) {
          document.removeEventListener('click', addPanel._outsideClickHandler);
          addPanel._outsideClickHandler = null;
        }
      } catch (e) {
        if (handlers.onError) handlers.onError(e);
      }
    }
  });

  addInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addConfirm.click();
    if (e.key === 'Escape') {
      addInput.value = '';
      addPanel.style.display = 'none';
      addBtn.style.display = '';
      if (addPanel._outsideClickHandler) {
        document.removeEventListener('click', addPanel._outsideClickHandler);
        addPanel._outsideClickHandler = null;
      }
    }
  });
  return wrap;
}
