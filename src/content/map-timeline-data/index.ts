import { FollowerData } from '../inject-card-elements';

interface TwitterAPIResponse {
  data?: {
    home?: {
      home_timeline_urt?: {
        instructions?: Array<{
          type?: string;
          entries?: Array<{
            content?: {
              itemContent?: {
                tweet_results?: {
                  result?: {
                    core?: {
                      user_results?: {
                        result?: {
                          core?: { screen_name?: string; name?: string };
                          legacy?: { followers_count?: number; screen_name?: string; name?: string };
                        };
                      };
                    };
                  };
                };
              };
            };
          }>;
        }>;
      };
    };
  };
}

export function mapTimelineData(data: TwitterAPIResponse): FollowerData[] {
  const followerData: FollowerData[] = [];
  
  try {
    const instructions = data?.data?.home?.home_timeline_urt?.instructions || [];
    
    for (const instruction of instructions) {
      if (instruction.type === 'TimelineAddEntries' && instruction.entries) {
        for (const entry of instruction.entries) {
          const tweetResult = entry.content?.itemContent?.tweet_results?.result;
          
          if (tweetResult && tweetResult.core?.user_results?.result) {
            const user = tweetResult.core.user_results.result;
            const legacy = user.legacy || {};
            const core = user.core || {};
            
            const name = core?.name || legacy?.name || 'Unknown';
            const screenName = core?.screen_name || legacy?.screen_name || 'unknown';
            const followersCount = legacy?.followers_count;
            
            if (followersCount !== undefined && followersCount !== null && screenName) {
              followerData.push({
                name,
                screenName,
                followersCount,
              });
            }
          }
        }
      }
    }
    
    if (followerData.length > 0) {
      console.log(`✅ [Twitter Extension] Extracted ${followerData.length} follower data entries`);
    }
  } catch (error) {
    console.error('❌ [Twitter Extension] Error mapping timeline data:', error);
  }
  
  return followerData;
}

