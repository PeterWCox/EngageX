import type { UserFollowerData } from '../types/twitter-api';

/**
 * Content script to display follower counts next to usernames on Twitter
 */

// Store follower data by screen name and user ID
const followerDataMap = new Map<string, UserFollowerData>();
const restIdToScreenName = new Map<string, string>();

/**
 * Format follower count (e.g., 51635 -> "51.6K")
 */
function formatFollowerCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

/**
 * Find username elements and add follower counts
 */
function updateFollowerCounts() {
  // Find all user links/mentions on the page
  // Try to find username elements by data-testid or aria-label
  const userElements = document.querySelectorAll('[data-testid="User-Name"] a, [href*="/i/user/"]');

  userElements.forEach((element) => {
    const link = element as HTMLAnchorElement;
    const href = link.getAttribute('href');
    
    if (!href) return;

    // Extract screen name from href (e.g., /i/user/12345 or @username)
    let screenName = '';
    let restId = '';

    // Match pattern like /i/user/12345
    const userIdMatch = href.match(/\/i\/user\/(\d+)/);
    if (userIdMatch) {
      restId = userIdMatch[1];
      screenName = restIdToScreenName.get(restId) || '';
    } else {
      // Try to get from text content or data attributes
      const text = link.textContent?.trim() || '';
      if (text.startsWith('@')) {
        screenName = text.slice(1);
      }
    }

    // Check if we have follower data for this user
    const followerData = screenName ? followerDataMap.get(screenName) : undefined;
    const followerDataById = restId ? followerDataMap.get(restId) : undefined;
    const data = followerData || followerDataById;

    if (data && !link.querySelector('.follower-count-badge')) {
      // Create follower count badge
      const badge = document.createElement('span');
      badge.className = 'follower-count-badge';
      badge.textContent = `(${formatFollowerCount(data.followersCount)})`;
      badge.style.cssText = `
        color: rgb(113, 118, 123);
        font-size: 13px;
        margin-left: 4px;
        font-weight: 400;
      `;

      // Insert after the link
      link.parentElement?.insertBefore(badge, link.nextSibling);
    }
  });

  // Also try to find usernames in tweet text
  const tweetTexts = document.querySelectorAll('[data-testid="tweetText"]');
  tweetTexts.forEach((tweet) => {
    const mentions = tweet.querySelectorAll('a[href^="/"]');
    mentions.forEach((mention) => {
      const link = mention as HTMLAnchorElement;
      const text = link.textContent?.trim() || '';
      if (text.startsWith('@')) {
        const screenName = text.slice(1);
        const data = followerDataMap.get(screenName);
        
        if (data && !link.querySelector('.follower-count-badge')) {
          const badge = document.createElement('span');
          badge.className = 'follower-count-badge';
          badge.textContent = `(${formatFollowerCount(data.followersCount)})`;
          badge.style.cssText = `
            color: rgb(113, 118, 123);
            font-size: 13px;
            margin-left: 4px;
            font-weight: 400;
          `;
          link.parentElement?.insertBefore(badge, link.nextSibling);
        }
      }
    });
  });
}

/**
 * Store follower data and update display
 */
function handleFollowerData(data: UserFollowerData[]) {
  data.forEach((item) => {
    followerDataMap.set(item.screenName, item);
    followerDataMap.set(item.restId, item);
    restIdToScreenName.set(item.restId, item.screenName);
    
    // Log to console as requested
    console.log(`@${item.screenName} (${item.name}): ${item.followersCount.toLocaleString()} followers`);
  });

  // Update the page
  updateFollowerCounts();
}

/**
 * Intercept XMLHttpRequest to Twitter API
 * Set up IMMEDIATELY before anything else - at the very top of the script
 */
console.log('🔧 [Twitter Extension] Setting up XHR interceptor...');

// Intercept open method
const originalXHROpen = XMLHttpRequest.prototype.open;
// Intercept send method
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null): void {
  const urlString = url.toString();
  
  // Store URL on the instance for later use in send
  (this as any)._twitterExtensionMethod = method;
  (this as any)._twitterExtensionUrl = urlString;
  
  // Only intercept HomeLatestTimeline requests
  if (urlString.includes('HomeLatestTimeline')) {
    console.log('✅ [Twitter Extension] HomeLatestTimeline request (XHR):', urlString);
    
    // Override onreadystatechange to intercept response
    const originalOnReadyStateChange = this.onreadystatechange;
    
    this.onreadystatechange = function() {
      if (this.readyState === 4 && this.status === 200) {
        try {
          const data = JSON.parse(this.responseText);
          
          // Log the full JSON response
          console.log('📦 [Twitter Extension] HomeLatestTimeline response (XHR):', JSON.stringify(data, null, 2));
          
          // Process the response
          const instructions = data?.data?.home?.home_timeline_urt?.instructions || [];
          const followerData: UserFollowerData[] = [];

          for (const instruction of instructions) {
            if (instruction.type === 'TimelineAddEntries' && instruction.entries) {
              for (const entry of instruction.entries) {
                const tweetResult = entry.content?.itemContent?.tweet_results?.result;
                
                if (tweetResult && tweetResult.core?.user_results?.result) {
                  const user = tweetResult.core.user_results.result;
                  const legacy = user.legacy;
                  
                  if (legacy?.followers_count !== undefined) {
                    const screenName = legacy.screen_name || user.core?.screen_name || '';
                    const restId = user.rest_id;
                    const name = user.core?.name || '';
                    
                    if (screenName && restId) {
                      const userData = {
                        screenName,
                        restId,
                        followersCount: legacy.followers_count,
                        name,
                      };
                      followerData.push(userData);
                    }
                  }
                }
              }
            }
          }

          if (followerData.length > 0) {
            handleFollowerData(followerData);
          }
        } catch (error) {
          console.error('❌ [Twitter Extension] Error parsing XHR response:', error);
        }
      }
      
      if (originalOnReadyStateChange) {
        originalOnReadyStateChange.apply(this, arguments as any);
      }
    };
  }
  
  (originalXHROpen as any).apply(this, arguments);
};

