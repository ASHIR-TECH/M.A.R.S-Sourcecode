export interface ScrollMetrics {
  offsetY: number;
  layoutHeight: number;
  contentHeight: number;
  threshold?: number;
}

/**
 * True when a vertical scroll view has reached (or cannot exceed) the bottom.
 * Content shorter than the viewport counts as "at bottom" so a non-scrolling
 * screen never leaves its chrome hidden forever.
 */
export function isAtBottom({ offsetY, layoutHeight, contentHeight, threshold = 24 }: ScrollMetrics): boolean {
  if (contentHeight <= layoutHeight) return true;
  return offsetY + layoutHeight >= contentHeight - threshold;
}
