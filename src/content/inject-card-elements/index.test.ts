/**
 * End-to-end test for card element injection
 * 
 * Tests that follower count badges are correctly injected into tweet cards
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { injectFollowerCountToCard, FollowerData } from './index';

describe('RenderBadge', () => {
  let container: HTMLElement;
  let followerData: FollowerData[];

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    followerData = [];
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  /**
   * Test helper: Loads card, injects badge, and asserts badge exists
   */
  function testBadgeExists(file: TestFile, followersCount: number): void {
    const { card, username, followerData: data } = setupTestCard(file, followersCount);
    container.appendChild(card);
    followerData.push(data);

    injectFollowerCountToCard(card, followerData);

    const badge = container.querySelector('.engagex-follower-badge');
    expect(badge).not.toBeNull();
  }

  it('Test A', () => {
    testBadgeExists('TestA', 790000);
  });

  it('Test B', () => {
    testBadgeExists('TestB', 790000);
  });

  it('Test C', () => {
    testBadgeExists('TestC', 500000);
  });

  it('Test D', () => {
    testBadgeExists('TestD', 1200000);
  });
});

// ============================================================================
// PRIVATE: Test Helper Functions
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type TestFile = 'TestA' | 'TestB' | 'TestC' | 'TestD';

const htmlCache: Map<TestFile, string> = new Map();
const documentCache: Map<TestFile, Document> = new Map();

/**
 * Load a test HTML file and return its content
 */
function loadTestHtml(file: TestFile): string {
  if (!htmlCache.has(file)) {
    const testHtmlPath = resolve(__dirname, `./${file}.html`);
    htmlCache.set(file, readFileSync(testHtmlPath, 'utf-8'));
  }
  return htmlCache.get(file)!;
}

/**
 * Get a parsed Document from a test HTML file
 */
function getTestHtmlDocument(file: TestFile): Document {
  if (!documentCache.has(file)) {
    const html = loadTestHtml(file);
    const parser = new DOMParser();
    documentCache.set(file, parser.parseFromString(html, 'text/html'));
  }
  return documentCache.get(file)!;
}

/**
 * Get a tweet card from a test HTML file by index
 * Returns a cloned element that can be modified in tests
 */
function getTestCard(file: TestFile = 'TestA', index: number = 0): Element | null {
  const doc = getTestHtmlDocument(file);
  const cards = doc.querySelectorAll('article[data-testid="tweet"]');
  
  if (cards.length === 0 || index >= cards.length) {
    return null;
  }
  
  // Clone the card so tests can modify it without affecting the original
  return cards[index].cloneNode(true) as Element;
}

/**
 * Extract username from a card element
 */
function extractUsernameFromCard(card: Element): string | null {
  const usernameLink = card.querySelector('a[href*="/"]:not([data-testid="socialContext"] a)') as HTMLAnchorElement;
  if (!usernameLink) {
    return null;
  }
  
  const href = usernameLink.getAttribute('href') || usernameLink.href || '';
  // Extract username from href like "/username" or "http://localhost:3000/username"
  const username = href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\//, '').split('/')[0];
  return username || null;
}

/**
 * Setup a test card with follower data
 */
function setupTestCard(
  file: TestFile = 'TestA',
  followersCount: number = 100000,
  removeBadge: boolean = false
): { card: Element; username: string; followerData: FollowerData } {
  const card = getTestCard(file, 0);
  if (!card) {
    throw new Error(`No test card found in ${file}.html`);
  }
  
  // Remove existing badge if requested
  if (removeBadge) {
    const existingBadge = card.querySelector('.engagex-follower-badge');
    if (existingBadge) {
      existingBadge.remove();
    }
  }
  
  const username = extractUsernameFromCard(card);
  if (!username) {
    throw new Error(`Could not extract username from card in ${file}.html`);
  }
  
  const followerData: FollowerData = {
    name: 'Test User',
    screenName: username,
    followersCount,
  };
  
  return { card, username, followerData };
}
