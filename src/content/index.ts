/**
 * Content script to intercept Twitter API requests and inject follower counts onto tweet cards
 * 
 * This script runs in the MAIN world (page's JavaScript context) thanks to
 * "world": "MAIN" in manifest.json. This allows us to intercept fetch/XHR calls
 * made by Twitter's JavaScript.
 */

console.log('🔧 [Twitter Extension] Setting up interceptors in MAIN world...');

// Store follower data by username (screen_name)
const followerDataMap = new Map<string, { name: string; screenName: string; followersCount: number }>();

// Store friendly post data by username
const friendlyPostMap = new Map<string, FriendlyPost>();

/**
 * Friendly post object containing only the metadata we need
 */
interface FriendlyPost {
  user: {
    name: string;
    handle: string;
    followers: number;
    following: number;
    verified: boolean;
    description: string;
  };
  tweet: {
    text: string;
    likes: number;
    retweets: number;
    replies: number;
    views: number;
    createdAt: string;
  };
  engagement: {
    engagementRate: number;
    totalEngagements: number;
  };
}

/**
 * Format follower count with commas (e.g., 790000 -> "790,000")
 */
function formatFollowerCount(count: number): string {
  return count.toLocaleString('en-US');
}

/**
 * Inject JSON popout button and modal onto a tweet card
 */
