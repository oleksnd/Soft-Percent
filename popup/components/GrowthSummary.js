import {GrowthGauge} from './GrowthGauge.js';

export function GrowthSummary(summary = {}) {
  const el = document.createElement('div');
  el.className = 'card gauge-card';

  const gauge = GrowthGauge({ growthPercent: summary.growthPercent || 0, activityScore: summary.activityScore || 0 });
  el.appendChild(gauge);

  // accessible textual fallback
  const sr = document.createElement('div');
  sr.className = 'small';
  sr.style.marginTop = '6px';
  sr.textContent = `Personal Growth: +${(summary.growthPercent || 0).toFixed(2)}% — activity ${summary.activityScore || 0}/100`;
  el.appendChild(sr);

  return el;
}
