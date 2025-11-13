# Focus Session Feature - Implementation Reference

## Quick Overview
Added Pomodoro-style focus timer to each skill with:
- **Prominent banner** at top of UI showing active session
- Duration picker (25/50/90 minutes)
- Large countdown timer (MM:SS) in banner
- Extension badge showing remaining time
- Stop button in banner
- Auto-check skill on completion
- System notification when done

## User Flow (Version 2.0)

1. User clicks ▶️ play button next to a skill (e.g., "Coding")
2. Modal appears with duration options (25, 50, 90 minutes)
3. User selects duration
4. **Banner appears at top of UI** with:
   - "FOCUS SESSION" header
   - Skill name ("Coding")
   - Large countdown timer (25:00)
   - "⏹️ Stop Session" button
5. Extension icon badge shows "25m"
6. User closes popup - **timer continues in background**
7. After 25 minutes:
   - System notification: "Focus Session Complete! 🎉"
   - Skill automatically checked (green checkmark)
   - Banner disappears
   - Badge clears

## Files Modified

### 1. popup/components/FocusSessionBanner.js (NEW FILE)
**Prominent banner component** displayed at top of UI:
- Always rendered, hidden by default
- Polls GET_TIMER_STATUS every second
- Shows when timer is active, hides when inactive
- Displays: header, skill name, countdown, stop button
- Large 48px timer font for easy reading

### 2. background/index.js
**New Functions:**
- `startTimer(payload)` - Starts focus session, creates alarms, sets badge
- `stopTimer(payload)` - Cancels active timer, clears alarms
- `getTimerStatus()` - Returns current active timer info

**Message Handler Cases Added:**
- `START_TIMER` - Validates and starts timer
- `STOP_TIMER` - Stops active timer
- `GET_TIMER_STATUS` - Gets active timer state

**Alarm Handlers Added:**
- `focus_timer_${skillId}` - Fires on timer completion, auto-checks skill, shows notification
- `focus_badge_update` - Updates badge every minute with remaining time

**Storage:**
- `active_focus_timer` key stores: { skillId, skillName, startTime, endTime, durationInSeconds }

### 3. popup/components/FocusSessionPicker.js (NEW FILE)
Modal component for duration selection:
- Duration buttons: 25min, 50min, 90min
- Cancel button
- Callbacks: `onStart(durationInSeconds)`, `onCancel()`

### 4. popup/components/SkillList.js
**Simplified - only play button:**
- Play button (▶️) per skill - opens duration picker
- **No inline timer display** - all timer info moved to banner
- Cleaner UI, less visual clutter

### 5. popup/main.js
**Added FocusSessionBanner at top:**
- Imports FocusSessionBanner component
- Renders banner first (before header)
- Banner always present, hidden by default

### 6. ui/theme.css
**New Styles:**
- `.focus-session-banner` - **Prominent gradient banner** (green gradient, rounded, shadowed)
- `.focus-banner-timer` - **Large 48px countdown** (monospace, white, drop shadow)
- `.focus-banner-skill` - Skill name in banner (20px, bold, white)
- `.focus-banner-stop-btn` - Stop button with glass effect (backdrop blur, translucent)
- `.focus-picker-overlay` - Modal backdrop with blur
- `.focus-picker-modal` - Animated modal container
- `.focus-picker-duration-btn` - Duration button with hover effects

### 7. manifest.json
**Added Permission:**
- `notifications` - For timer completion alerts

## Usage Flow

### Starting Timer
1. User clicks ▶️ play button on skill
2. Modal appears with duration options
3. User selects duration (e.g., 25 min)
4. Background creates:
   - `focus_timer_${skillId}` alarm (fires at endTime)
   - `focus_badge_update` alarm (periodic, every 1 minute)
   - Stores timer data in chrome.storage.sync
5. UI updates:
   - Play button → Timer display + Stop button
   - Badge shows "25m"

### During Timer
1. UI polls GET_TIMER_STATUS every 1 second
2. Countdown updates: "24:59" → "24:58" → ...
3. Badge updates every 1 minute: "25m" → "24m" → ...

