import type { HubTransferDirection } from '@/entities/guest-hub-transfer';

export const HubTransferSurfaceContext = {
  arrival: 'arrival',
} as const;

export type HubTransferSurface =
  (typeof HubTransferSurfaceContext)[keyof typeof HubTransferSurfaceContext];

export type HubTransferDateHintKind = 'check_in' | 'check_out';

export type ResolvedHubTransferContext = {
  defaultDirection: HubTransferDirection;
  dateHintKindByDirection: Record<HubTransferDirection, HubTransferDateHintKind>;
};

export function resolveHubTransferContext(surface: HubTransferSurface): ResolvedHubTransferContext {
  switch (surface) {
    case HubTransferSurfaceContext.arrival:
      return {
        defaultDirection: 'to_hostel',
        dateHintKindByDirection: {
          to_hostel: 'check_in',
          from_hostel: 'check_out',
        },
      };
    default: {
      const _exhaustive: never = surface;
      return _exhaustive;
    }
  }
}
