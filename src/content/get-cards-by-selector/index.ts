/**
 * Get all tweet cards using the standard selector
 * 
 * This function selects all tweet card elements using the standard Twitter selector.
 * Tweet cards are article elements with data-testid="tweet".
 * 
 * @returns NodeList of tweet card elements
 * 
 * @example
 * ```typescript
 * const cards = getCardsBySelector();
 * cards.forEach(card => {
 *   // Process each card
 * });
 * ```
 */
export function getCardsBySelector(): NodeListOf<Element> {
  return document.querySelectorAll('article[data-testid="tweet"]');
}

