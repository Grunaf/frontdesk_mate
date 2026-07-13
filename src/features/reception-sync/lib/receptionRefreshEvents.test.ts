import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  dispatchReceptionRefresh,
  subscribeReceptionRefresh,
} from './receptionRefreshEvents';

describe('receptionRefreshEvents', () => {
  beforeEach(() => {
    vi.stubGlobal('window', new EventTarget() as Window & EventTarget);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('subscribeReceptionRefresh invokes callback on dispatch', () => {
    const onRefresh = vi.fn();
    const unsubscribe = subscribeReceptionRefresh(onRefresh);

    dispatchReceptionRefresh({ refresh: 'context' });
    expect(onRefresh).toHaveBeenCalledTimes(1);

    unsubscribe();
    dispatchReceptionRefresh({ refresh: 'context' });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
