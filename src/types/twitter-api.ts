/**
 * TypeScript schema for Twitter GraphQL API response
 * Focused on extracting follower count data
 */

export interface TwitterUser {
  __typename: string;
  rest_id: string;
  core: {
    user_results: {
      result: {
        __typename: string;
        rest_id: string;
        core: {
          screen_name: string;
          name: string;
        };
        legacy: {
          followers_count: number;
          screen_name: string;
        };
      };
    };
  };
}

export interface TimelineTweet {
  entryId: string;
  content: {
    itemContent: {
      itemType: string;
      tweet_results: {
        result: TwitterUser | {
          __typename: string;
          rest_id: string;
          core: {
            user_results: {
              result: {
                __typename: string;
                rest_id: string;
                core: {
                  screen_name: string;
                  name: string;
                };
                legacy: {
                  followers_count: number;
                  screen_name: string;
                };
              };
            };
          };
        };
      };
    };
  };
}

export interface TimelineInstruction {
  type: string;
  entries: TimelineTweet[];
}

export interface HomeTimelineResponse {
  data: {
    home: {
      home_timeline_urt: {
        instructions: TimelineInstruction[];
      };
    };
  };
}

export interface UserFollowerData {
  screenName: string;
  restId: string;
  followersCount: number;
  name: string;
}

