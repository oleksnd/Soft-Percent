// content script example

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === 'highlight') {
    document.documentElement.style.outline = '6px solid rgba(255,0,128,0.6)';
    setTimeout(() => { document.documentElement.style.outline = ''; }, 2500);
    sendResponse({result: 'highlighted'});
  }
});
