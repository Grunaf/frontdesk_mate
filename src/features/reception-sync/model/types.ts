import type { ReceptionOperationalContext as ReceptionOperationalContextBase } from './receptionOperationalContext';

export type ReceptionOperationalContext = ReceptionOperationalContextBase & {
  actorDisplayName?: string;
};

export const FALLBACK_RECEPTION_ACTOR_LABEL = 'Staff';
