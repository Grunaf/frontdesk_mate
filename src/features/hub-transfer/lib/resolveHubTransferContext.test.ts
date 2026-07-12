import { describe, expect, it } from 'vitest';
import {
  HubTransferSurfaceContext,
  resolveHubTransferContext,
} from './resolveHubTransferContext';

describe('resolveHubTransferContext', () => {
  it('defaults arrival surface to from_hostel with direction-specific date hints', () => {
    const ctx = resolveHubTransferContext(HubTransferSurfaceContext.arrival);

    expect(ctx.defaultDirection).toBe('from_hostel');
    expect(ctx.dateHintKindByDirection).toEqual({
      to_hostel: 'check_in',
      from_hostel: 'check_out',
    });
  });
});