### Stopping Timer (Manual)
1. User clicks ⏹️ stop button
2. Background clears alarms and storage
3. UI reverts: Stop button + Timer → Play button
4. Badge clears

### Timer Completion (Automatic)
1. `focus_timer_${skillId}` alarm fires
2. Background:
   - Calls `checkSkill({ skillId })` - auto-checks the skill
   - Shows notification: "Focus Session Complete! 🎉"
   - Clears timer state and badge
3. UI updates on next GET_TIMER_STATUS poll:
   - Timer display + Stop button → Play button
   - Skill shows green checkmark (doneToday)

## API Contract

### START_TIMER
**Request:**
```js
{
  type: 'START_TIMER',
  payload: {
    skillId: 'uuid',
    durationInSeconds: 1500  // 25 minutes
  }
}
```

**Response:**
```js
{
  ok: true,
  result: {
    success: true,
    endTime: 1234567890000,
    skillName: 'Practice Guitar'
  }
}
```

### STOP_TIMER
**Request:**
```js
{
  type: 'STOP_TIMER',
  payload: { skillId: 'uuid' }
}
```

**Response:**
```js
{ ok: true, result: { success: true } }
```

### GET_TIMER_STATUS
**Request:**
```js
{ type: 'GET_TIMER_STATUS' }
```

**Response (Active):**
```js
{
  ok: true,
  result: {
    active: true,
    timer: {
      skillId: 'uuid',
      skillName: 'Practice Guitar',
      startTime: 1234567890000,
      endTime: 1234569390000,
      remainingSeconds: 1485
    }
  }
}
```

**Response (Inactive):**
```js
{
  ok: true,
  result: { active: false, timer: null }
}
```

## Key Design Decisions

1. **Prominent Top Banner**: Timer info moved from skill list to dedicated banner for maximum visibility
2. **Single Active Timer**: Only one timer can be active at a time (simpler UX, clearer badge)
3. **chrome.alarms for Persistence**: Survives service worker termination
4. **1-second Banner Updates**: Smooth countdown display in banner
5. **1-minute Badge Updates**: Battery-efficient, still informative
6. **Auto-check on Completion**: Reduces friction, encourages use
7. **Large 48px Timer**: Highly visible, easy to read at a glance
8. **Green Gradient Banner**: Matches accent color, indicates active focus state
9. **Always-rendered Banner**: Hidden by default, no mount/unmount lag

## Visual Hierarchy

**Before (v1.0)**: Timer shown inline next to skill
```
┌─────────────────────────┐
│ Header                  │
├─────────────────────────┤
│ Growth Summary          │
├─────────────────────────┤
│ Skills:                 │
│ 🎓 Coding  [24:59] ⏹️  │  ← Timer inline
│ 📚 Reading      ▶️      │
└─────────────────────────┘
```

**After (v2.0)**: Timer in prominent banner
```
┌─────────────────────────┐
│ 🟢 FOCUS SESSION        │  ← NEW: Prominent banner
│    Coding               │
│    24:59                │  ← Large timer
│    [⏹️ Stop Session]    │
├─────────────────────────┤
│ Header                  │
├─────────────────────────┤
│ Growth Summary          │
├─────────────────────────┤
│ Skills:                 │
│ 🎓 Coding          ▶️   │  ← Just play button
│ 📚 Reading         ▶️   │
└─────────────────────────┘
```

## Testing Checklist
- [x] Start timer opens modal with duration options
- [x] Timer countdown displays and updates every second
- [x] Badge shows remaining time and updates every minute
- [x] Stop button cancels timer and clears UI
- [x] Timer completion auto-checks skill
- [x] Timer completion shows notification
- [x] Timer persists through popup close/reopen
- [x] Only one timer active at a time
- [x] No TypeScript/lint errors
- [x] CSS animations smooth and polished

## Future Enhancements (Not Implemented)
- Custom duration input
- Timer history/statistics
- Sound on completion (would need audio files)
- Multiple concurrent timers (more complex UX)
- Pause/resume functionality
- Background sync with external Pomodoro apps