// Intercept send method (no logging needed, just pass through)
XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null): void {
  (originalXHRSend as any).apply(this, arguments);
};

console.log('✅ [Twitter Extension] XHR interceptor setup complete');

/**
 * Intercept fetch requests to Twitter API
 * Set up IMMEDIATELY before anything else
 */
console.log('🔧 [Twitter Extension] Setting up fetch interceptor...');
const originalFetch = window.fetch;
console.log('✅ [Twitter Extension] Fetch interceptor setup complete');
window.fetch = async function(...args) {
  const url = args[0]?.toString() || '';
  const method = args[1]?.method || 'GET';
  
  // Log ALL fetch requests for debugging - SIMPLE AND IMMEDIATE
  console.log('🌐 FETCH:', method, url);
  
  // Log request body for POST requests before sending
  if (method === 'POST') {
    try {
      const body = args[1]?.body;
      let bodyPreview = 'N/A';
      if (body) {
        if (typeof body === 'string') {
          bodyPreview = body.substring(0, 300);
        } else if (body instanceof FormData) {
          bodyPreview = '[FormData]';
        } else if (body instanceof URLSearchParams) {
          bodyPreview = body.toString().substring(0, 300);
        } else {
          bodyPreview = '[ReadableStream/other]';
        }
      }
      let contentType = 'unknown';
      try {
        const headers = args[1]?.headers;
        if (headers instanceof Headers) {
          contentType = headers.get('Content-Type') || 'unknown';
        } else if (Array.isArray(headers)) {
          const header = headers.find(([key]) => key.toLowerCase() === 'content-type');
          contentType = header ? header[1] : 'unknown';
        } else if (headers && typeof headers === 'object') {
          contentType = (headers as Record<string, string>)['Content-Type'] || (headers as Record<string, string>)['content-type'] || 'unknown';
        }
      } catch (e) {
        // Ignore
      }
      
      console.log('📤 [Twitter Extension] POST request body:', {
        url,
        bodyPreview,
        contentType,
      });
    } catch (e) {
      console.log('📤 [Twitter Extension] Could not read POST body:', e);
    }
  }
  
  const response = await originalFetch.apply(this, args);
  
  // Log all Twitter API requests for debugging
  
  // Log all requests to Twitter's API
  if (url.includes('x.com/i/api/') || url.includes('twitter.com/i/api/')) {
    console.log('🔍 [Twitter Extension] Intercepted API request:', {
      url,
      method,
      timestamp: new Date().toISOString(),
    });
    
    // Log GraphQL requests specifically
    if (url.includes('/graphql/')) {
      const graphqlMatch = url.match(/\/graphql\/([^/?]+)/);
      const operationName = graphqlMatch ? graphqlMatch[1] : 'unknown';
      console.log('📊 [Twitter Extension] GraphQL operation:', {
        operation: operationName,
        fullUrl: url,
      });
    }
  }
  
  // Check if this is a Twitter GraphQL API request containing HomeLatestTimeline
  if (url.includes('HomeLatestTimeline')) {
    console.log('✅ [Twitter Extension] Matched HomeLatestTimeline request!');
    // Clone the response so we can read it without consuming it
    const clonedResponse = response.clone();
    
    try {
      const data = await clonedResponse.json();
      
      console.log('📦 [Twitter Extension] Parsing HomeLatestTimeline response...');
      console.log('📋 [Twitter Extension] Response structure:', {
        hasData: !!data?.data,
        hasHome: !!data?.data?.home,
        hasTimeline: !!data?.data?.home?.home_timeline_urt,
        instructionsCount: data?.data?.home?.home_timeline_urt?.instructions?.length || 0,
      });
      
      // Extract follower data
      const instructions = data?.data?.home?.home_timeline_urt?.instructions || [];
      const followerData: UserFollowerData[] = [];
      
      console.log(`🔍 [Twitter Extension] Processing ${instructions.length} timeline instructions...`);

      for (const instruction of instructions) {
        if (instruction.type === 'TimelineAddEntries' && instruction.entries) {
          console.log(`📝 [Twitter Extension] Found ${instruction.entries.length} entries in TimelineAddEntries`);
          
          for (const entry of instruction.entries) {
            const tweetResult = entry.content?.itemContent?.tweet_results?.result;
            
            if (tweetResult && tweetResult.core?.user_results?.result) {
              const user = tweetResult.core.user_results.result;
              const legacy = user.legacy;
              
              if (legacy?.followers_count !== undefined) {
                const screenName = legacy.screen_name || user.core?.screen_name || '';
                const restId = user.rest_id;
                const name = user.core?.name || '';
                
                if (screenName && restId) {
                  const userData = {
                    screenName,
                    restId,
                    followersCount: legacy.followers_count,
                    name,
                  };
                  followerData.push(userData);
                  console.log(`👤 [Twitter Extension] Extracted user: @${screenName} (${name}) - ${legacy.followers_count} followers`);
                } else {
                  console.warn('⚠️ [Twitter Extension] User data missing screenName or restId:', { screenName, restId });
                }
              } else {
                console.debug('🔍 [Twitter Extension] User has no followers_count in legacy:', {
                  hasLegacy: !!legacy,
                  restId: user.rest_id,
                });
              }
            } else {
              console.debug('🔍 [Twitter Extension] Entry has no tweet_results or user_results:', {
                hasTweetResult: !!tweetResult,
                hasUserResults: !!tweetResult?.core?.user_results?.result,
                entryId: entry.entryId,
              });
            }
          }
        } else {
          console.debug(`🔍 [Twitter Extension] Instruction type: ${instruction.type} (skipping)`);
        }
      }

      if (followerData.length > 0) {
        console.log(`✅ [Twitter Extension] Successfully extracted ${followerData.length} user(s) with follower data`);
        handleFollowerData(followerData);
      } else {
        console.warn('⚠️ [Twitter Extension] No follower data extracted from response');
      }
    } catch (error) {
      console.error('❌ [Twitter Extension] Error parsing Twitter API response (fetch):', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        responseStatus: response.status,
        responseStatusText: response.statusText,
      });
      
      // Try to get response text for debugging
      try {
        const text = await response.clone().text();
        console.error('Response text preview:', text.substring(0, 500));
      } catch (e) {
        console.error('Could not read response text');
      }
    }
  }
  
  return response;
};

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'FOLLOWER_DATA') {
    handleFollowerData(message.data);
  }
});

