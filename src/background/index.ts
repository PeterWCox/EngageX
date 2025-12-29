import type { FollowerData } from '../content/inject-card-elements';

// Minimal background worker for Chrome storage access
// Content script runs in MAIN world and can't access chrome.storage directly

console.log('🔧 [Background Worker] Initialized and ready');

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log(`📨 [Background] Received message: ${message.type}`);
  
  if (message.type === 'GET_FOLLOWER_DATA') {
    // Load follower data from storage
    chrome.storage.local.get('followerData').then((result) => {
      const data = result.followerData || [];
      console.log(`📊 [Background] Total follower records in storage: ${data.length}`);
      sendResponse({ data, totalCount: data.length });
    }).catch((error) => {
      console.error('❌ [Background] Error loading follower data:', error);
      sendResponse({ data: [], totalCount: 0 });
    });
    return true; // Keep channel open for async response
  }
  
  if (message.type === 'SAVE_FOLLOWER_DATA') {
    const { newData } = message;
    console.log(`💾 [Background] Saving ${Array.isArray(newData) ? newData.length : 0} follower records`);
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
        const finalData = Array.from(existingMap.values());
        return chrome.storage.local.set({
          followerData: finalData
        }).then(() => {
          return finalData.length;
        });
      }).then((totalCount) => {
        console.log(`📊 [Background] Total follower records in storage after save: ${totalCount}`);
        sendResponse({ success: true, totalCount });
      }).catch((error) => {
        console.error('❌ [Background] Error saving follower data:', error);
        sendResponse({ success: false, totalCount: 0 });
      });
    } else {
      sendResponse({ success: false });
    }
    return true; // Keep channel open for async response
  }
});
