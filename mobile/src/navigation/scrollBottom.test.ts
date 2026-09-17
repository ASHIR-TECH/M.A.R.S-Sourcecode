import { isAtBottom } from './scrollBottom';

describe('isAtBottom', () => {
  it('is true when content is shorter than the viewport', () => {
    expect(isAtBottom({ offsetY: 0, layoutHeight: 800, contentHeight: 400 })).toBe(true);
  });

  it('is false while there is still content below', () => {
    expect(isAtBottom({ offsetY: 0, layoutHeight: 800, contentHeight: 2000 })).toBe(false);
  });

  it('is true once scrolled to the bottom', () => {
    expect(isAtBottom({ offsetY: 1200, layoutHeight: 800, contentHeight: 2000 })).toBe(true);
  });

  it('honours the threshold near the bottom', () => {
    expect(isAtBottom({ offsetY: 1180, layoutHeight: 800, contentHeight: 2000, threshold: 24 })).toBe(true);
    expect(isAtBottom({ offsetY: 1100, layoutHeight: 800, contentHeight: 2000, threshold: 24 })).toBe(false);
  });
});
