// storage/sync.js — small wrapper with quota-aware helpers
export async function getSync(keys) {
  return new Promise((resolve) => chrome.storage.sync.get(keys, (res) => resolve(res)));
}

export async function setSync(obj) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(obj, () => {
      const err = chrome.runtime.lastError;
      if (err) return reject(err);
      resolve();
    });
  });
}

export function estimateSize(obj) {
  try {
    return new Blob([JSON.stringify(obj)]).size;
  } catch (e) {
    return JSON.stringify(obj).length;
  }
}

export async function safeSet(key, value) {
  // simple guard: estimate and throw if > 7000 bytes per item
  const size = estimateSize(value);
  if (size > 7000) throw new Error('item size exceeds safe sync quota');
  const obj = {};
  obj[key] = value;
  return setSync(obj);
}
