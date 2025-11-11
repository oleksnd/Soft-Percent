/**
 * GlobalMomentum - Shows user's overall momentum with multiplier, progress bar, and explanation
 * Displays under the main growth gauge
 */
import { MomentumBar, getMomentumData } from './MomentumBar.js';

export function GlobalMomentum(activeDays = 0) {
  const container = document.createElement('div');
  container.className = 'global-momentum card';
  
  const momentumData = getMomentumData(activeDays);
  
  // Top row: multiplier + emoji and progress bar
  const topRow = document.createElement('div');
  topRow.className = 'momentum-top-row';
  topRow.style.display = 'flex';
  topRow.style.alignItems = 'center';
  topRow.style.gap = '12px';
  
  // Multiplier display with emoji
  const multiplierBox = document.createElement('div');
  multiplierBox.className = 'momentum-multiplier';
  multiplierBox.style.display = 'flex';
  multiplierBox.style.alignItems = 'center';
  multiplierBox.style.gap = '6px';
  multiplierBox.style.fontSize = '18px';
  multiplierBox.style.fontWeight = '600';
  multiplierBox.style.minWidth = '70px';
  
  const emoji = document.createElement('span');
  emoji.textContent = momentumData.emoji;
  emoji.style.fontSize = '20px';
  emoji.setAttribute('aria-hidden', 'true');
  
  const multiplier = document.createElement('span');
  multiplier.textContent = momentumData.multiplier;
  multiplier.style.color = 'var(--fg)';
  
  multiplierBox.appendChild(emoji);
  multiplierBox.appendChild(multiplier);
  
  // Progress bar
  const barContainer = document.createElement('div');
  barContainer.style.flex = '1';
  const bar = MomentumBar(activeDays);
  barContainer.appendChild(bar);
  
  topRow.appendChild(multiplierBox);
  topRow.appendChild(barContainer);
  
  // Explanation text
  const explanation = document.createElement('div');
  explanation.className = 'momentum-explanation';
  explanation.textContent = 'Your Momentum over the last 7 days. The higher it is, the faster your progress grows.';
  explanation.style.fontSize = '12px';
  explanation.style.color = 'var(--muted)';
  explanation.style.marginTop = '8px';
  explanation.style.lineHeight = '1.4';
  
  container.appendChild(topRow);
  container.appendChild(explanation);
  
  return container;
}
