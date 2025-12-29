import type { UserFollowerData } from '../types/twitter-api';

/**
 * Background service worker for Twitter Follower Count Extension
 * 
 * Uses webRequest API to intercept ALL network requests at the browser level.
 * This catches requests from all contexts (main page, iframes, web workers, etc.)
 */

// Store follower data by user ID for cross-tab sharing
const followerDataCache = new Map<string, UserFollowerData>();

// Intercept ALL network requests using webRequest API
console.log('🔧 [Twitter Extension Background] Setting up webRequest interceptor...');

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Only log HomeLatestTimeline requests
    if (details.url.includes('HomeLatestTimeline')) {
      console.log('✅ [Background] HomeLatestTimeline request:', {
        method: details.method,
        url: details.url,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Return nothing to allow the request to proceed
    return {};
  },
  {
    urls: ['<all_urls>'],
  },
  ['requestBody']
);

// Intercept response headers for HomeLatestTimeline
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.url.includes('HomeLatestTimeline')) {
      console.log('📥 [Background] HomeLatestTimeline response:', {
        url: details.url,
        statusCode: details.statusCode,
        statusLine: details.statusLine,
      });
    }
  },
  {
    urls: ['<all_urls>'],
  },
  ['responseHeaders']
);

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_FOLLOWER_DATA') {
    const { restId, screenName } = message;
    const data = restId ? followerDataCache.get(restId) : 
                 screenName ? followerDataCache.get(screenName) : undefined;
    sendResponse({ data });
    return true; // Keep channel open for async response
  }
  
  if (message.type === 'STORE_FOLLOWER_DATA') {
    const { data } = message;
    if (Array.isArray(data)) {
      data.forEach((item: UserFollowerData) => {
        followerDataCache.set(item.restId, item);
        followerDataCache.set(item.screenName, item);
      });
      sendResponse({ success: true });
    }
    return true;
  }
});

console.log('✅ [Twitter Extension Background] webRequest interceptor setup complete');
console.log('🚀 [Twitter Extension Background] Background worker loaded and ready');
