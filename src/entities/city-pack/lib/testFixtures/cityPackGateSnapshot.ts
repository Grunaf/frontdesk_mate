import type { CityPackGateSnapshot } from '@/entities/city-pack';

export const sarajevoReadyGateSnapshot: CityPackGateSnapshot = {
  sarajevo: {
    readyForTenants: true,
    notReadyReason: null,
    placesCount: 12,
    routesGateMet: true,
    status: 'ready',
  },
};

export const kotorDraftGateSnapshot: CityPackGateSnapshot = {
  kotor: {
    readyForTenants: false,
    notReadyReason: 'Publish the city pack when content is complete.',
    placesCount: 2,
    routesGateMet: false,
    status: 'draft',
  },
};
