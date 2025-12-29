/**
 * Injection and rendering methods for tweet card elements
 * 
 * This module handles injecting follower count badges
 * onto tweet cards in the Twitter timeline.
 */

/**
 * Friendly post object containing only the metadata we need
 */
export interface FriendlyPost {
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
 * Follower data structure
 */
export interface FollowerData {
  name: string;
  screenName: string;
  followersCount: number;
}

/**
 * Format follower count with commas (e.g., 790000 -> "790,000")
 */
function formatFollowerCount(count: number): string {
  return count.toLocaleString('en-US');
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
 * 
 * @param card - The tweet card element to inject into
 * @param followerDataMap - Map of username to follower data
 * @param newUsernames - Set of usernames that are new (not from cache)
 * @param detectedUsernames - Set of usernames that have been detected/shown
 */
export function injectFollowerCountToCard(
  card: Element,
  followerDataMap: Map<string, FollowerData>,
  newUsernames?: Set<string>,
  detectedUsernames?: Set<string>
): void {
  // Don't skip if already processed - we want to update with new data
  // But check if badge already exists to avoid duplicates
  
  // Find all User-Name containers in this card
  const userNames = card.querySelectorAll('[data-testid="User-Name"]');
  
  userNames.forEach((userNameContainer) => {
    // Remove existing badge if it exists (to update with latest data)
    const existingBadge = userNameContainer.querySelector('.twitter-extension-follower-badge');
    if (existingBadge) {
      existingBadge.remove();
    }
    
    // Find the username link (the one with @username text or href="/username")
    // In retweets, we need to find the actual tweet author, not the retweeter
    const links = userNameContainer.querySelectorAll('a[href^="/"]');
    
    let username: string | null = null;
    let anchor: HTMLAnchorElement | null = null;
    
    // Find the first valid username link
    // Skip links that are in social context (retweet indicators)
    for (const link of links) {
      const linkAnchor = link as HTMLAnchorElement;
      // Skip if this link is part of a retweet indicator
      if (linkAnchor.closest('[data-testid="socialContext"]')) {
        continue;
      }
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
      // Determine if this is new data that hasn't been detected yet
      const isNew = newUsernames?.has(username) ?? false;
      const isDetected = detectedUsernames?.has(username) ?? false;
      const isNewAndUndetected = isNew && !isDetected;
      
      // Mark as detected after showing
      if (detectedUsernames) {
        detectedUsernames.add(username);
      }
      
      // Create chip-like badge element
      const badge = document.createElement('span');
      badge.className = 'twitter-extension-follower-badge';
      badge.textContent = `${formatFollowerCount(followerData.followersCount)} followers`;
      
      // Green for new undetected data, red for cached/existing data
      const backgroundColor = isNewAndUndetected 
        ? 'rgb(34, 197, 94)' // Green
        : 'rgb(185, 28, 28)'; // Red
      
      badge.style.cssText = `
        display: inline-flex;
        align-items: center;
        background-color: ${backgroundColor};
        color: rgb(255, 255, 255);
        font-size: 13px;
        font-weight: 500;
        padding: 3px 10px;
        border-radius: 12px;
        margin-left: 6px;
        white-space: nowrap;
      `;
      
      // Find the right container to insert into
      // In retweets, the structure might be slightly different, so we need to be flexible
      let insertContainer: Element | null = null;
      
      // Strategy 1: Find the container that holds the username link and timestamp
      // This is usually a div with class containing "r-1ez5h0i" or similar
      let current: Element | null = anchor.parentElement;
      while (current && current !== userNameContainer) {
        // Check if this container has both the username link and a timestamp/time element
        const hasUsernameLink = current.contains(anchor);
        const hasTimestamp = current.querySelector('time') || current.querySelector('a[href*="/status/"]');
        
        if (hasUsernameLink && hasTimestamp) {
          insertContainer = current;
          break;
        }
        current = current.parentElement;
      }
      
      // Strategy 2: Fallback to the direct parent of the anchor
      if (!insertContainer) {
        insertContainer = anchor.parentElement;
      }
      
      // Insert the badge
      if (insertContainer) {
        // Find where to insert - after the username link or its parent
        const anchorParent = anchor.parentElement;
        
        // If anchor has a next sibling, insert after it
        if (anchor.nextSibling) {
          insertContainer.insertBefore(badge, anchor.nextSibling);
        } 
        // If anchor's parent is in the insert container and has a next sibling, insert after parent
        else if (anchorParent && anchorParent !== insertContainer && anchorParent.nextSibling) {
          insertContainer.insertBefore(badge, anchorParent.nextSibling);
        }
        // Otherwise, append to the container
        else {
          insertContainer.appendChild(badge);
        }
      }
    } else {
      // Log when we can't find matching JSON data for a card
      const cardId = card.getAttribute('aria-labelledby') || card.getAttribute('data-testid') || 'unknown';
      const tweetLink = card.querySelector('a[href*="/status/"]') as HTMLAnchorElement;
      const tweetId = tweetLink?.href?.match(/\/status\/(\d+)/)?.[1] || 'unknown';
      const tweetText = card.querySelector('[data-testid="tweetText"]')?.textContent?.substring(0, 50) || 'N/A';
      
      console.warn('⚠️ [Twitter Extension] Card cannot find matching JSON to show followers:', {
        username: `@${username}`,
        cardId: cardId,
        tweetId: tweetId,
        tweetLink: tweetLink?.href || 'N/A',
        tweetTextPreview: tweetText,
        availableUsernames: Array.from(followerDataMap.keys()).slice(0, 10), // Show first 10 available usernames
        totalUsernamesInMap: followerDataMap.size
      });
    }
  });
}

