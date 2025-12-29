/**
 * Content script to intercept Twitter API requests and inject follower counts onto tweet cards
 * 
 * This script runs in the MAIN world (page's JavaScript context) thanks to
 * "world": "MAIN" in manifest.json. This allows us to intercept fetch/XHR calls
 * made by Twitter's JavaScript.
 */

import { getCardsBySelector } from './get-cards-by-selector';
import { getCardStack } from './get-card-stack';
import { injectFollowerCountToCard, FriendlyPost, FollowerData } from './inject-card-elements';
import { mapTimelineData } from './map-timeline-data';

// Distinct startup log to verify fresh build
console.log('%c🚀 TWITTER EXTENSION LOADED 🚀', 'font-size: 20px; font-weight: bold; color: #1DA1F2; background: #000; padding: 10px; border-radius: 5px;');
console.log('%cBuild timestamp: ' + new Date().toISOString(), 'font-size: 12px; color: #666;');
console.log('🔧 [Twitter Extension] Setting up interceptors in MAIN world...');

// Store follower data by username (screen_name)
const followerDataMap = new Map<string, FollowerData>();

// Store friendly post data by username
const friendlyPostMap = new Map<string, FriendlyPost>();

// Track total posts processed across all requests
let totalPostsProcessed = 0;


/**
 * Process all tweet cards on the page
 */
function processAllCards() {
  // Find all tweet cards
  const cards = getCardsBySelector();
  
  cards.forEach((card) => {
    injectFollowerCountToCard(card, followerDataMap, friendlyPostMap);
  });
}

/**
 * Extract and store follower data from JSON response
 * Accumulates data from multiple requests as user scrolls
 */
function extractAndLogPostData(data: any) {
  try {
    // Map the timeline data using the mapper
    const mappedData = mapTimelineData(data);
    
    // Merge the mapped data into our existing maps
    mappedData.followerData.forEach((value, key) => {
      followerDataMap.set(key, value);
    });
    
    mappedData.friendlyPosts.forEach((value, key) => {
      const wasNew = !friendlyPostMap.has(key);
      friendlyPostMap.set(key, value);
      
      if (wasNew) {
        totalPostsProcessed++;
        console.log(`📝 Post ${totalPostsProcessed} (@${key}):`, value);
      }
    });
    
    if (mappedData.newPostsCount > 0) {
      console.log(`✅ [Twitter Extension] Added ${mappedData.newPostsCount} new posts (Total: ${totalPostsProcessed})`);
      
      // Process all cards (including new ones) after extracting data
      setTimeout(() => {
        processAllCards();
      }, 100);
    } else {
      console.log(`ℹ️ [Twitter Extension] No new posts in this batch (Total: ${totalPostsProcessed})`);
    }
  } catch (error) {
    console.error('❌ [Twitter Extension] Error extracting post data:', error);
  }
}

// Intercept fetch
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const url = args[0]?.toString() || '';
  const response = await originalFetch.apply(this, args);
  
  // Only intercept HomeLatestTimeline requests
  if (url.includes('HomeLatestTimeline')) {
    console.log('✅ [Twitter Extension] HomeLatestTimeline request intercepted (fetch)');
    
    try {
      const clonedResponse = response.clone();
      const data = await clonedResponse.json();
      
      // Log the full JSON response
      console.log('📦 [Twitter Extension] HomeLatestTimeline JSON response:', data);
      
      // Extract and store follower data
      extractAndLogPostData(data);
    } catch (error) {
      console.error('❌ [Twitter Extension] Error parsing fetch response:', error);
    }
  }
  
  return response;
};

// Intercept XMLHttpRequest
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(_method: string, url: string | URL, _async?: boolean, _username?: string | null, _password?: string | null) {
  (this as any)._twitterExtensionUrl = url?.toString() || '';
  return (originalXHROpen as any).apply(this, arguments);
};

XMLHttpRequest.prototype.send = function(_body?: Document | XMLHttpRequestBodyInit | null) {
  const url = (this as any)._twitterExtensionUrl || '';
  
  if (url.includes('HomeLatestTimeline')) {
    console.log('✅ [Twitter Extension] HomeLatestTimeline request intercepted (XHR)');
    
    this.addEventListener('load', function() {
      try {
        if (this.responseType === '' || this.responseType === 'text') {
          const data = JSON.parse(this.responseText);
          
          // Log the full JSON response
          console.log('📦 [Twitter Extension] HomeLatestTimeline JSON response:', data);
          
          // Extract and store follower data
          extractAndLogPostData(data);
        }
      } catch (error) {
        console.error('❌ [Twitter Extension] Error parsing XHR response:', error);
      }
    });
  }
  
  return (originalXHRSend as any).apply(this, arguments);
};

// Set up MutationObserver to watch the timeline for new cards
function setupTimelineObserver() {
  const timeline = getCardStack();
  
  if (timeline) {
    console.log('✅ [Twitter Extension] Found timeline container, setting up observer');
    
    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          // Check if any added nodes are tweet cards
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.querySelector?.('article[data-testid="tweet"]') || 
                  element.matches?.('article[data-testid="tweet"]')) {
                shouldProcess = true;
              }
            }
          });
        }
      });
      
      if (shouldProcess) {
        // Debounce processing
        setTimeout(() => {
          processAllCards();
        }, 200);
      }
    });
    
    observer.observe(timeline, {
      childList: true,
      subtree: true,
    });
    
    // Process existing cards
    processAllCards();
  } else {
    // Timeline not found yet, try again after a delay
    console.log('⏳ [Twitter Extension] Timeline not found yet, retrying...');
    setTimeout(setupTimelineObserver, 1000);
  }
}

// Start observing when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupTimelineObserver);
} else {
  setupTimelineObserver();
}

// Also set up observer after a delay in case timeline loads later
setTimeout(setupTimelineObserver, 2000);

console.log('✅ [Twitter Extension] Interceptors ready - watching for HomeLatestTimeline requests');
