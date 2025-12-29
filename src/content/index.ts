// IMMEDIATELY set up interceptors BEFORE any other code runs
const _originalFetch = window.fetch.bind(window);
const _originalXHROpen = XMLHttpRequest.prototype.open;
const _originalXHRSend = XMLHttpRequest.prototype.send;

let _onTimelineData: ((data: any) => void) | null = null;

window.fetch = async function(...args: any[]) {
  const url = args[0]?.toString() || '';
  console.log('🌐 [Fetch]', url);
  const response = await _originalFetch.apply(this, args);
  if (url.includes('HomeLatestTimeline') || url.includes('HomeTimeline')) {
    console.log('✅ Timeline (fetch):', url);
    try {
      const data = await response.clone().json();
      if (_onTimelineData) _onTimelineData(data);
    } catch (e) { console.error('Parse error:', e); }
  }
  return response;
};

XMLHttpRequest.prototype.open = function(method: string, url: string | URL) {
  (this as any)._url = url?.toString() || '';
  console.log('🌐 [XHR]', (this as any)._url);
  return _originalXHROpen.apply(this, arguments as any);
};

XMLHttpRequest.prototype.send = function() {
  const url = (this as any)._url || '';
  if (url.includes('HomeLatestTimeline') || url.includes('HomeTimeline')) {
    console.log('✅ Timeline (XHR):', url);
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
import { getTweetCards, getTweetCardsContainer } from './helpers';
import { injectFollowerCountToCard, FollowerData } from './inject-card-elements';
import { mapTimelineData } from './map-timeline-data';

console.log('%c🚀 TWITTER EXTENSION LOADED 🚀', 'font-size: 20px; font-weight: bold; color: #1DA1F2; background: #000; padding: 10px; border-radius: 5px;');
console.log('%cBuild timestamp: ' + new Date().toISOString(), 'font-size: 12px; color: #666;');

const followerData: FollowerData[] = [];

function processAllCards() {
  const cards = getTweetCards();
  
  cards.forEach((card) => {
    injectFollowerCountToCard(card, followerData);
  });
}

function extractAndStoreFollowerData(data: any) {
  try {
    const newFollowerData = mapTimelineData(data);
    
    let newCount = 0;
    for (const item of newFollowerData) {
      if (!followerData.find(f => f.screenName === item.screenName)) {
        followerData.push(item);
        newCount++;
      }
    }
    
    if (newCount > 0) {
      console.log(`✅ [Twitter Extension] Added ${newCount} new follower data entries (Total: ${followerData.length})`);
      
      setTimeout(() => {
        processAllCards();
      }, 100);
    }
  } catch (error) {
    console.error('❌ [Twitter Extension] Error extracting follower data:', error);
  }
}

// Set the callback for intercepted data
_onTimelineData = extractAndStoreFollowerData;

// Set up MutationObserver to watch the timeline for new cards
function setupTimelineObserver() {
  const timeline = getTweetCardsContainer();
  
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

// Initialize: Set up observers
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupTimelineObserver);
} else {
  setupTimelineObserver();
}

// Also set up observer after a delay in case timeline loads later
setTimeout(setupTimelineObserver, 2000);
