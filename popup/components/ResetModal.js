/**
 * Reset Account confirmation modal
 * Requires user to type "DELETE" to enable the reset button
 */
export function ResetModal(onConfirm, onCancel) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.right = '0';
  overlay.style.bottom = '0';
  overlay.style.background = 'rgba(15, 23, 42, 0.6)';
  overlay.style.zIndex = '9999';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.padding = '20px';

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.background = '#fff';
  modal.style.borderRadius = '12px';
  modal.style.padding = '24px';
  modal.style.maxWidth = '400px';
  modal.style.width = '100%';
  modal.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';

  const title = document.createElement('h2');
  title.textContent = 'Are you absolutely sure?';
  title.style.margin = '0 0 16px 0';
  title.style.fontSize = '18px';
  title.style.fontWeight = '600';
  title.style.color = '#0f172a';

  const warning = document.createElement('p');
  warning.textContent = 'This action cannot be undone. This will permanently delete all your skills, progress, and history.';
  warning.style.margin = '0 0 20px 0';
  warning.style.fontSize = '14px';
  warning.style.color = '#64748b';
  warning.style.lineHeight = '1.5';

  const instructionLabel = document.createElement('label');
  instructionLabel.textContent = 'Please type DELETE to confirm.';
  instructionLabel.style.display = 'block';
  instructionLabel.style.fontSize = '13px';
  instructionLabel.style.fontWeight = '500';
  instructionLabel.style.marginBottom = '8px';
  instructionLabel.style.color = '#0f172a';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Type DELETE';
  input.style.width = '100%';
  input.style.padding = '10px 12px';
  input.style.border = '1px solid #e6eef7';
  input.style.borderRadius = '6px';
  input.style.fontSize = '14px';
  input.style.marginBottom = '20px';
  input.style.fontFamily = 'inherit';
  input.setAttribute('aria-label', 'Type DELETE to confirm');

  const buttonRow = document.createElement('div');
  buttonRow.style.display = 'flex';
  buttonRow.style.gap = '12px';
  buttonRow.style.justifyContent = 'flex-end';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.padding = '10px 16px';
  cancelBtn.addEventListener('click', () => {
    if (onCancel) onCancel();
    overlay.remove();
  });

  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn';
  resetBtn.textContent = 'Reset My Account';
  resetBtn.style.padding = '10px 16px';
  resetBtn.style.background = '#ef4444';
  resetBtn.style.color = '#fff';
  resetBtn.style.border = 'none';
  resetBtn.style.fontWeight = '500';
  resetBtn.disabled = true;
  resetBtn.style.opacity = '0.5';
  resetBtn.style.cursor = 'not-allowed';

  // Enable button only when user types "DELETE"
  input.addEventListener('input', () => {
    const isMatch = input.value.trim() === 'DELETE';
    resetBtn.disabled = !isMatch;
    resetBtn.style.opacity = isMatch ? '1' : '0.5';
    resetBtn.style.cursor = isMatch ? 'pointer' : 'not-allowed';
  });

  resetBtn.addEventListener('click', () => {
    if (input.value.trim() === 'DELETE') {
      if (onConfirm) onConfirm();
      overlay.remove();
    }
  });

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      if (onCancel) onCancel();
      overlay.remove();
    }
  });

  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      if (onCancel) onCancel();
      overlay.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);

  buttonRow.appendChild(cancelBtn);
  buttonRow.appendChild(resetBtn);

  modal.appendChild(title);
  modal.appendChild(warning);
  modal.appendChild(instructionLabel);
  modal.appendChild(input);
  modal.appendChild(buttonRow);

  overlay.appendChild(modal);

  // Focus input after a brief delay
  setTimeout(() => input.focus(), 100);

  return overlay;
}
