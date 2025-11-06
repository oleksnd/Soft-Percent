// storage/local.js — ephemeral caches
export async function getLocal(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, (res) => resolve(res)));
}

export async function setLocal(obj) {
  return new Promise((resolve, reject) => chrome.storage.local.set(obj, () => {
    const err = chrome.runtime.lastError;
    if (err) return reject(err);
    resolve();
  }));
}

export async function removeLocal(keys) {
  return new Promise((resolve) => chrome.storage.local.remove(keys, () => resolve()));
}
