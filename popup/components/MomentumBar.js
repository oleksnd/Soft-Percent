/**
 * MomentumBar - 7-segment progress bar showing activity momentum
 * Colors change based on filled segments: light green → green → yellow-orange → red
 */
export function MomentumBar(activeDays, options = {}) {
  const { mini = false } = options;
  
  const container = document.createElement('div');
  container.className = mini ? 'momentum-bar momentum-bar-mini' : 'momentum-bar';
  container.setAttribute('aria-label', `${activeDays} active days out of 7`);
  
  // Determine color based on active days
  let color;
  if (activeDays <= 2) {
    color = '#86efac'; // light green (relaxation, beginning)
  } else if (activeDays <= 4) {
    color = '#10b981'; // green (stability)
  } else if (activeDays <= 6) {
    color = '#f59e0b'; // yellow-orange (energy, strength)
  } else {
    color = '#ef4444'; // bright red (maximum charge)
  }
  
  // Create 7 segments
  for (let i = 0; i < 7; i++) {
    const segment = document.createElement('div');
    segment.className = 'momentum-segment';
    
    if (i < activeDays) {
      segment.classList.add('momentum-segment-filled');
      segment.style.background = color;
    }
    
    container.appendChild(segment);
  }
  
  return container;
}

/**
 * Get momentum multiplier data based on active days
 */
export function getMomentumData(activeDays) {
  const momentumLevels = [
    { days: 0, multiplier: 'x1', emoji: '🧘', label: 'Расслабление' },
    { days: 1, multiplier: 'x1.5', emoji: '🌱', label: 'Росток' },
    { days: 2, multiplier: 'x2', emoji: '✨', label: 'Искра' },
    { days: 3, multiplier: 'x2.5', emoji: '💪', label: 'Сила' },
    { days: 4, multiplier: 'x3', emoji: '⚡️', label: 'Молния' },
    { days: 5, multiplier: 'x3.5', emoji: '🚀', label: 'Ракета' },
    { days: 6, multiplier: 'x4', emoji: '🔥', label: 'Огонь' },
    { days: 7, multiplier: 'x4.5', emoji: '☄️', label: 'Комета' }
  ];
  
  return momentumLevels[Math.min(activeDays, 7)];
}
