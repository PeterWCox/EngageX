// IMMEDIATELY set up interceptors BEFORE any other code runs
const _originalFetch = window.fetch.bind(window);
const _originalXHROpen = XMLHttpRequest.prototype.open;
const _originalXHRSend = XMLHttpRequest.prototype.send;

let _onTimelineData: ((data: any) => void) | null = null;

window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
  const url = input?.toString() || '';
  const response = await _originalFetch.call(this, input, init);
  
  // Log other Timeline endpoints we might be missing
  if (url.includes('/graphql/') && url.includes('Timeline') && 
      !url.includes('HomeLatestTimeline') && 
      !url.includes('HomeTimeline') && 
      !url.includes('CommunityTweetsTimeline')) {
    console.log('🔍 Other Timeline endpoint detected (not captured):', url.match(/\/graphql\/[^/]+\/([^?]+)/)?.[1] || url);
  }
  
  if (url.includes('HomeLatestTimeline') || 
      url.includes('HomeTimeline') || 
      url.includes('CommunityTweetsTimeline')) {
    console.log('✅ Timeline intercepted (fetch):', url);
    try {
      const data = await response.clone().json();
      if (_onTimelineData) _onTimelineData(data);
    } catch (e) { console.error('Parse error:', e); }
  }
  return response;
};

XMLHttpRequest.prototype.open = function(_method: string, url: string | URL) {
  (this as any)._url = url?.toString() || '';
  return _originalXHROpen.apply(this, arguments as any);
};

XMLHttpRequest.prototype.send = function() {
  const url = (this as any)._url || '';
  if (url.includes('HomeLatestTimeline') || 
      url.includes('HomeTimeline') || 
      url.includes('CommunityTweetsTimeline')) {
    console.log('✅ Timeline intercepted (XHR):', url);
    this.addEventListener('load', function() {
      try {
        const data = JSON.parse(this.responseText);
        if (_onTimelineData) _onTimelineData(data);
      } catch (e) { console.error('Parse error:', e); }
    });
  }
  return _originalXHRSend.apply(this, arguments as any);
};

console.log('✅ Interceptors installed EARLY');

// Now import the rest
import { getTweetCards, getTweetCardsContainer, mapTimelineData, extractUsernameFromLink } from './helpers';
import { injectFollowerCountToCard, FollowerData, TweetData } from './inject-card-elements';

console.log('%c🚀 TWITTER EXTENSION LOADED 🚀', 'font-size: 20px; font-weight: bold; color: #1DA1F2; background: #000; padding: 10px; border-radius: 5px;');
console.log('%cBuild timestamp: ' + new Date().toISOString(), 'font-size: 12px; color: #666;');

const userData: FollowerData[] = [];
const tweetData: TweetData[] = [];

// Debug function to compare API data vs DOM cards
function debugMatchingIssues() {
  const cards = getTweetCards();
  
  // Extract usernames from all visible cards
  const cardUsernames: Array<{ username: string; tweetText: string }> = [];
  cards.forEach((card) => {
    const userNameContainers = card.querySelectorAll('[data-testid="User-Name"]');
    for (const container of userNameContainers) {
      const links = container.querySelectorAll('a[href^="/"]');
      for (const link of links) {
        const linkAnchor = link as HTMLAnchorElement;
        if (linkAnchor.closest('[data-testid="socialContext"]')) continue;
        
        const username = extractUsernameFromLink(linkAnchor);
        if (username) {
          const tweetText = card.querySelector('[data-testid="tweetText"]')?.textContent?.substring(0, 40) || 'N/A';
          cardUsernames.push({ username, tweetText });
          break; // Only first username per card
        }
      }
    }
  });
  
  // Get unique usernames from cards (lowercase for comparison)
  const uniqueCardUsernames = [...new Set(cardUsernames.map(c => c.username))];
  
  // Get usernames from API
  const apiUsernames = userData.map(u => u.screenName);
  const apiUsernamesLower = apiUsernames.map(u => u.toLowerCase());
  
  // Find mismatches (case-insensitive)
  const inCardNotInApi = uniqueCardUsernames.filter(u => !apiUsernamesLower.includes(u.toLowerCase()));
  const inApiNotInCard = apiUsernames.filter(u => !uniqueCardUsernames.map(c => c.toLowerCase()).includes(u.toLowerCase()));
  const matched = uniqueCardUsernames.filter(u => apiUsernamesLower.includes(u.toLowerCase()));
  
  console.log('%c📊 MATCHING DEBUG REPORT', 'font-size: 16px; font-weight: bold; color: #f59e0b; background: #000; padding: 8px;');
  console.log({
    summary: {
      cardsInDOM: cards.length,
      uniqueUsernamesInCards: uniqueCardUsernames.length,
      usernamesFromAPI: apiUsernames.length,
      matched: matched.length,
      missingFromAPI: inCardNotInApi.length,
    },
    allCardsWithUsernames: cardUsernames,
    allAPIUsernames: apiUsernames.sort(),
    matched: matched.sort(),
    inCardButNotInAPI: inCardNotInApi.sort(),
    inAPIButNotInCard: inApiNotInCard.sort(),
  });
  
  return {
    cardUsernames,
    apiUsernames,
    matched,
    inCardNotInApi,
    inApiNotInCard,
  };
}

