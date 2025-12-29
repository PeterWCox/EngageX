/**
 * Find the timeline container (card stack) that holds tweet cards
 * 
 * This function searches for the timeline container element that holds all tweet cards.
 * The timeline is identified by its aria-label attribute containing "Home Timeline".
 * 
 * @returns The timeline HTMLElement or undefined if not found
 * 
 * @example
 * ```typescript
 * const timeline = getCardStack();
 * if (timeline) {
 *   // Set up observer on timeline
 *   observer.observe(timeline, { childList: true, subtree: true });
 * }
 * ```
 */
export function getCardStack(): HTMLElement | undefined {
  // Look for the timeline div with aria-label
  const timelines = Array.from(document.querySelectorAll('div[aria-label*="Timeline"]'));
  return timelines.find((el) => {
    const label = el.getAttribute('aria-label');
    return label && label.includes('Home Timeline');
  }) as HTMLElement | undefined;
}

