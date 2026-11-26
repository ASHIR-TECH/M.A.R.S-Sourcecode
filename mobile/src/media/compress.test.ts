import { fitWithinMaxEdge, MAX_IMAGE_EDGE, THUMBNAIL_EDGE } from './compress';

describe('fitWithinMaxEdge', () => {
  it('keeps small images unchanged', () => {
    expect(fitWithinMaxEdge(800, 600)).toEqual({ width: 800, height: 600, needsResize: false });
  });

  it('bounds the longest edge of landscape and portrait images', () => {
    const landscape = fitWithinMaxEdge(4000, 2000);
    expect(landscape).toEqual({
      width: MAX_IMAGE_EDGE,
      height: 800,
      needsResize: true,
    });

    const portrait = fitWithinMaxEdge(2000, 4000);
    expect(portrait).toEqual({
      width: 800,
      height: MAX_IMAGE_EDGE,
      needsResize: true,
    });
  });

  it('applies the smaller thumbnail bound', () => {
    expect(fitWithinMaxEdge(1600, 900, THUMBNAIL_EDGE)).toEqual({
      width: THUMBNAIL_EDGE,
      height: 180,
      needsResize: true,
    });
  });

  it('tolerates unknown dimensions', () => {
    expect(fitWithinMaxEdge(0, 0)).toEqual({ width: 0, height: 0, needsResize: false });
  });
});
