import {GrowthGauge} from './GrowthGauge.js';
import {calculatePersonalityLevel} from '../../utils/calc.js';

export function GrowthSummary(summary = {}) {
  // single card wrapper — left: gauge, right: details
  const el = document.createElement('div');
  el.className = 'card gauge-card';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'flex-start';
  el.style.gap = '16px';

  // Determine personality level info (fall back to 0 if not provided)
  // Stored `personalityGrowthIndex` is now already in GP-like units (integer/rounded by background).
  // Use it directly as totalPoints for personality-level calculation.
  const pgiStored = Number(summary.personalityGrowthIndex) || 0;
  const pgiDisplay = Math.round(pgiStored);
  const levelInfo = calculatePersonalityLevel(pgiDisplay);
  const gauge = GrowthGauge({ levelInfo, activityScore: summary.activityScore || 0 });
  // ensure gauge stays left and has a fixed size
  gauge.style.flex = '0 0 auto';
  // Wrap gauge and daily progress note so the note appears under the main graph
  const leftWrap = document.createElement('div');
  leftWrap.style.display = 'flex';
  leftWrap.style.flexDirection = 'column';
  leftWrap.style.alignItems = 'center';
  leftWrap.appendChild(gauge);
  // Daily GP earned (shown under the gauge)
  const dailyGP = Math.round(Number(summary.dailyGP) || 0);
  if (dailyGP > 0) {
    const note = document.createElement('div');
    note.className = 'tiny';
    note.style.marginTop = '8px';
    note.textContent = `Сегодня заработано: +${dailyGP} GP`;
    leftWrap.appendChild(note);
  }
  el.appendChild(leftWrap);

  // Right side: descriptive stats and accessibility fallback
  const meta = document.createElement('div');
  meta.style.flex = '1 1 auto';
  meta.style.display = 'flex';
  meta.style.flexDirection = 'column';
  meta.style.gap = '6px';

  // Right-side descriptions only; percent is shown inside the ring
  const desc = document.createElement('div');
  desc.className = 'small';
  // Remove activity score from this short description (it's not informative inside the gauge view)
  desc.textContent = `${levelInfo.title}, Lvl ${levelInfo.level}`;

  meta.appendChild(desc);
  el.appendChild(meta);

  return el;
}
