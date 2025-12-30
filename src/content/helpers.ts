// Selectors
export function getTweetCards(): NodeListOf<Element> {
    return document.querySelectorAll('article[data-testid="tweet"]');
}

export function getTweetCardsContainer(): HTMLElement | undefined {
    const timelines = Array.from(document.querySelectorAll('div[aria-label*="Timeline"]'));
    return timelines.find((el) => {
      const label = el.getAttribute('aria-label');
      return label && label.includes('Home Timeline');
    }) as HTMLElement | undefined;
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
export const FOLLOWER_BADGE_CLASS_NAME = 'twitter-extension-follower-badge';

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

export function mapTimelineData(data: any): TimelineDataResult {
  const users: FollowerData[] = [];
  const tweets: TweetData[] = [];
  const seenUsers = new Set<string>();
  const seenTweets = new Set<string>();
  
  try {
    const instructions = data?.data?.home?.home_timeline_urt?.instructions || [];
    
    for (const instruction of instructions) {
      if (instruction.type === 'TimelineAddEntries' && instruction.entries) {
        for (const entry of instruction.entries) {
          const tweetResult = entry.content?.itemContent?.tweet_results?.result;
          
          if (tweetResult) {
            // Extract user data
            const userResult = tweetResult.core?.user_results?.result;
            if (userResult) {
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
            
            // Extract tweet data
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
        }
      }
    }
    
    if (users.length > 0) {
      console.log(`✅ [Twitter Extension] Extracted ${users.length} users, ${tweets.length} tweets`);
    }
  } catch (error) {
    console.error('❌ [Twitter Extension] Error mapping timeline data:', error);
  }
  
  return { users, tweets };
}
  