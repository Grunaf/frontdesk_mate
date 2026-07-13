const RECEPTION_LOGIN_MAX_LENGTH = 64;

export function normalizeReceptionLogin(login: string): string {
  return login.trim().toLowerCase();
}

export function isReceptionLoginValid(login: string): boolean {
  const normalized = normalizeReceptionLogin(login);
  if (!normalized || normalized.length > RECEPTION_LOGIN_MAX_LENGTH) {
    return false;
  }
  return /^[a-z0-9._-]+$/.test(normalized);
}
