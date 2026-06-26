import { describe, expect, it } from 'vitest';
import {
  APP_HEADER_SCROLL_MIN_DELTA_PX,
  APP_HEADER_SCROLL_TOP_THRESHOLD_PX,
  resolveAppHeaderVisibilityFromScroll,
} from './useAppHeaderScrollVisibility';

describe('resolveAppHeaderVisibilityFromScroll', () => {
  it('keeps header visible near the top of the page', () => {
    expect(
      resolveAppHeaderVisibilityFromScroll({
        scrollY: APP_HEADER_SCROLL_TOP_THRESHOLD_PX,
        previousScrollY: 0,
        currentlyVisible: false,
      })
    ).toEqual({ visible: true, nextScrollY: APP_HEADER_SCROLL_TOP_THRESHOLD_PX });
  });

  it('hides header when scrolling down past the threshold', () => {
    const previousScrollY = APP_HEADER_SCROLL_TOP_THRESHOLD_PX + 20;

    expect(
      resolveAppHeaderVisibilityFromScroll({
        scrollY: previousScrollY + APP_HEADER_SCROLL_MIN_DELTA_PX,
        previousScrollY,
        currentlyVisible: true,
      })
    ).toEqual({
      visible: false,
      nextScrollY: previousScrollY + APP_HEADER_SCROLL_MIN_DELTA_PX,
    });
  });

  it('shows header when scrolling up', () => {
    const previousScrollY = 240;

    expect(
      resolveAppHeaderVisibilityFromScroll({
        scrollY: previousScrollY - APP_HEADER_SCROLL_MIN_DELTA_PX,
        previousScrollY,
        currentlyVisible: false,
      })
    ).toEqual({
      visible: true,
      nextScrollY: previousScrollY - APP_HEADER_SCROLL_MIN_DELTA_PX,
    });
  });

  it('ignores tiny scroll deltas', () => {
    expect(
      resolveAppHeaderVisibilityFromScroll({
        scrollY: 120,
        previousScrollY: 118,
        currentlyVisible: true,
      })
    ).toEqual({ visible: true, nextScrollY: 120 });
  });
});
