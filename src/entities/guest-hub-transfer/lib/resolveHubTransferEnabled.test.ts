import { describe, expect, it } from 'vitest';
import { resolveHubTransferEnabled } from './resolveHubTransferEnabled';

describe('resolveHubTransferEnabled', () => {
  it('returns true when category is enabled', () => {
    expect(
      resolveHubTransferEnabled({ hubTransfer: { enabledHubCategories: ['airport', 'bus'] } }, 'bus')
    ).toBe(true);
  });

  it('returns false when category is missing or hubTransfer unset', () => {
    expect(resolveHubTransferEnabled(undefined, 'airport')).toBe(false);
    expect(
      resolveHubTransferEnabled({ hubTransfer: { enabledHubCategories: ['train'] } }, 'airport')
    ).toBe(false);
    expect(resolveHubTransferEnabled({ hubTransfer: { enabledHubCategories: [] } }, 'airport')).toBe(
      false
    );
  });
});
