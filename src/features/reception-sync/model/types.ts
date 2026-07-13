import type { ReceptionOperationalContext as ReceptionOperationalContextBase } from './receptionOperationalContext';

export type ReceptionOperationalContext = ReceptionOperationalContextBase & {
  actorDisplayName?: string;
};

export const LEGACY_RECEPTION_ACTOR_LABEL = 'Desk PIN';
