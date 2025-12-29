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
  