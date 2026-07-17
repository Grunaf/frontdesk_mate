import 'server-only';

export {
  getPlatformAiSettings,
  setPlatformAiProvider,
} from './api/platformAiSettingsRepository';
export type {
  GetPlatformAiSettingsResult,
  PlatformAiProvider,
  PlatformAiSettings,
  SetPlatformAiProviderResult,
} from './model/types';