// Update follower counts when page loads and on scroll
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateFollowerCounts);
} else {
  updateFollowerCounts();
}

// Use MutationObserver to update when new content is loaded
// Wait for body to be available since we run at document_start
function setupMutationObserver() {
  if (document.body) {
    const observer = new MutationObserver(() => {
      updateFollowerCounts();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  } else {
    // If body isn't ready yet, wait for it
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupMutationObserver);
    } else {
      // Fallback: try again after a short delay
      setTimeout(setupMutationObserver, 100);
    }
  }
}

setupMutationObserver();

// Also update on scroll (Twitter loads content dynamically)
let scrollTimeout: number | null = null;
window.addEventListener('scroll', () => {
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
  scrollTimeout = window.setTimeout(updateFollowerCounts, 500);
});

console.log('🚀 [Twitter Extension] Content script loaded and ready to intercept requests');
console.log('🔍 [Twitter Extension] Looking for URLs containing: HomeLatestTimeline');
console.log('📍 [Twitter Extension] Current URL:', window.location.href);
console.log('🔧 [Twitter Extension] Setting up fetch and XHR interceptors...');
console.log('📢 [Twitter Extension] ALL network requests will be logged with 🌐 emoji');

// Test that interceptors are working
setTimeout(() => {
  console.log('🧪 [Twitter Extension] Testing interceptors...');
  console.log('🧪 [Twitter Extension] Fetch interceptor:', typeof window.fetch);
  console.log('🧪 [Twitter Extension] XHR interceptor:', typeof XMLHttpRequest.prototype.open);
  console.log('🧪 [Twitter Extension] Original fetch preserved:', originalFetch !== window.fetch);
  console.log('🧪 [Twitter Extension] Original XHR open preserved:', originalXHROpen !== XMLHttpRequest.prototype.open);
  
  // Test the interceptors by making a test request
  console.log('🧪 [Twitter Extension] Making test fetch request...');
  fetch('https://httpbin.org/get?test=twitter-extension')
    .then(() => console.log('✅ [Twitter Extension] Test fetch completed - interceptor should have logged it'))
    .catch(() => console.log('⚠️ [Twitter Extension] Test fetch failed'));
  
  console.log('🧪 [Twitter Extension] Making test XHR request...');
  const testXHR = new XMLHttpRequest();
  testXHR.open('GET', 'https://httpbin.org/get?test=twitter-extension-xhr');
  testXHR.send();
  console.log('✅ [Twitter Extension] Test XHR sent - interceptor should have logged it');
}, 1000);

