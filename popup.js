// popup script: отправляет сообщение content script на активной вкладке
document.getElementById('btnHighlight').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (!tab || !tab.id) {
    document.getElementById('status').textContent = 'Нет активной вкладки';
    return;
  }

  chrome.tabs.sendMessage(tab.id, {action: 'highlight'}, (response) => {
    document.getElementById('status').textContent = response && response.result ? response.result : 'Нет ответа от скрипта';
  });
});
