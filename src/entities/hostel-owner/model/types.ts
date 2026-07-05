export type TenantOwnerRow = {
  id: string;
  user_id: string;
  tenant_id: string;
  created_at: string;
};

export type OwnerSessionUser = {
  id: string;
  email: string | null;
};

export type OwnerTenantContext = {
  userId: string;
  email: string;
  tenantId: string;
  slug: string;
  name: string;
};
