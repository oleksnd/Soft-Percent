// background service worker (Manifest V3)
chrome.runtime.onInstalled.addListener(() => {
  // installed
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'PING') {
    sendResponse({type: 'PONG'});
  }
});
