/**
 * Mapper functions for transforming Twitter API data into friendly formats
 * 
 * This module handles mapping raw Twitter API responses into structured
 * data formats that are easier to work with in the extension.
 */

import { FriendlyPost, FollowerData } from '../inject-card-elements';

/**
 * Create a friendly post object with only the metadata we need
 * 
 * Maps raw Twitter API tweet and user data into a simplified FriendlyPost format
 * 
 * @param tweetResult - Raw tweet result from Twitter API
 * @param user - Raw user data from Twitter API
 * @returns FriendlyPost object or null if mapping fails
 */
export function createFriendlyPost(tweetResult: any, user: any): FriendlyPost | null {
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
 * Extract and map follower data from raw user object
 * 
 * @param user - Raw user data from Twitter API
 * @returns FollowerData object or null if extraction fails
 */
export function extractFollowerData(user: any): FollowerData | null {
  try {
    const legacy = user.legacy || {};
    const core = user.core || {};
    
    const name = core?.name || legacy?.name || 'Unknown';
    const screenName = core?.screen_name || legacy?.screen_name || 'unknown';
    const followersCount = legacy?.followers_count;
    
    if (followersCount === undefined || followersCount === null || !screenName) {
      return null;
    }
    
    return {
      name,
      screenName,
      followersCount,
    };
  } catch (error) {
    console.error('Error extracting follower data:', error);
    return null;
  }
}

/**
 * Extract and map timeline data from JSON response
 * 
 * Processes the Twitter API timeline response and extracts user/post data.
 * Returns the mapped data and statistics about what was processed.
 * 
 * @param data - Raw JSON response from Twitter API
 * @returns Object containing mapped data and processing statistics
 */
export function mapTimelineData(data: any): {
  followerData: Map<string, FollowerData>;
  friendlyPosts: Map<string, FriendlyPost>;
  newPostsCount: number;
} {
  const followerData = new Map<string, FollowerData>();
  const friendlyPosts = new Map<string, FriendlyPost>();
  let newPostsCount = 0;
  
  try {
    const instructions = data?.data?.home?.home_timeline_urt?.instructions || [];
    
    console.log('📊 [Twitter Extension] Processing timeline with', instructions.length, 'instructions');
    
    for (const instruction of instructions) {
      if (instruction.type === 'TimelineAddEntries' && instruction.entries) {
        for (const entry of instruction.entries) {
          const tweetResult = entry.content?.itemContent?.tweet_results?.result;
          
          if (tweetResult && tweetResult.core?.user_results?.result) {
            const user = tweetResult.core.user_results.result;
            
            // Extract follower data
            const followerDataItem = extractFollowerData(user);
            if (followerDataItem) {
              followerData.set(followerDataItem.screenName, followerDataItem);
            }
            
            // Create friendly post object
            const friendlyPost = createFriendlyPost(tweetResult, user);
            if (friendlyPost) {
              const screenName = followerDataItem?.screenName || 'unknown';
              const wasNew = !friendlyPosts.has(screenName);
              friendlyPosts.set(screenName, friendlyPost);
              
              if (wasNew) {
                newPostsCount++;
                // Log friendly post object (total count will be logged by caller)
                console.log(`📝 New post (@${screenName}):`, friendlyPost);
              } else {
                // Update existing post silently (data refreshed)
                console.log(`🔄 Updated data for @${screenName}`);
              }
            }
          }
        }
      }
    }
    
    if (newPostsCount > 0) {
      console.log(`✅ [Twitter Extension] Mapped ${newPostsCount} new posts`);
    } else {
      console.log(`ℹ️ [Twitter Extension] No new posts in this batch`);
    }
  } catch (error) {
    console.error('❌ [Twitter Extension] Error mapping timeline data:', error);
  }
  
  return {
    followerData,
    friendlyPosts,
    newPostsCount,
  };
}

