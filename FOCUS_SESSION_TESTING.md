# Focus Session Feature - Testing Guide (v2.0)

## Overview
The Focus Session feature is a Pomodoro-style timer with a **prominent banner** at the top of the UI. When a timer is active, the banner shows the skill name, a large countdown timer, and a stop button. The timer persists in the background and auto-checks the skill on completion.

## Key Changes in v2.0
- ✨ **Banner at top of UI** - Highly visible, always in view
- 🎯 **Large 48px timer** - Easy to read at a glance
- 🎨 **Green gradient design** - Matches app theme, indicates focus mode
- 🧹 **Cleaner skill list** - Just play button, no inline timer clutter

## Testing Instructions

### 1. Load Extension
1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the Soft-Percent folder
6. Open the extension popup

### 2. Test Banner Appears on Timer Start
1. Click the ▶️ play button next to any skill (e.g., "Coding")
2. Modal appears with duration options
3. Select a duration (e.g., 25 min)
4. **Verify:**
   - ✅ **Banner appears at top** above header
   - ✅ Banner shows "FOCUS SESSION"
   - ✅ Skill name displayed ("Coding")
   - ✅ Timer shows "25:00"
   - ✅ "⏹️ Stop Session" button present
   - ✅ Extension badge shows "25m"
   - ✅ Green gradient background on banner

### 3. Test Timer Countdown Updates
1. With active timer, watch the banner
2. **Verify:**
   - ✅ Countdown decrements every second (25:00 → 24:59 → 24:58...)
   - ✅ Large 48px timer is easily readable
   - ✅ Badge updates every minute (25m → 24m → 23m...)

### 4. Test Stop Button in Banner
1. Click "⏹️ Stop Session" button in banner
2. **Verify:**
   - ✅ Banner disappears immediately
   - ✅ Timer is cancelled (no notification later)
   - ✅ Badge clears
   - ✅ Play button still available on skill

### 5. Test Popup Close/Reopen
1. Start a timer (use 1-min test duration - see Quick Test below)
2. Close extension popup
3. Wait a few seconds
4. Reopen popup
5. **Verify:**
   - ✅ Banner still visible with updated countdown
   - ✅ Skill name still shown
   - ✅ Stop button still works

### 6. Test Timer Completion (Quick Test)

**Quick Method: 1-Minute Timer**
1. Temporarily modify `FocusSessionPicker.js`:
   ```js
   this.durations = [
     { label: 'Test 1min', seconds: 60 },
     { label: '25 min', seconds: 25 * 60 },
     { label: '50 min', seconds: 50 * 60 }
   ];
   ```
2. Reload extension
3. Start "Test 1min" session on a skill
4. Wait 1 minute
5. **Verify:**
   - ✅ System notification: "Focus Session Complete! 🎉"
   - ✅ Banner disappears
   - ✅ Skill shows green checkmark (auto-checked)
   - ✅ Badge clears
   - ✅ GP awarded (check Growth Summary)

### 7. Test Banner Visual Design
1. Start any timer
2. **Verify banner styling:**
   - ✅ Green gradient background (#10b981 → #059669)
   - ✅ Rounded corners (12px border-radius)
   - ✅ Drop shadow visible
   - ✅ White text on green background (high contrast)
   - ✅ Timer font is monospace, 48px, bold
   - ✅ Stop button has glass effect (translucent white)
   - ✅ Smooth slide-down animation on appear

### 8. Test Multiple Skills
1. Start timer on Skill A
2. Try to start timer on Skill B
3. **Verify:**
   - ✅ Banner shows Skill A's timer
   - ✅ Only one timer active at a time
   - ✅ Starting Skill B replaces Skill A's timer in banner

### 9. Test Banner Position
1. Start a timer
2. Scroll through popup (if you have many skills)
3. **Verify:**
   - ✅ Banner is at absolute top, above header
   - ✅ Banner does not scroll away (fixed position would be better, but for 420px popup it's fine)
   - ✅ Order: Banner → Header → Growth Summary → Skills

## Debugging Tips

### Check Background Service Worker Logs
1. Go to `chrome://extensions/`
2. Click "Inspect views service worker" under Soft-Percent
3. Check console for:
   - "Starting focus timer for skill..."
   - "Stopping focus timer for skill..."
   - "Timer completed for skill..."
   - Any errors

### Check Alarms
In service worker console:
```js
chrome.alarms.getAll(alarms => {
  console.log('Active alarms:', alarms);
});
```

### Check Storage
In service worker console:
```js
chrome.storage.sync.get('active_focus_timer', result => {
  console.log('Active timer:', result.active_focus_timer);
});
```

### Force Badge Update
In service worker console:
```js
chrome.action.setBadgeText({ text: 'TEST' });
chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
```

## Known Limitations
1. Only one active timer at a time (by design)
2. Timer countdown updates every second (1-second granularity)
3. Badge updates every minute (to reduce battery usage)
4. Timer survives service worker termination but not browser restart (alarms are cleared)

## Success Criteria
- ✅ User can start focus session with duration picker
- ✅ Timer countdown displays and updates every second
- ✅ Badge shows remaining time, updates every minute
- ✅ User can stop timer early
- ✅ Timer completion triggers notification
- ✅ Timer completion auto-checks skill
- ✅ Timer persists through popup close/reopen
- ✅ Timer survives service worker termination
- ✅ UI correctly reflects active timer state on all skills
