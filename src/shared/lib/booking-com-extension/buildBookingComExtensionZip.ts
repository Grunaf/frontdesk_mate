import 'server-only';

import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { buildStoreZip } from './buildStoreZip';

const EXTENSION_DIR = path.join(process.cwd(), 'extensions', 'booking-com-sync');

const ALLOWED_FILES = [
  'manifest.json',
  'background.js',
  'content.js',
  'page-hook.js',
  'popup.html',
  'popup.js',
  'popup.css',
] as const;

export type BookingComExtensionZip = {
  buffer: Buffer;
  filename: string;
  version: string;
  contentHash: string;
};

export async function buildBookingComExtensionZip(): Promise<BookingComExtensionZip> {
  const files: { name: string; data: Buffer }[] = [];

  for (const name of ALLOWED_FILES) {
    const fullPath = path.join(EXTENSION_DIR, name);
    const data = await fs.readFile(fullPath);
    files.push({ name, data });
  }

  const manifestRaw = files.find((f) => f.name === 'manifest.json')?.data.toString('utf8') ?? '{}';
  const manifest = JSON.parse(manifestRaw) as { version?: string };
  const version =
    typeof manifest.version === 'string' && manifest.version.trim()
      ? manifest.version.trim()
      : '0.0.0';

  const buffer = buildStoreZip(files);
  const contentHash = createHash('sha256').update(buffer).digest('hex').slice(0, 12);

  return {
    buffer,
    filename: `frontdesk-booking-com-sync-v${version}.zip`,
    version,
    contentHash,
  };
}

export function bookingComExtensionZipResponse(zip: BookingComExtensionZip): Response {
  return new Response(new Uint8Array(zip.buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zip.filename}"`,
      'Cache-Control': 'no-store',
      'X-Content-Hash': zip.contentHash,
    },
  });
}
