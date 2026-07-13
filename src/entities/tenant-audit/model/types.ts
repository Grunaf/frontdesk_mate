export type TenantAuditActorKind = 'owner' | 'platform';

export type TenantAuditEventType =
  | 'settings_updated'
  | 'tenant_created'
  | 'reception_staff_user_created'
  | 'reception_staff_user_disabled'
  | 'reception_staff_pin_changed';

export type TenantAuditEventFlags = {
  nameChanged?: boolean;
  returnTo?: string;
  cityPackId?: string;
  receptionUserId?: string;
};

export type InsertTenantAuditEventInput = {
  tenantId: string;
  actorKind: TenantAuditActorKind;
  actorUserId: string | null;
  eventType: TenantAuditEventType;
  changedKeys: string[];
  flags?: TenantAuditEventFlags;
};
