import { formatFollowerCount, extractUsernameFromLink, FOLLOWER_BADGE_CLASS_NAME, FOLLOWER_BADGE_BACKGROUND_COLOR, getFollowerBadgeCSS } from '../helpers';

export interface FollowerData {
  name: string;
  screenName: string;
  followersCount: number;
}

function extractUsernamesFromCard(card: Element): Array<{ username: string; anchor: HTMLAnchorElement; container: Element }> {
  const results: Array<{ username: string; anchor: HTMLAnchorElement; container: Element }> = [];
  const userNames = card.querySelectorAll('[data-testid="User-Name"]');
  
  for (const userNameContainer of userNames) {
    const links = userNameContainer.querySelectorAll('a[href^="/"]');
    
    for (const link of links) {
      const linkAnchor = link as HTMLAnchorElement;
      // Skip if this link is part of a retweet indicator
      if (linkAnchor.closest('[data-testid="socialContext"]')) {
        continue;
      }
      const extractedUsername = extractUsernameFromLink(linkAnchor);
      
      if (extractedUsername) {
        results.push({
          username: extractedUsername,
          anchor: linkAnchor,
          container: userNameContainer,
        });
      }
    }
  }
  
  return results;
}

export function matchCardAndApplyCSS(
  card: Element,
  followerData: FollowerData[],
  options?: {
    verifyOnly?: boolean; // If true, only verify badge exists, don't apply CSS
  }
): void {
  // Extract all usernames from card
  const usernameData = extractUsernamesFromCard(card);

  if (usernameData.length === 0) {
    return;
  }

  // Find the first username that has matching follower data
  let matchedUsername: string | null = null;
  let matchedFollowerData: FollowerData | null = null;
  let matchedUsernameInfo: { username: string; anchor: HTMLAnchorElement; container: Element } | null = null;

  for (const info of usernameData) {
    const followerDataItem = followerData.find(f => f.screenName === info.username);
    if (followerDataItem) {
      matchedUsername = info.username;
      matchedFollowerData = followerDataItem;
      matchedUsernameInfo = info;
      break; // Use first match
    }
  }

  if (!matchedUsername || !matchedFollowerData || !matchedUsernameInfo) {
    return;
  }

  // Check if badge already exists in the matched container
  const matchedContainer = matchedUsernameInfo.container;
  const existingBadge = matchedContainer.querySelector(`.${FOLLOWER_BADGE_CLASS_NAME}`);
  
  if (existingBadge) {
    // If verifyOnly mode, return early without modifying the badge
    if (options?.verifyOnly) {
      return;
    }
    
    // Remove existing badge to update with latest data
    existingBadge.remove();
  }

  // If verifyOnly and badge doesn't exist, return early
  if (options?.verifyOnly) {
    return;
  }

  // Apply CSS styling by creating and injecting badge
  const anchor = matchedUsernameInfo.anchor;
  
  if (anchor) {
    // Create chip-like badge element
    const badge = document.createElement('span');
    badge.className = FOLLOWER_BADGE_CLASS_NAME;
    badge.textContent = `${formatFollowerCount(matchedFollowerData.followersCount)} followers`;
    badge.style.cssText = getFollowerBadgeCSS(FOLLOWER_BADGE_BACKGROUND_COLOR);
    
    // Find the right container to insert into
    let insertContainer: Element | null = null;
    
    // Strategy 1: Find the container that holds the username link and timestamp
    let current: Element | null = anchor.parentElement;
    while (current && current !== matchedContainer) {
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
      const anchorParent = anchor.parentElement;
      
      if (anchor.nextSibling) {
        insertContainer.insertBefore(badge, anchor.nextSibling);
      } 
      else if (anchorParent && anchorParent !== insertContainer && anchorParent.nextSibling) {
        insertContainer.insertBefore(badge, anchorParent.nextSibling);
      }
      else {
        insertContainer.appendChild(badge);
      }
    }
  }
}

export function injectFollowerCountToCard(
  card: Element,
  followerData: FollowerData[]
): void {
  // Extract username for potential warning log
  const usernameData = extractUsernamesFromCard(card);
  const firstUsername = usernameData[0]?.username || null;
  
  matchCardAndApplyCSS(card, followerData);

  // Check if badge was applied, if not log warning
  // const badge = card.querySelector(`.${FOLLOWER_BADGE_CLASS_NAME}`);
  // if (!badge && firstUsername && !followerData.find(f => f.screenName === firstUsername)) {
  //   const cardId = card.getAttribute('aria-labelledby') || card.getAttribute('data-testid') || 'unknown';
  //   const tweetLink = card.querySelector('a[href*="/status/"]') as HTMLAnchorElement;
  //   const tweetId = tweetLink?.href?.match(/\/status\/(\d+)/)?.[1] || 'unknown';
  //   const tweetText = card.querySelector('[data-testid="tweetText"]')?.textContent?.substring(0, 50) || 'N/A';
  //   
  //   console.warn('⚠️ [Twitter Extension] Card cannot find matching JSON to show followers:', {
  //     username: `@${firstUsername}`,
  //     cardId: cardId,
  //     tweetId: tweetId,
  //     tweetLink: tweetLink?.href || 'N/A',
  //     tweetTextPreview: tweetText,
  //     availableUsernames: followerData.slice(0, 10).map(f => f.screenName),
  //     totalUsernames: followerData.length
  //   });
  // }
}

