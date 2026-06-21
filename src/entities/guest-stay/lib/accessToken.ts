import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

export function generateAccessToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashAccessToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function readTokenSecret(): string {
  return (
    process.env.RECEPTION_SESSION_SECRET?.trim() ||
    process.env.GUEST_SESSION_SECRET?.trim() ||
    process.env.ADMIN_SECRET?.trim() ||
    'dev-insecure-secret'
  );
}

function deriveEncryptionKey(): Buffer {
  return createHash('sha256').update(`guest-stay-token:${readTokenSecret()}`).digest();
}

export function encryptAccessToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptAccessToken(payload: string | null | undefined): string | null {
  if (!payload?.trim()) return null;

  try {
    const [ivB64, tagB64, dataB64] = payload.split('.');
    if (!ivB64 || !tagB64 || !dataB64) return null;

    const iv = Buffer.from(ivB64, 'base64url');
    const tag = Buffer.from(tagB64, 'base64url');
    const encrypted = Buffer.from(dataB64, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', deriveEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}
