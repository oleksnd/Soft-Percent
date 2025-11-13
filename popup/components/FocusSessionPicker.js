/**
 * FocusSessionPicker component
 * Modal dialog for selecting focus session duration
 */

export class FocusSessionPicker {
  constructor({ onStart, onCancel, skillName }) {
    this.onStart = onStart;
    this.onCancel = onCancel;
    this.skillName = skillName || 'Skill';
    
    this.durations = [
      { label: '🧪 10 sec (test)', seconds: 10 },
      { label: '1 min', seconds: 1 * 60 },
      { label: '25 min', seconds: 25 * 60 },
      { label: '50 min', seconds: 50 * 60 },
      { label: '90 min', seconds: 90 * 60 }
    ];
  }
  
  render() {
    const overlay = document.createElement('div');
    overlay.className = 'focus-picker-overlay';
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        this.close();
      }
    };
    
    const modal = document.createElement('div');
    modal.className = 'focus-picker-modal';
    
    const title = document.createElement('h3');
    title.className = 'focus-picker-title';
    title.textContent = `Focus Session: ${this.skillName}`;
    
    const subtitle = document.createElement('p');
    subtitle.className = 'focus-picker-subtitle';
    subtitle.textContent = 'Select duration';
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'focus-picker-buttons';
    
    this.durations.forEach(duration => {
      const btn = document.createElement('button');
      btn.className = 'focus-picker-duration-btn';
      btn.textContent = duration.label;
      btn.onclick = () => {
        this.handleStart(duration.seconds);
      };
      buttonsContainer.appendChild(btn);
    });
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'focus-picker-cancel-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => {
      this.close();
    };
    
    modal.appendChild(title);
    modal.appendChild(subtitle);
    modal.appendChild(buttonsContainer);
    modal.appendChild(cancelBtn);
    
    overlay.appendChild(modal);
    
    this.element = overlay;
    return overlay;
  }
  
  handleStart(durationInSeconds) {
    if (this.onStart) {
      this.onStart(durationInSeconds);
    }
    this.close();
  }
  
  close() {
    if (this.onCancel) {
      this.onCancel();
    }
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}
