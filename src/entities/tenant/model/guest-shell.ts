import type { HostelContactLink } from './hostel-config';
import type { TenantLifecycleStatus } from '../lib/resolveTenantLifecycle';

export type TenantOfflineLifecycleStatus = Exclude<TenantLifecycleStatus, 'active'>;

export interface TenantGuestShellContacts {
  phone: HostelContactLink;
  email: {
    display?: string;
    href: string;
  };
  receptionWhatsapp: HostelContactLink;
  whatsappEnabled: boolean;
}

export interface TenantGuestShell {
  slug: string;
  name: string;
  lifecycleStatus: TenantOfflineLifecycleStatus;
  subscriptionStartsAt: string | null;
  contacts: TenantGuestShellContacts;
}
