import 'server-only';

export {
  isReceptionWebPushConfigured,
  listReceptionPushSubscriptions,
  notifyReceptionDesk,
  sendReceptionPushToTenant,
  upsertReceptionPushSubscription,
} from './api/receptionPushRepository';
export type {
  ReceptionPushPayload,
  ReceptionPushSubscriptionRecord,
  WebPushSubscriptionJson,
} from './model/types';
