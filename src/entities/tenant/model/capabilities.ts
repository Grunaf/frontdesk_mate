export const APP_MODULES = [
  'arrivalRoutes',
  'preTripInfo',
  'doorAccess',
  'doorPhotos',
  'roomMap',
  'localGuide',
  'nightAccess',
  'faq',
  'memories',
  'landing',
  'booking',
] as const;

export type AppModule = (typeof APP_MODULES)[number];

export type ModuleStatus = 'ready' | 'preview' | 'hidden';

export type TenantCapabilities = Record<AppModule, ModuleStatus>;
