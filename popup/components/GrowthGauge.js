/**
 * Circular progress gauge showing growth and activity metrics
 * @param {Object} props
 * @param {number} props.growthPercent - Total growth percentage
 * @param {number} props.activityScore - Activity score 0-100
 */
// GrowthGauge now displays intra-level progress for personality level.
// Props: { levelInfo: { level, currentPoints, requiredPoints, totalPoints, title }, activityScore }
export function GrowthGauge({ levelInfo = null, activityScore = 0 }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  // compute progress inside current personality level (0..100)
  const progress = levelInfo && levelInfo.requiredPoints ? Math.max(0, Math.min(1, levelInfo.currentPoints / levelInfo.requiredPoints)) * 100 : 0;
  const strokeDasharray = `${(progress / 100) * circumference} ${circumference}`;

  // Return a compact gauge element (no outer card) so the parent can place it.
  const el = document.createElement('div');
  el.className = 'gauge-wrap';
  el.setAttribute('role', 'img');
  const titleText = levelInfo ? `${levelInfo.title}, Lvl ${levelInfo.level}` : 'Personal Growth';
  el.setAttribute('aria-label', `${titleText}, progress ${progress.toFixed(0)}%, activity score ${activityScore} out of 100`);

  // Create SVG for circular progress
  const svgWrap = document.createElement('div');
  svgWrap.style.position = 'relative';
  svgWrap.style.width = '120px';
  svgWrap.style.height = '120px';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 120 120');
  svg.setAttribute('class', 'gauge');

  // Background circle
  const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bgCircle.setAttribute('class', 'gauge-bg');
  bgCircle.setAttribute('cx', '60');
  bgCircle.setAttribute('cy', '60');
  bgCircle.setAttribute('r', String(radius));

  // Progress arc
  const progressArc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  progressArc.setAttribute('class', 'gauge-fill');
  progressArc.setAttribute('cx', '60');
  progressArc.setAttribute('cy', '60');
  progressArc.setAttribute('r', String(radius));
  progressArc.style.strokeDasharray = strokeDasharray;

  svg.appendChild(bgCircle);
  svg.appendChild(progressArc);
  svgWrap.appendChild(svg);

  // Center label: title and level
  const label = document.createElement('div');
  label.className = 'gauge-label';
  label.style.position = 'absolute';
  label.style.left = '50%';
  label.style.top = '50%';
  label.style.transform = 'translate(-50%, -50%)';
  label.style.pointerEvents = 'none';
  label.style.display = 'flex';
  label.style.flexDirection = 'column';
  label.style.alignItems = 'center';

  const value = document.createElement('div');
  value.className = 'gauge-value';
  value.textContent = levelInfo ? `${levelInfo.title}, Lvl ${levelInfo.level}` : 'Lvl 0';

  const caption = document.createElement('div');
  caption.className = 'gauge-caption';
  caption.textContent = levelInfo ? `${Math.round(levelInfo.currentPoints)}/${Math.round(levelInfo.requiredPoints)} GP` : '';

  label.appendChild(value);
  label.appendChild(caption);

  svgWrap.appendChild(label);
  el.appendChild(svgWrap);

  // Animate on first render
  const target = (progress / 100) * circumference;
  progressArc.style.strokeDasharray = `0 ${circumference}`;
  requestAnimationFrame(() => {
    progressArc.style.transition = 'stroke-dasharray 0.28s ease';
    progressArc.style.strokeDasharray = `${target} ${circumference}`;
  });

  return el;
}