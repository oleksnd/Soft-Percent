// popup script: sends a message to the content script in the active tab
document.getElementById('btnHighlight').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (!tab || !tab.id) {
    document.getElementById('status').textContent = 'No active tab';
    return;
  }

  chrome.tabs.sendMessage(tab.id, {action: 'highlight'}, (response) => {
    document.getElementById('status').textContent = response && response.result ? response.result : 'No response from script';
  });
});
