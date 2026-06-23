import { loadEnvConfig } from '@next/env';
import { loadE2eConfig, shouldProvisionGuestStay } from './fixtures';
import { provisionGuestStayForSmoke } from './lib/provisionGuestStay';
import { clearSmokeSession, writeSmokeSession } from './lib/smokeRuntime';

export default async function globalSetup(): Promise<void> {
  loadEnvConfig(process.cwd());
  clearSmokeSession();

  const config = loadE2eConfig({ allowMissingGuestPin: true });

  if (!shouldProvisionGuestStay()) {
    if (!config.guestPin) {
      throw new Error(
        'E2E_PROVISION_GUEST_STAY=false but E2E_GUEST_PIN is missing. Set E2E_GUEST_PIN in e2e/env.local or enable provisioning.'
      );
    }
    return;
  }

  const session = await provisionGuestStayForSmoke({
    tenantSlug: config.tenantSlug,
    locale: config.locale,
    bedId: process.env.E2E_GUEST_BED_ID,
  });

  if (!session) {
    if (config.guestPin) {
      console.warn('[e2e provision] failed — falling back to E2E_GUEST_PIN from env');
      return;
    }

    throw new Error(
      'Could not provision smoke guest stay. Check Supabase keys in .env.local and beds on E2E_TENANT_SLUG, or set E2E_GUEST_PIN manually.'
    );
  }

  writeSmokeSession(session);
}
