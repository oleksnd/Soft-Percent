/**
 * Circular progress gauge showing growth and activity metrics
 * @param {Object} props
 * @param {number} props.growthPercent - Total growth percentage
 * @param {number} props.activityScore - Activity score 0-100
 */
export function GrowthGauge({ growthPercent = 0, activityScore = 0 }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, activityScore)); // clamp 0-100
  const strokeDasharray = `${(progress / 100) * circumference} ${circumference}`;
  
  const el = document.createElement('div');
  el.className = 'gauge-card card';
  el.setAttribute('role', 'region');
  el.setAttribute('aria-label', `Personal Growth: ${growthPercent.toFixed(2)} percent, activity score ${activityScore} out of 100`);

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

  // Label in center (absolute)
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
  value.textContent = `+${growthPercent.toFixed(2)}%`;

  const caption = document.createElement('div');
  caption.className = 'gauge-caption';
  caption.textContent = 'Personal Growth';

  label.appendChild(value);
  label.appendChild(caption);

  el.appendChild(svgWrap);
  el.appendChild(label);

  // Animate on first render
  // set initial dasharray then animate to target
  const target = (progress / 100) * circumference;
  progressArc.style.strokeDasharray = `0 ${circumference}`;
  requestAnimationFrame(() => {
    progressArc.style.transition = 'stroke-dasharray 0.28s ease';
    progressArc.style.strokeDasharray = `${target} ${circumference}`;
  });

  return el;
}