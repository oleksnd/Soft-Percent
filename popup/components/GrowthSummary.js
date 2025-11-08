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
  const levelInfo = calculatePersonalityLevel(summary.personalityGrowthIndex || 0);
  const gauge = GrowthGauge({ levelInfo, activityScore: summary.activityScore || 0 });
  // ensure gauge stays left and has a fixed size
  gauge.style.flex = '0 0 auto';
  el.appendChild(gauge);

  // Right side: descriptive stats and accessibility fallback
  const meta = document.createElement('div');
  meta.style.flex = '1 1 auto';
  meta.style.display = 'flex';
  meta.style.flexDirection = 'column';
  meta.style.gap = '6px';

  // Right-side descriptions only; percent is shown inside the ring
  const desc = document.createElement('div');
  desc.className = 'small';
  desc.textContent = `${levelInfo.title}, Lvl ${levelInfo.level} — activity ${summary.activityScore || 0}/100`;

  meta.appendChild(desc);
  el.appendChild(meta);

  return el;
}
