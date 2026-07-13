export interface WebPushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface WebPushSubscriptionJson {
  endpoint: string;
  expirationTime: number | null;
  keys: WebPushSubscriptionKeys;
}

export interface ReceptionPushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

export interface ReceptionPushSubscriptionRecord {
  id: string;
  tenant_id: string;
  endpoint: string;
  subscription: WebPushSubscriptionJson;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}
