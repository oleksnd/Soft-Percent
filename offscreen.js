// Offscreen document script for audio playback
console.log('🎵 Offscreen document loaded');

// Listen for sound playback requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📩 Offscreen received message:', message);
  
  if (message.type === 'PLAY_SOUND' && message.soundUrl) {
    console.log('🔊 Attempting to play sound:', message.soundUrl);
    
    const audio = new Audio(message.soundUrl);
    let responseSent = false;
    
    const safeRespond = (response) => {
      if (!responseSent) {
        responseSent = true;
        try {
          sendResponse(response);
        } catch (err) {
          console.warn('Failed to send response (channel may be closed):', err);
        }
      }
    };
    
    audio.addEventListener('canplaythrough', () => {
      console.log('✅ Audio loaded, playing...');
    });
    
    audio.addEventListener('error', (e) => {
      console.error('❌ Audio error:', e, audio.error);
      safeRespond({ success: false, error: audio.error?.message || 'Unknown error' });
    });
    
    audio.play()
      .then(() => {
        console.log('✅ Audio playback started');
        safeRespond({ success: true });
      })
      .catch(err => {
        console.error('❌ Audio playback failed:', err);
        safeRespond({ success: false, error: err.message });
      });
    
    // Immediately respond with pending status to keep channel alive
    return true;
  }
  
  // For unknown message types, respond immediately
  sendResponse({ success: false, error: 'Unknown message type' });
  return false;
});
