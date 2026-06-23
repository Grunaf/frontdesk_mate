import { describe, expect, it } from 'vitest';
import { resolveSettlementCopyVariant } from './resolveSettlementCopyVariant';

describe('resolveSettlementCopyVariant', () => {
  it('maps guest intent to settlement copy variants', () => {
    expect(resolveSettlementCopyVariant(null)).toBe('planning');
    expect(resolveSettlementCopyVariant('planning')).toBe('planning');
    expect(resolveSettlementCopyVariant('at_door')).toBe('atDoor');
    expect(resolveSettlementCopyVariant('at_desk')).toBe('atDesk');
  });
});
