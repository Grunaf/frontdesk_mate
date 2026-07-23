export type TenantAuditActorKind = 'owner' | 'platform';

export type TenantAuditEventType =
  | 'settings_updated'
  | 'tenant_created'
  | 'owner_linked'
  | 'reception_staff_user_created'
  | 'reception_staff_user_disabled'
  | 'reception_staff_pin_changed'
  | 'reception_staff_permissions_updated';

export type TenantAuditEventFlags = {
  nameChanged?: boolean;
  returnTo?: string;
  cityPackId?: string;
  receptionUserId?: string;
  ownerEmail?: string;
  /** e.g. staff_knowledge_questionnaire */
  source?: string;
};

export type InsertTenantAuditEventInput = {
  tenantId: string;
  actorKind: TenantAuditActorKind;
  actorUserId: string | null;
  eventType: TenantAuditEventType;
  changedKeys: string[];
  flags?: TenantAuditEventFlags;
};
