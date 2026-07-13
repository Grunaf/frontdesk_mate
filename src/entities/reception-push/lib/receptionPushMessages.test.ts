import { describe, expect, it } from 'vitest';
import { buildGuestIssuePushPayload } from './receptionPushMessages';

describe('buildGuestIssuePushPayload', () => {
  it('maps category and guest name', () => {
    expect(
      buildGuestIssuePushPayload({ category: 'wifi', guestName: 'Alex' })
    ).toMatchObject({
      title: 'New guest issue',
      body: 'Wi‑Fi — Alex',
      url: '/?tab=issues',
    });
  });
});
