/**
 * Storage bridge - runs in isolated world to access chrome.runtime
 * Communicates with MAIN world script via window.postMessage
 */

import type { FollowerData } from './inject-card-elements';

// Listen for messages from MAIN world
window.addEventListener('message', async (event) => {
  // Only accept messages from our extension
  if (event.source !== window) return;
  
  const { type, requestId, data } = event.data;
  
  // Debug logging
  if (type?.startsWith('TWITTER_EXT_')) {
    console.log(`🌉 [Storage Bridge] Received message: ${type}`, { requestId });
  }
  
  if (type === 'TWITTER_EXT_GET_FOLLOWER_DATA') {
    try {
      const response = await new Promise<{ data: FollowerData[]; totalCount?: number }>((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: 'GET_FOLLOWER_DATA' },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response || { data: [] });
            }
          }
        );
      });
      
      // Send response back to MAIN world
      window.postMessage({
        type: 'TWITTER_EXT_RESPONSE',
        requestId,
        data: response.data || [],
        totalCount: response.totalCount || (response.data || []).length
      }, '*');
    } catch (error) {
      console.error('❌ [Storage Bridge] Error loading data:', error);
      window.postMessage({
        type: 'TWITTER_EXT_RESPONSE',
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, '*');
    }
  }
  
  if (type === 'TWITTER_EXT_SAVE_FOLLOWER_DATA') {
    try {
      const response = await new Promise<{ success: boolean; totalCount?: number }>((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: 'SAVE_FOLLOWER_DATA', newData: data },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response || { success: false });
            }
          }
        );
      });
      
      // Send response back to MAIN world
      window.postMessage({
        type: 'TWITTER_EXT_RESPONSE',
        requestId,
        success: response.success,
        totalCount: response.totalCount || 0
      }, '*');
    } catch (error) {
      console.error('❌ [Storage Bridge] Error saving data:', error);
      window.postMessage({
        type: 'TWITTER_EXT_RESPONSE',
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, '*');
    }
  }
});

console.log('🌉 [Storage Bridge] Ready - listening for storage requests from MAIN world');

