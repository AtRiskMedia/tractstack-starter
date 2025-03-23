/**
 * Utility functions for Open Graph image generation
 */

// Standard OG image dimensions
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_ASPECT_RATIO = OG_IMAGE_WIDTH / OG_IMAGE_HEIGHT;

// Text margin and padding settings (in pixels)
export const TEXT_MARGIN = 80;
export const TEXT_MAX_WIDTH = OG_IMAGE_WIDTH - TEXT_MARGIN * 2;

/**
 * Calculate optimal font size based on title length
 * @param title Title text to display
 * @param containerWidth Width of the containing element
 * @param containerHeight Height of the containing element
 * @param minFontSize Minimum allowed font size
 * @param maxFontSize Maximum allowed font size
 * @returns Optimal font size in pixels
 */
export function calculateOptimalFontSize(
  title: string,
  //containerWidth: number = OG_IMAGE_WIDTH,
  //containerHeight: number = OG_IMAGE_HEIGHT,
  minFontSize: number = 36,
  maxFontSize: number = 120
): number {
  // Short text can use larger fonts
  if (title.length <= 20) {
    return maxFontSize;
  }

  // Long text needs smaller fonts
  if (title.length >= 100) {
    return minFontSize;
  }

  // Scale font size inversely with title length
  // This is a basic heuristic that works reasonably well
  const optimalSize =
    maxFontSize - ((title.length - 20) / (100 - 20)) * (maxFontSize - minFontSize);

  return Math.round(optimalSize);
}

/**
 * Estimates the number of lines for a given text at a specific font size
 * This is a rough estimation for preview purposes
 * @param text Text content
 * @param fontSize Font size in pixels
 * @param maxWidth Maximum width available for text
 * @returns Estimated number of lines
 */
export function estimateLines(
  text: string,
  fontSize: number,
  maxWidth: number = TEXT_MAX_WIDTH
): number {
  // Average character width is roughly 0.6x font size
  const avgCharWidth = fontSize * 0.6;

  // Calculate roughly how many characters fit on one line
  const charsPerLine = Math.floor(maxWidth / avgCharWidth);

  // Roughly estimate how many lines we need
  return Math.ceil(text.length / charsPerLine);
}

/**
 * Adjusts font size to ensure text fits within the container height
 * @param text Text content
 * @param initialFontSize Initial font size
 * @param containerHeight Container height
 * @param maxLines Maximum number of lines allowed
 * @returns Adjusted font size
 */
export function adjustFontSizeForHeight(
  text: string,
  initialFontSize: number,
  containerHeight: number = OG_IMAGE_HEIGHT,
  maxLines: number = 5
): number {
  let fontSize = initialFontSize;

  // Estimate line height based on font size (typically 1.2-1.5x)
  const lineHeight = fontSize * 1.3;

  // Calculate how many lines we'd need at the current font size
  let lines = estimateLines(text, fontSize);

  // Maximum height we can use (80% of container height)
  const maxTextHeight = containerHeight * 0.8;

  // Reduce font size until the text fits within maxLines or below maxTextHeight
  while ((lines > maxLines || lines * lineHeight > maxTextHeight) && fontSize > 36) {
    fontSize -= 4;
    lines = estimateLines(text, fontSize);
  }

  return fontSize;
}

/**
 * Create a font sizing function that memoizes results for performance
 * @returns A function that calculates and caches font sizes
 */
export function createFontSizer() {
  const cache = new Map<string, number>();

  return (title: string): number => {
    // Return cached result if available
    if (cache.has(title)) {
      return cache.get(title)!;
    }

    // Calculate font size for uncached text
    const initialSize = calculateOptimalFontSize(title);
    const adjustedSize = adjustFontSizeForHeight(title, initialSize);

    // Cache and return the result
    cache.set(title, adjustedSize);
    return adjustedSize;
  };
}

/**
 * Truncate text with ellipsis if it exceeds a certain length
 * @param text Text to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateWithEllipsis(text: string, maxLength: number = 125): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}
