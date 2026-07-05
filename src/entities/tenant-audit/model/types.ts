export type TenantAuditActorKind = 'owner' | 'platform';

export type TenantAuditEventType = 'settings_updated' | 'tenant_created';

export type TenantAuditEventFlags = {
  deskPinChanged?: boolean;
  nameChanged?: boolean;
  returnTo?: string;
  cityPackId?: string;
};

export type InsertTenantAuditEventInput = {
  tenantId: string;
  actorKind: TenantAuditActorKind;
  actorUserId: string | null;
  eventType: TenantAuditEventType;
  changedKeys: string[];
  flags?: TenantAuditEventFlags;
};