// Expose debug function globally
(window as any).debugTwitterExtension = debugMatchingIssues;

function processAllCards() {
  const cards = getTweetCards();
  
  cards.forEach((card) => {
    injectFollowerCountToCard(card, userData, tweetData);
  });
}

function extractAndStoreTimelineData(data: any) {
  try {
    const { users, tweets } = mapTimelineData(data);
    
    // Add new users (case-insensitive check)
    let newUserCount = 0;
    for (const user of users) {
      const existingUser = userData.find(u => u.screenName.toLowerCase() === user.screenName.toLowerCase());
      if (!existingUser) {
        userData.push(user);
        newUserCount++;
      } else {
        // Update existing user data if we have newer/more complete info
        Object.assign(existingUser, user);
      }
    }
    
    // Add new tweets
    let newTweetCount = 0;
    for (const tweet of tweets) {
      const existingTweet = tweetData.find(t => t.tweetId === tweet.tweetId);
      if (!existingTweet) {
        tweetData.push(tweet);
        newTweetCount++;
      } else {
        // Update existing tweet data (engagement scores may change)
        Object.assign(existingTweet, tweet);
      }
    }
    
    if (newUserCount > 0 || newTweetCount > 0) {
      console.log(`✅ [Twitter Extension] Added ${newUserCount} users, ${newTweetCount} tweets (Total: ${userData.length} users, ${tweetData.length} tweets)`);
      
      // Log high-opportunity tweets
      const hotTweets = tweets
        .filter(t => t.engagementOpportunityScore > 30)
        .sort((a, b) => b.engagementOpportunityScore - a.engagementOpportunityScore)
        .slice(0, 5);
      
      if (hotTweets.length > 0) {
        console.log('🔥 High engagement opportunities:', hotTweets.map(t => ({
          user: `@${t.screenName}`,
          score: Math.round(t.engagementOpportunityScore),
          replies: t.replyCount,
          views: t.viewCount?.toLocaleString() || 'N/A',
          age: `${Math.round(t.ageMinutes / 60)}h`,
        })));
      }
    }
    
    // Always re-process all cards when new data arrives (in case DOM was replaced)
    setTimeout(() => {
      processAllCards();
    }, 100);
  } catch (error) {
    console.error('❌ [Twitter Extension] Error extracting timeline data:', error);
  }
}

// Set the callback for intercepted data
_onTimelineData = extractAndStoreTimelineData;

// Set up MutationObserver to watch the timeline for new cards
let _observerSetUp = false;
let _currentObserver: MutationObserver | null = null;

function setupTimelineObserver() {
  // Disconnect previous observer if it exists
  if (_currentObserver) {
    _currentObserver.disconnect();
    _currentObserver = null;
  }
  
  const timeline = getTweetCardsContainer();
  
  if (timeline) {
    if (!_observerSetUp) {
      _observerSetUp = true;
      console.log('✅ [Twitter Extension] Found timeline container, setting up observer');
    }
    
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
    
    _currentObserver = observer;
    
    // Process existing cards
    processAllCards();
  } else {
    // Timeline not found yet, try again after a delay
    if (!_observerSetUp) {
      console.log('⏳ [Twitter Extension] Timeline not found yet, retrying...');
    }
    setTimeout(setupTimelineObserver, 1000);
  }
}

// Watch for tab changes and re-process cards
function setupTabChangeWatcher() {
  // Watch for clicks on tab buttons
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    // Check if clicked element is a tab or inside a tab
    if (target.closest('[role="tab"]') || target.getAttribute('role') === 'tab') {
      // Tab change detected, re-process after a short delay
      setTimeout(() => {
        setupTimelineObserver(); // Re-setup observer in case container changed
        setTimeout(() => {
          processAllCards(); // Process all cards with existing state
        }, 500);
      }, 100);
    }
  }, true); // Use capture phase to catch early
  
  // Also watch for URL changes (SPA navigation)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(() => {
        setupTimelineObserver();
        setTimeout(() => {
          processAllCards();
        }, 500);
      }, 100);
    }
  }).observe(document, { subtree: true, childList: true });
  
  // Periodic re-processing to catch any missed updates (every 2 seconds)
  setInterval(() => {
    if (getTweetCards().length > 0) {
      processAllCards();
    }
  }, 2000);
}

// Initialize: Set up observers
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupTimelineObserver();
    setupTabChangeWatcher();
  });
} else {
  setupTimelineObserver();
  setupTabChangeWatcher();
}

// Also set up observer after a delay in case timeline loads later
setTimeout(setupTimelineObserver, 2000);
setTimeout(setupTabChangeWatcher, 2000);
