/**
 * End-to-end test for card element injection
 * 
 * Tests that follower count badges are correctly injected into tweet cards
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { injectFollowerCountToCard, FollowerData, FriendlyPost } from './index';

describe('injectFollowerCountToCard', () => {
  let container: HTMLElement;
  let followerDataMap: Map<string, FollowerData>;
  let friendlyPostMap: Map<string, FriendlyPost>;

  beforeEach(() => {
    // Create a fresh container for each test
    container = document.createElement('div');
    document.body.appendChild(container);

    // Initialize maps
    followerDataMap = new Map<string, FollowerData>();
    friendlyPostMap = new Map<string, FriendlyPost>();
  });

  afterEach(() => {
    // Clean up
    document.body.removeChild(container);
  });

  it('should find a matching card and inject the red follower badge', () => {
    // Setup: Create a tweet card HTML structure matching Twitter's structure
    const cardHTML = `
      <article data-testid="tweet" aria-labelledby="test-tweet">
        <div data-testid="User-Name">
          <div>
            <a href="/testuser" role="link">Test User</a>
            <time datetime="2024-01-01">Jan 1</time>
          </div>
        </div>
        <div data-testid="tweetText">This is a test tweet</div>
        <div role="group">
          <button>Like</button>
          <button>Retweet</button>
        </div>
      </article>
    `;

    container.innerHTML = cardHTML;
    const card = container.querySelector('article[data-testid="tweet"]') as Element;

    // Setup: Add follower data for the user
    followerDataMap.set('testuser', {
      name: 'Test User',
      screenName: 'testuser',
      followersCount: 790000,
    });

    // Execute: Inject the follower count
    injectFollowerCountToCard(card, followerDataMap, friendlyPostMap);

    // Assert: Badge should exist in the DOM
    const badge = container.querySelector('.twitter-extension-follower-badge');
    expect(badge).not.toBeNull();
    expect(badge).toBeInstanceOf(HTMLElement);
  });

  it('should show the badge after injection with correct styling', () => {
    // Setup: Create a tweet card HTML structure
    const cardHTML = `
      <article data-testid="tweet">
        <div data-testid="User-Name">
          <div>
            <a href="/testuser">Test User</a>
            <time datetime="2024-01-01">Jan 1</time>
          </div>
        </div>
      </article>
    `;

    container.innerHTML = cardHTML;
    const card = container.querySelector('article[data-testid="tweet"]') as Element;

    // Setup: Add follower data
    followerDataMap.set('testuser', {
      name: 'Test User',
      screenName: 'testuser',
      followersCount: 790000,
    });

    // Execute: Inject the follower count
    injectFollowerCountToCard(card, followerDataMap, friendlyPostMap);

    // Assert: Badge should be visible with red background
    const badge = container.querySelector('.twitter-extension-follower-badge') as HTMLElement;
    expect(badge).not.toBeNull();
    
    // Assert: Badge should have red background color
    expect(badge.style.backgroundColor).toBe('rgb(185, 28, 28)');
    expect(badge.style.color).toBe('rgb(255, 255, 255)');
    
    // Assert: Badge should contain follower count text
    expect(badge.textContent).toContain('followers');
  });
});
