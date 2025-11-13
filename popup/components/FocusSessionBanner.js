/**
 * FocusSessionBanner component
 * Displays prominently at the top of the UI during an active focus session
 * Shows skill name, countdown timer, and stop button
 */

export class FocusSessionBanner {
  constructor({ onStop, onError }) {
    this.onStop = onStop;
    this.onError = onError;
    this.element = null;
    this.timerInterval = null;
    this.activeTimer = null;
  }
  
  render() {
    const banner = document.createElement('div');
    banner.className = 'focus-session-banner';
    banner.style.display = 'none'; // Hidden by default
    
    const content = document.createElement('div');
    content.className = 'focus-banner-content';
    
    const header = document.createElement('div');
    header.className = 'focus-banner-header';
    header.textContent = 'Focus Session';
    
    const skillName = document.createElement('div');
    skillName.className = 'focus-banner-skill';
    skillName.textContent = '';
    
    const timer = document.createElement('div');
    timer.className = 'focus-banner-timer';
    timer.textContent = '00:00';
    
  // Controls: pause/resume/finish/cancel
  const controls = document.createElement('div');
  controls.className = 'focus-banner-controls';

  const pauseBtn = document.createElement('button');
  pauseBtn.className = 'btn focus-banner-pause-btn';
  pauseBtn.innerHTML = '⏸️ Pause';
  pauseBtn.onclick = () => this.handlePause();

  const resumeBtn = document.createElement('button');
  resumeBtn.className = 'btn focus-banner-resume-btn';
  resumeBtn.innerHTML = '▶️ Resume';
  resumeBtn.onclick = () => this.handleResume();

  const finishBtn = document.createElement('button');
  finishBtn.className = 'btn focus-banner-finish-btn';
  finishBtn.innerHTML = '🏁 Finish (award)';
  finishBtn.onclick = () => this.handleFinish();

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn focus-banner-cancel-btn';
  cancelBtn.innerHTML = '✖️ Cancel';
  cancelBtn.onclick = () => this.handleCancel();

  // Default: append controls (we'll toggle visibility based on timer state)
  controls.appendChild(pauseBtn);
  controls.appendChild(resumeBtn);
  controls.appendChild(finishBtn);
  controls.appendChild(cancelBtn);

  // Keep references for later toggling
  this.pauseBtn = pauseBtn;
  this.resumeBtn = resumeBtn;
  this.finishBtn = finishBtn;
  this.cancelBtn = cancelBtn;
    
  content.appendChild(header);
  content.appendChild(skillName);
  content.appendChild(timer);
  content.appendChild(controls);
    
    banner.appendChild(content);
    
    this.element = banner;
    this.timerElement = timer;
    this.skillNameElement = skillName;
    
    // Start checking for active timer
    this.startChecking();
    
    return banner;
  }
  
  async startChecking() {
    // Check immediately
    await this.checkTimerStatus();
    
    // Then check every second
    this.timerInterval = setInterval(async () => {
      await this.checkTimerStatus();
    }, 1000);
  }
  
  async checkTimerStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ 
        type: 'GET_TIMER_STATUS' 
      });
      
      if (response.ok && response.result.active) {
        const timer = response.result.timer;
        this.activeTimer = timer;
        
        // Show banner
        this.element.style.display = 'block';
        
        // Update skill name
        this.skillNameElement.textContent = timer.skillName;
        
        // Update countdown
        const minutes = Math.floor(timer.remainingSeconds / 60);
        const seconds = timer.remainingSeconds % 60;
        this.timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Toggle controls depending on paused state
        const isPaused = !!timer.isPaused;
        if (this.pauseBtn && this.resumeBtn && this.finishBtn && this.cancelBtn) {
          this.pauseBtn.style.display = isPaused ? 'none' : 'inline-block';
          this.resumeBtn.style.display = isPaused ? 'inline-block' : 'none';
          // finish and cancel always available
          this.finishBtn.style.display = 'inline-block';
          this.cancelBtn.style.display = 'inline-block';
        }
        
      } else {
        // No active timer - hide banner
        this.element.style.display = 'none';
        this.activeTimer = null;
      }
    } catch (error) {
      console.error('Failed to check timer status:', error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }

  // helper to send a message and return response
  async sendMessage(type, payload = {}) {
    try {
      const response = await chrome.runtime.sendMessage({ type, payload });
      return response;
    } catch (err) {
      console.error('sendMessage error', err);
      throw err;
    }
  }

  async handlePause() {
    if (!this.activeTimer) return;
    try {
      const resp = await this.sendMessage('PAUSE_TIMER', { skillId: this.activeTimer.skillId });
      if (resp && resp.ok) {
        await this.checkTimerStatus();
      } else {
        throw new Error(resp && resp.error ? resp.error : 'Pause failed');
      }
    } catch (err) {
      console.error('Pause error', err);
      if (this.onError) this.onError(err);
    }
  }

  async handleResume() {
    if (!this.activeTimer) return;
    try {
      const resp = await this.sendMessage('RESUME_TIMER', { skillId: this.activeTimer.skillId });
      if (resp && resp.ok) {
        await this.checkTimerStatus();
      } else {
        throw new Error(resp && resp.error ? resp.error : 'Resume failed');
      }
    } catch (err) {
      console.error('Resume error', err);
      if (this.onError) this.onError(err);
    }
  }

  async handleFinish() {
    if (!this.activeTimer) return;
    try {
      const resp = await this.sendMessage('FINISH_TIMER_EARLY', { skillId: this.activeTimer.skillId });
      if (resp && resp.ok) {
        // Let background open session_complete and clear timer; update UI
        await this.checkTimerStatus();
      } else {
        throw new Error(resp && resp.error ? resp.error : 'Finish failed');
      }
    } catch (err) {
      console.error('Finish error', err);
      if (this.onError) this.onError(err);
    }
  }

  async handleCancel() {
    if (!this.activeTimer) return;
    try {
      const resp = await this.sendMessage('CANCEL_TIMER', { skillId: this.activeTimer.skillId });
      if (resp && resp.ok) {
        await this.checkTimerStatus();
      } else {
        throw new Error(resp && resp.error ? resp.error : 'Cancel failed');
      }
    } catch (err) {
      console.error('Cancel error', err);
      if (this.onError) this.onError(err);
    }
  }
  
  async handleStop() {
    if (!this.activeTimer) return;
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'STOP_TIMER',
        payload: { skillId: this.activeTimer.skillId }
      });
      
      if (response.ok) {
        // Banner will hide automatically on next checkTimerStatus
        await this.checkTimerStatus();
      } else {
        if (this.onError) {
          this.onError(new Error(response.error || 'Failed to stop timer'));
        }
      }
    } catch (error) {
      if (this.onError) {
        this.onError(error);
      }
    }
  }
  
  destroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
