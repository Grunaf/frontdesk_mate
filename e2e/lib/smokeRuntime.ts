import fs from 'node:fs';
import path from 'node:path';

export interface SmokeSessionRuntime {
  guestPin: string;
  stayId: string;
  tenantSlug: string;
  bedId: string;
  provisionedAt: string;
}

const RUNTIME_DIR = path.join(__dirname, '..', '.runtime');
const RUNTIME_FILE = path.join(RUNTIME_DIR, 'smoke-session.json');

export function readSmokeSession(): SmokeSessionRuntime | null {
  if (!fs.existsSync(RUNTIME_FILE)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(RUNTIME_FILE, 'utf8')) as SmokeSessionRuntime;
    if (!parsed.guestPin || !parsed.tenantSlug) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeSmokeSession(session: SmokeSessionRuntime): void {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  fs.writeFileSync(RUNTIME_FILE, `${JSON.stringify(session, null, 2)}\n`, 'utf8');
}

export function clearSmokeSession(): void {
  if (fs.existsSync(RUNTIME_FILE)) {
    fs.unlinkSync(RUNTIME_FILE);
  }
}
