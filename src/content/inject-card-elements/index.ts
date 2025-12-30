import { formatFollowerCount, extractUsernameFromLink, FOLLOWER_BADGE_CLASS_NAME, FOLLOWER_BADGE_BACKGROUND_COLOR, getFollowerBadgeCSS } from '../helpers';

export interface FollowerData {
  // User info
  name: string;
  screenName: string;
  
  // User metrics
  followersCount: number;
  followingCount: number;
  tweetsCount: number;
  listedCount: number;  // How many lists they're on (credibility signal)
  
  // User status
  isVerified: boolean;
  accountCreatedAt: string;
  
  // Computed
  followerRatio: number;  // followers / following (influence indicator)
}

export interface TweetData {
  tweetId: string;
  screenName: string;
  
  // Tweet metrics (for engagement opportunity)
  replyCount: number;
  retweetCount: number;
  likeCount: number;
  quoteCount: number;
  viewCount: number | null;
  bookmarkCount: number;
  
  // Tweet timing
  createdAt: string;
  ageMinutes: number;  // How old the tweet is
  
  // Engagement opportunity score (higher = better chance)
  engagementOpportunityScore: number;
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

function formatCompactNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

export function matchCardAndApplyCSS(
  card: Element,
  userData: FollowerData[],
  tweetData?: TweetData | null,
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
  let matchedUserData: FollowerData | null = null;
  let matchedUsernameInfo: { username: string; anchor: HTMLAnchorElement; container: Element } | null = null;

  for (const info of usernameData) {
    const userDataItem = userData.find(f => f.screenName === info.username);
    if (userDataItem) {
      matchedUsername = info.username;
      matchedUserData = userDataItem;
      matchedUsernameInfo = info;
      break; // Use first match
    }
  }

  if (!matchedUsername || !matchedUserData || !matchedUsernameInfo) {
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
    // Build badge text with engagement opportunity info
    let badgeText = `${formatFollowerCount(matchedUserData.followersCount)} followers`;
    let badgeColor = FOLLOWER_BADGE_BACKGROUND_COLOR;
    
    // Add engagement opportunity indicator if we have tweet data
    if (tweetData && tweetData.engagementOpportunityScore > 20) {
      const score = Math.round(tweetData.engagementOpportunityScore);
      if (score >= 50) {
        badgeColor = 'rgb(22, 163, 74)'; // Green - high opportunity
        badgeText += ` · 🔥 Reply now!`;
      } else if (score >= 35) {
        badgeColor = 'rgb(234, 179, 8)'; // Yellow/orange - medium opportunity  
        badgeText += ` · ⚡ Good timing`;
      }
    }
    
    // Create chip-like badge element
    const badge = document.createElement('span');
    badge.className = FOLLOWER_BADGE_CLASS_NAME;
    badge.textContent = badgeText;
    badge.style.cssText = getFollowerBadgeCSS(badgeColor);
    
    // Add tooltip with detailed info
    const tooltipParts = [
      `@${matchedUserData.screenName}`,
      `Following: ${formatCompactNumber(matchedUserData.followingCount)}`,
      `Ratio: ${matchedUserData.followerRatio.toFixed(1)}x`,
      `Tweets: ${formatCompactNumber(matchedUserData.tweetsCount)}`,
    ];
    
    if (tweetData) {
      tooltipParts.push('---');
      tooltipParts.push(`Replies: ${tweetData.replyCount}`);
      tooltipParts.push(`Views: ${tweetData.viewCount?.toLocaleString() || 'N/A'}`);
      tooltipParts.push(`Age: ${Math.round(tweetData.ageMinutes / 60)}h`);
      tooltipParts.push(`Opportunity: ${Math.round(tweetData.engagementOpportunityScore)}`);
    }
    
    badge.title = tooltipParts.join('\n');
    
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
  userData: FollowerData[],
  tweetData: TweetData[] = []
): void {
  // Extract username for potential warning log
  const usernameData = extractUsernamesFromCard(card);
  const firstUsername = usernameData[0]?.username || null;
  
  // Extract tweet ID from card
  const tweetLink = card.querySelector('a[href*="/status/"]') as HTMLAnchorElement;
  const tweetId = tweetLink?.href?.match(/\/status\/(\d+)/)?.[1] || null;
  
  // Find matching tweet data for engagement info
  const matchingTweet = tweetId ? tweetData.find(t => t.tweetId === tweetId) : null;
  
  matchCardAndApplyCSS(card, userData, matchingTweet);

  // Check if badge was applied, if not log warning
  const badge = card.querySelector(`.${FOLLOWER_BADGE_CLASS_NAME}`);
  if (!badge && firstUsername) {
    const matchingData = userData.find(f => f.screenName === firstUsername);
    if (!matchingData) {
      const tweetText = card.querySelector('[data-testid="tweetText"]')?.textContent?.substring(0, 50) || 'N/A';
      
      console.warn('⚠️ [Twitter Extension] Card cannot find matching JSON to show followers:', {
        username: `@${firstUsername}`,
        tweetId: tweetId || 'unknown',
        tweetTextPreview: tweetText,
        availableUsernames: userData.map(f => f.screenName),
        totalUserData: userData.length
      });
    }
  }
}

