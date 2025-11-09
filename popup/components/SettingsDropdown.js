/**
 * Settings dropdown menu component
 * Shows when user clicks the settings icon
 */
export function SettingsDropdown(onResetAccount) {
  const dropdown = document.createElement('div');
  dropdown.className = 'settings-dropdown';
  dropdown.style.position = 'absolute';
  dropdown.style.top = '100%';
  dropdown.style.right = '0';
  dropdown.style.marginTop = '4px';
  dropdown.style.background = '#fff';
  dropdown.style.border = '1px solid #e6eef7';
  dropdown.style.borderRadius = '8px';
  dropdown.style.boxShadow = '0 6px 16px rgba(2,6,23,0.12)';
  dropdown.style.zIndex = '1000';
  dropdown.style.minWidth = '180px';
  dropdown.style.overflow = 'hidden';

  const resetOption = document.createElement('button');
  resetOption.className = 'settings-option settings-option-danger';
  resetOption.textContent = 'Reset Account';
  resetOption.style.width = '100%';
  resetOption.style.padding = '12px 16px';
  resetOption.style.border = 'none';
  resetOption.style.background = 'transparent';
  resetOption.style.color = '#ef4444';
  resetOption.style.fontSize = '14px';
  resetOption.style.textAlign = 'left';
  resetOption.style.cursor = 'pointer';
  resetOption.style.fontWeight = '500';
  resetOption.setAttribute('aria-label', 'Reset account - this will delete all data');

  resetOption.addEventListener('mouseenter', () => {
    resetOption.style.background = '#fef2f2';
  });
  resetOption.addEventListener('mouseleave', () => {
    resetOption.style.background = 'transparent';
  });
  resetOption.addEventListener('click', () => {
    if (onResetAccount) onResetAccount();
  });

  dropdown.appendChild(resetOption);

  return dropdown;
}
