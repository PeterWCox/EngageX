// Selectors
export function getTweetCards(): NodeListOf<Element> {
    return document.querySelectorAll('article[data-testid="tweet"]');
}

export function getTweetCardsContainer(): HTMLElement | undefined {
    // Try to find any timeline container (Home, Community, etc.)
    const timelines = Array.from(document.querySelectorAll('div[aria-label*="Timeline"]'));
    
    // Prefer Home Timeline, but accept any timeline
    const homeTimeline = timelines.find((el) => {
      const label = el.getAttribute('aria-label');
      return label && label.includes('Home Timeline');
    });
    
    if (homeTimeline) return homeTimeline as HTMLElement;
    
    // Fallback to any timeline container
    if (timelines.length > 0) {
      return timelines[0] as HTMLElement;
    }
    
    // Last resort: look for main content area with tweets
    const mainContent = document.querySelector('main[role="main"]') || 
                        document.querySelector('[data-testid="primaryColumn"]');
    return mainContent as HTMLElement | undefined;
}

// Formatting
export function formatFollowerCount(count: number): string {
  return count.toLocaleString('en-US');
}

// Extraction
export function extractUsernameFromLink(link: HTMLAnchorElement): string | null {
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

// Styling
export const FOLLOWER_BADGE_CLASS_NAME = 'engagex-follower-badge';

export const FOLLOWER_BADGE_BACKGROUND_COLOR = 'rgb(185, 28, 28)';

export function getFollowerBadgeCSS(backgroundColor: string = FOLLOWER_BADGE_BACKGROUND_COLOR): string {
  return `
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
}

// Data Mapping
import { FollowerData, TweetData } from './inject-card-elements';

// Calculate tweet age in minutes
function calculateTweetAgeMinutes(createdAt: string): number {
  try {
    const tweetDate = new Date(createdAt);
    const now = new Date();
    return Math.floor((now.getTime() - tweetDate.getTime()) / (1000 * 60));
  } catch {
    return 0;
  }
}

// Calculate engagement opportunity score
// Higher score = better opportunity to engage and get noticed
function calculateEngagementScore(
  followersCount: number,
  replyCount: number,
  ageMinutes: number,
  viewCount: number | null
): number {
  // Factors:
  // - High followers = more visibility if you get noticed
  // - Low replies = less competition
  // - Recent tweet = more likely to be seen
  // - High views but low replies = viral potential with engagement gap
  
  if (ageMinutes === 0) return 0;
  
  const followerScore = Math.log10(Math.max(followersCount, 1)) * 10; // 0-80 range
  const replyPenalty = Math.min(replyCount * 2, 50); // More replies = less opportunity
  const freshnessBonus = Math.max(0, 30 - (ageMinutes / 60)); // Bonus for tweets < 30 hours old
  
  let viewEngagementGap = 0;
  if (viewCount && viewCount > 0) {
    const engagementRate = replyCount / viewCount;
    if (engagementRate < 0.001) { // Less than 0.1% reply rate
      viewEngagementGap = Math.min(20, Math.log10(viewCount) * 3);
    }
  }
  
  return Math.max(0, followerScore - replyPenalty + freshnessBonus + viewEngagementGap);
}

export interface TimelineDataResult {
  users: FollowerData[];
  tweets: TweetData[];
}

// Helper to extract user data from a userResult object
function extractUserFromResult(
  userResult: any,
  seenUsers: Set<string>,
  users: FollowerData[]
): void {
  if (!userResult) return;
  
  const legacy = userResult.legacy || {};
  const core = userResult.core || {};
  
  const screenName = core?.screen_name || legacy?.screen_name || '';
  
  if (screenName && !seenUsers.has(screenName)) {
    seenUsers.add(screenName);
    
    const followersCount = legacy?.followers_count || 0;
    const followingCount = legacy?.friends_count || 0;
    
    users.push({
      name: core?.name || legacy?.name || 'Unknown',
      screenName,
      followersCount,
      followingCount,
      tweetsCount: legacy?.statuses_count || 0,
      listedCount: legacy?.listed_count || 0,
      isVerified: userResult.is_blue_verified || false,
      accountCreatedAt: core?.created_at || '',
      followerRatio: followingCount > 0 ? followersCount / followingCount : followersCount,
    });
  }
}

// Helper to extract tweet data
function extractTweetFromResult(
  tweetResult: any,
  seenTweets: Set<string>,
  tweets: TweetData[]
): void {
  if (!tweetResult) return;
  
  const tweetLegacy = tweetResult.legacy;
  const tweetId = tweetResult.rest_id;
  
  if (tweetLegacy && tweetId && !seenTweets.has(tweetId)) {
    seenTweets.add(tweetId);
    
    const userResult = tweetResult.core?.user_results?.result;
    const screenName = userResult?.core?.screen_name || userResult?.legacy?.screen_name || '';
    const followersCount = userResult?.legacy?.followers_count || 0;
    
    const createdAt = tweetLegacy.created_at || '';
    const ageMinutes = calculateTweetAgeMinutes(createdAt);
    const replyCount = tweetLegacy.reply_count || 0;
    const viewCount = tweetResult.views?.count ? parseInt(tweetResult.views.count) : null;
    
    tweets.push({
      tweetId,
      screenName,
      replyCount,
      retweetCount: tweetLegacy.retweet_count || 0,
      likeCount: tweetLegacy.favorite_count || 0,
      quoteCount: tweetLegacy.quote_count || 0,
      viewCount,
      bookmarkCount: tweetLegacy.bookmark_count || 0,
      createdAt,
      ageMinutes,
      engagementOpportunityScore: calculateEngagementScore(
        followersCount,
        replyCount,
        ageMinutes,
        viewCount
      ),
    });
  }
}

// Recursively process a tweet result and all nested tweets (retweets, quotes)
function processTweetResult(
  tweetResult: any,
  seenUsers: Set<string>,
  seenTweets: Set<string>,
  users: FollowerData[],
  tweets: TweetData[]
): void {
  if (!tweetResult) return;
  
  // Extract main tweet's user
  extractUserFromResult(tweetResult.core?.user_results?.result, seenUsers, users);
  
  // Extract main tweet data
  extractTweetFromResult(tweetResult, seenTweets, tweets);
  
  // Handle retweets - extract the original author
  const retweetedResult = tweetResult.legacy?.retweeted_status_result?.result;
  if (retweetedResult) {
    extractUserFromResult(retweetedResult.core?.user_results?.result, seenUsers, users);
    extractTweetFromResult(retweetedResult, seenTweets, tweets);
    
    // Retweet might also have a quoted tweet
    const retweetQuotedResult = retweetedResult.quoted_status_result?.result;
    if (retweetQuotedResult) {
      extractUserFromResult(retweetQuotedResult.core?.user_results?.result, seenUsers, users);
      extractTweetFromResult(retweetQuotedResult, seenTweets, tweets);
    }
  }
  
  // Handle quote tweets - extract the quoted author
  const quotedResult = tweetResult.quoted_status_result?.result;
  if (quotedResult) {
    extractUserFromResult(quotedResult.core?.user_results?.result, seenUsers, users);
    extractTweetFromResult(quotedResult, seenTweets, tweets);
  }
}

// Deep search for all screen_name fields in the API response (for debugging)
function findAllUsernamesInResponse(obj: any, found: Set<string> = new Set(), path: string = ''): Set<string> {
  if (obj === null || obj === undefined) return found;
  
  if (typeof obj === 'object') {
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => findAllUsernamesInResponse(item, found, `${path}[${i}]`));
    } else {
      // Check for screen_name field
      if (obj.screen_name && typeof obj.screen_name === 'string') {
        found.add(obj.screen_name);
      }
      
      // Recursively search all properties
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          findAllUsernamesInResponse(obj[key], found, path ? `${path}.${key}` : key);
        }
      }
    }
  }
  
  return found;
}

export function mapTimelineData(data: any): TimelineDataResult {
  const users: FollowerData[] = [];
  const tweets: TweetData[] = [];
  const seenUsers = new Set<string>();
  const seenTweets = new Set<string>();
  
  try {
    // Handle both Home timeline and Community timeline structures
    let instructions: any[] = [];
    
    // Home timeline structure: data.home.home_timeline_urt.instructions
    if (data?.data?.home?.home_timeline_urt?.instructions) {
      instructions = data.data.home.home_timeline_urt.instructions;
    }
    // Community timeline structure: data.communityResults.result.ranked_community_timeline.timeline.instructions
    else if (data?.data?.communityResults?.result?.ranked_community_timeline?.timeline?.instructions) {
      instructions = data.data.communityResults.result.ranked_community_timeline.timeline.instructions;
    }
    
    // Deep search for ALL usernames in the response (for debugging)
    const allUsernamesInResponse = findAllUsernamesInResponse(data);
    
    const entryTypes = new Set<string>();
    
    for (const instruction of instructions) {
      entryTypes.add(instruction.type || 'unknown');
      
      if (instruction.type === 'TimelineAddEntries' && instruction.entries) {
        for (const entry of instruction.entries) {
          // Handle regular timeline items
          const tweetResult = entry.content?.itemContent?.tweet_results?.result;
          if (tweetResult) {
            processTweetResult(tweetResult, seenUsers, seenTweets, users, tweets);
          }
          
          // Handle TimelineTimelineModule entries (conversation threads, etc.)
          if (entry.content?.entryType === 'TimelineTimelineModule' && entry.content?.items) {
            for (const item of entry.content.items) {
              const moduleTweetResult = item?.item?.itemContent?.tweet_results?.result;
              if (moduleTweetResult) {
                processTweetResult(moduleTweetResult, seenUsers, seenTweets, users, tweets);
              }
            }
          }
        }
      }
    }
    
    // Log entry types we're processing
    if (entryTypes.size > 0) {
      // console.log('📝 [EngageX] Entry types found:', Array.from(entryTypes).sort());
    }
    
    if (users.length > 0) {
      const extractedUsernames = new Set(users.map(u => u.screenName));
      const missingUsernames = Array.from(allUsernamesInResponse).filter(u => !extractedUsernames.has(u));
      
      // console.log(`✅ [EngageX] Extracted ${users.length} users, ${tweets.length} tweets`);
      
      // Log if we found usernames in API that we didn't extract
      if (missingUsernames.length > 0) {
        // console.warn(`⚠️ [EngageX] Found ${missingUsernames.length} usernames in API response that weren't extracted:`, missingUsernames);
      }
      
      // Log all usernames found in API (for debugging)
      // console.log('📋 [EngageX] All usernames found in API response:', Array.from(allUsernamesInResponse).sort());
    }
  } catch (error) {
    // console.error('❌ [EngageX] Error mapping timeline data:', error);
  }
  
  return { users, tweets };
}
  