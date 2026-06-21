import { loadE2eConfig } from './fixtures';

export default async function globalSetup(): Promise<void> {
  loadE2eConfig();
}
