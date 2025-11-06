// alarms.js — schedule daily alarm and perform reset of today's checks
export async function setupAlarms() {
  try {
    // create or update alarm named 'daily-reset' to run at approx midnight local
    chrome.alarms.get('daily-reset', (a) => {
      if (!a) {
        const when = nextMidnightTimestamp();
        chrome.alarms.create('daily-reset', { when, periodInMinutes: 24 * 60 });
      } else {
      }
    });
  } catch (e) {
    // ignore
  }
}

function nextMidnightTimestamp() {
  const now = new Date();
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 5, 0, 0); // 00:05 next day
  return t.getTime();
}

export async function handleAlarm(alarm) {
  if (!alarm || alarm.name !== 'daily-reset') return;
  // clear today's gates: we store daily flags under keys per skill (e.g., "daily_<skillId>")
  // For now we iterate all keys in storage.sync and remove daily_ prefixed keys
  return new Promise((resolve) => {
    chrome.storage.sync.get(null, (items) => {
      if (chrome.runtime.lastError) return resolve();
      const toRemove = Object.keys(items).filter((k) => k && k.startsWith('daily_'));
      if (toRemove.length === 0) return resolve();
      chrome.storage.sync.remove(toRemove, () => resolve());
    });
  });
}
