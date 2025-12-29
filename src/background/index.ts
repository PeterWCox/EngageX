import type { FollowerData } from '../content/inject-card-elements';

// Minimal background worker for Chrome storage access
// Content script runs in MAIN world and can't access chrome.storage directly

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_FOLLOWER_DATA') {
    // Load follower data from storage
    chrome.storage.local.get('followerData').then((result) => {
      sendResponse({ data: result.followerData || [] });
    }).catch((error) => {
      console.error('❌ [Background] Error loading follower data:', error);
      sendResponse({ data: [] });
    });
    return true; // Keep channel open for async response
  }
  
  if (message.type === 'SAVE_FOLLOWER_DATA') {
    const { newData } = message;
    if (Array.isArray(newData)) {
      // Load existing data, merge with new, and save
      chrome.storage.local.get('followerData').then((result) => {
        const existingData = result.followerData || [];
        const existingMap = new Map<string, FollowerData>();
        
        // Create map of existing data
        existingData.forEach((item: FollowerData) => {
          existingMap.set(item.screenName, item);
        });
        
        // Merge new data (new data overwrites old)
        newData.forEach((item: FollowerData) => {
          existingMap.set(item.screenName, item);
        });
        
        // Save back to storage
        return chrome.storage.local.set({
          followerData: Array.from(existingMap.values())
        });
      }).then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        console.error('❌ [Background] Error saving follower data:', error);
        sendResponse({ success: false });
      });
    } else {
      sendResponse({ success: false });
    }
    return true; // Keep channel open for async response
  }
});