function injectJsonPopoutButton(card: Element, friendlyPost: FriendlyPost) {
  // Find the action buttons area (where like, retweet, etc. are)
  const actionButtons = card.querySelector('[role="group"]');
  if (!actionButtons) return;
  
  // Check if button already exists
  if (card.querySelector('.twitter-extension-json-button')) return;
  
  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'css-175oi2r r-18u37iz r-1h0z5md r-13awgt0';
  
  // Create button
  const button = document.createElement('button');
  button.className = 'twitter-extension-json-button css-175oi2r r-1777fci r-bt1l66 r-bztko3 r-lrvibr r-1loqt21 r-1ny4l3l';
  button.setAttribute('aria-label', 'View post metadata');
  button.setAttribute('type', 'button');
  button.style.cssText = `
    cursor: pointer;
    border: none;
    background: transparent;
    padding: 0;
  `;
  
  // Create button content
  const buttonContent = document.createElement('div');
  buttonContent.className = 'css-175oi2r r-xoduu5';
  buttonContent.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgb(83, 100, 113);
    transition: color 0.2s;
  `;
  
  // Add hover effect
  button.onmouseenter = () => {
    buttonContent.style.color = 'rgb(29, 155, 240)';
  };
  button.onmouseleave = () => {
    buttonContent.style.color = 'rgb(83, 100, 113)';
  };
  
  // Create icon (JSON brackets)
  const icon = document.createElement('div');
  icon.textContent = '{}';
  icon.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: monospace;
    font-size: 14px;
    font-weight: bold;
    line-height: 1;
  `;
  
  buttonContent.appendChild(icon);
  button.appendChild(buttonContent);
  buttonContainer.appendChild(button);
  
  // Create popout modal
  const popout = document.createElement('div');
  popout.className = 'twitter-extension-json-popout';
  popout.style.cssText = `
    display: none;
    position: absolute;
    background: white;
    border: 1px solid rgb(207, 217, 222);
    border-radius: 16px;
    box-shadow: rgba(101, 119, 134, 0.2) 0px 0px 15px, rgba(101, 119, 134, 0.15) 0px 0px 3px 1px;
    padding: 16px;
    max-width: 500px;
    max-height: 400px;
    overflow-y: auto;
    z-index: 10000;
    font-family: 'TwitterChirp', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 13px;
    line-height: 1.5;
  `;
  
  // Create close button
  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    background: transparent;
    border: none;
    font-size: 24px;
    color: rgb(83, 100, 113);
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s;
  `;
  closeButton.onmouseover = () => closeButton.style.backgroundColor = 'rgb(247, 249, 249)';
  closeButton.onmouseout = () => closeButton.style.backgroundColor = 'transparent';
  
  // Create JSON display
  const jsonDisplay = document.createElement('pre');
  jsonDisplay.style.cssText = `
    margin: 0;
    padding: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
    color: rgb(15, 20, 25);
    font-size: 12px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  `;
  jsonDisplay.textContent = JSON.stringify(friendlyPost, null, 2);
  
  popout.appendChild(closeButton);
  popout.appendChild(jsonDisplay);
  
  // Position popout relative to card
  const cardRect = card.getBoundingClientRect();
  popout.style.top = `${cardRect.bottom + 8}px`;
  popout.style.left = `${cardRect.left}px`;
  
  // Add to document body
  document.body.appendChild(popout);
  
  // Toggle popout on button click
  let isOpen = false;
  button.onclick = (e) => {
    e.stopPropagation();
    isOpen = !isOpen;
    
    if (isOpen) {
      // Update position
      const rect = card.getBoundingClientRect();
      popout.style.top = `${rect.bottom + 8}px`;
      popout.style.left = `${rect.left}px`;
      popout.style.display = 'block';
    } else {
      popout.style.display = 'none';
    }
  };
  
  // Close on close button click
  closeButton.onclick = (e) => {
    e.stopPropagation();
    isOpen = false;
    popout.style.display = 'none';
  };
  
  // Close on outside click
  document.addEventListener('click', (e) => {
    if (isOpen && !popout.contains(e.target as Node) && !button.contains(e.target as Node)) {
      isOpen = false;
      popout.style.display = 'none';
    }
  });
  
  // Insert button into action buttons area
  actionButtons.appendChild(buttonContainer);
}

/**
 * Extract username from a link element
 */
function extractUsernameFromLink(link: HTMLAnchorElement): string | null {
  const href = link.getAttribute('href');
  if (href && href.startsWith('/') && !href.startsWith('//')) {
    // Extract username from href like "/username" or "/i/user/12345"
    const match = href.match(/^\/([^\/]+)$/);
    if (match && match[1] !== 'i') {
      return match[1];
    }
  }
  
  // Also try to get from text content
  const text = link.textContent?.trim() || '';
  if (text.startsWith('@')) {
    return text.slice(1);
  }
  
  return null;
}

/**
 * Inject follower count badge onto a tweet card
 */
function injectFollowerCountToCard(card: Element) {
  // Check if we already processed this card
  if (card.hasAttribute('data-follower-badge-processed')) {
    return;
  }
  
  // Mark card as processed
  card.setAttribute('data-follower-badge-processed', 'true');
  
  // Find all User-Name containers in this card
  const userNames = card.querySelectorAll('[data-testid="User-Name"]');
  
  userNames.forEach((userNameContainer) => {
    // Check if this container already has a badge
    if (userNameContainer.querySelector('.twitter-extension-follower-badge')) {
      return;
    }
    
    // Find the username link (the one with @username text or href="/username")
    const links = userNameContainer.querySelectorAll('a[href^="/"]');
    
    let username: string | null = null;
    let anchor: HTMLAnchorElement | null = null;
    
    // Find the first valid username link
    for (const link of links) {
      const linkAnchor = link as HTMLAnchorElement;
      const extractedUsername = extractUsernameFromLink(linkAnchor);
      
      if (extractedUsername) {
        username = extractedUsername;
        anchor = linkAnchor;
        break;
      }
    }
    
    if (!username || !anchor) return;
    
    // Get follower data
    const followerData = followerDataMap.get(username);
    
    if (followerData) {
      // Create chip-like badge element
      const badge = document.createElement('span');
      badge.className = 'twitter-extension-follower-badge';
      badge.textContent = `${formatFollowerCount(followerData.followersCount)} followers`;
      badge.style.cssText = `
        display: inline-flex;
        align-items: center;
        background-color: rgb(185, 28, 28);
        color: rgb(255, 255, 255);
        font-size: 13px;
        font-weight: 500;
        padding: 3px 10px;
        border-radius: 12px;
        margin-left: 6px;
        white-space: nowrap;
      `;
      
      // Insert badge after the username link
      // Try to find the parent container that holds the username
      const parent = anchor.parentElement;
      if (parent) {
        parent.insertBefore(badge, anchor.nextSibling);
      }
    }
    
    // Add JSON popout button if we have friendly post data
    const friendlyPost = friendlyPostMap.get(username);
    if (friendlyPost && !card.querySelector('.twitter-extension-json-button')) {
      injectJsonPopoutButton(card, friendlyPost);
    }
  });
}

/**
 * Process all tweet cards on the page
 */
function processAllCards() {
  // Find all tweet cards
  const cards = document.querySelectorAll('article[data-testid="tweet"]');
  
  cards.forEach((card) => {
    injectFollowerCountToCard(card);
  });
}

/**
 * Create a friendly post object with only the metadata we need
 */
interface FriendlyPost {
  user: {
    name: string;
    handle: string;
    followers: number;
    following: number;
    verified: boolean;
    description: string;
  };
  tweet: {
    text: string;
    likes: number;
    retweets: number;
    replies: number;
    views: number;
    createdAt: string;
  };
  engagement: {
    engagementRate: number;
    totalEngagements: number;
  };
}

function createFriendlyPost(tweetResult: any, user: any): FriendlyPost | null {
  try {
    const legacy = user.legacy || {};
    const core = user.core || {};
    const tweetLegacy = tweetResult.legacy || {};
    
    const name = core?.name || legacy?.name || 'Unknown';
    const screenName = core?.screen_name || legacy?.screen_name || 'unknown';
    const followersCount = legacy?.followers_count || 0;
    const followingCount = legacy?.friends_count || 0;
    const verified = legacy?.verified || false;
    const description = legacy?.description || '';
    
    const tweetText = tweetLegacy?.full_text || tweetLegacy?.text || '';
    const likes = tweetLegacy?.favorite_count || 0;
    const retweets = tweetLegacy?.retweet_count || 0;
    const replies = tweetLegacy?.reply_count || 0;
    const views = tweetResult.views?.count || 0;
    const createdAt = tweetLegacy?.created_at || '';
    
    const totalEngagements = likes + retweets + replies;
    const engagementRate = followersCount > 0 
      ? ((totalEngagements / followersCount) * 100).toFixed(2)
      : '0.00';
    
    return {
      user: {
        name,
        handle: `@${screenName}`,
        followers: followersCount,
        following: followingCount,
        verified,
        description: description.substring(0, 100) + (description.length > 100 ? '...' : ''),
      },
      tweet: {
        text: tweetText.substring(0, 150) + (tweetText.length > 150 ? '...' : ''),
        likes,
        retweets,
        replies,
        views,
        createdAt,
      },
      engagement: {
        engagementRate: parseFloat(engagementRate),
        totalEngagements,
      },
    };
  } catch (error) {
    console.error('Error creating friendly post:', error);
    return null;
  }
}

/**
 * Extract and store follower data from JSON response
 */
function extractAndLogPostData(data: any) {
  try {
    const instructions = data?.data?.home?.home_timeline_urt?.instructions || [];
    
    console.log('📊 [Twitter Extension] Processing timeline with', instructions.length, 'instructions');
    
    let postCount = 0;
    const friendlyPosts: FriendlyPost[] = [];
    
    for (const instruction of instructions) {
      if (instruction.type === 'TimelineAddEntries' && instruction.entries) {
        for (const entry of instruction.entries) {
          const tweetResult = entry.content?.itemContent?.tweet_results?.result;
          
          if (tweetResult && tweetResult.core?.user_results?.result) {
            const user = tweetResult.core.user_results.result;
            const legacy = user.legacy;
            const core = user.core;
            
            // Extract user information
            const name = core?.name || legacy?.name || 'Unknown';
            const screenName = core?.screen_name || legacy?.screen_name || 'unknown';
            const followersCount = legacy?.followers_count;
            
            if (followersCount !== undefined && followersCount !== null && screenName) {
              // Store in map
              followerDataMap.set(screenName, {
                name,
                screenName,
                followersCount,
              });
              
              // Create friendly post object
              const friendlyPost = createFriendlyPost(tweetResult, user);
              if (friendlyPost) {
                friendlyPosts.push(friendlyPost);
                // Store by username for easy lookup
                friendlyPostMap.set(screenName, friendlyPost);
                postCount++;
                
                // Log friendly post object
                console.log(`📝 Post ${postCount}:`, friendlyPost);
              }
            }
          }
        }
      }
    }
    
    console.log(`✅ [Twitter Extension] Extracted ${postCount} posts`);
    console.log('📊 All Posts Summary:', friendlyPosts);
    
    // Process cards after extracting data
    setTimeout(() => {
      processAllCards();
    }, 100);
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
  // Find the timeline container
  const findTimeline = () => {
    // Look for the timeline div with aria-label
    const timelines = Array.from(document.querySelectorAll('div[aria-label*="Timeline"]'));
    return timelines.find((el) => {
      const label = el.getAttribute('aria-label');
      return label && label.includes('Home Timeline');
    }) as HTMLElement | undefined;
  };
  
  const timeline = findTimeline();
  
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
