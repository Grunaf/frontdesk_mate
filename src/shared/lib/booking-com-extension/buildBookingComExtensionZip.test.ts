import { describe, expect, it } from 'vitest';
import { buildStoreZip } from './buildStoreZip';

describe('buildStoreZip', () => {
  it('produces a ZIP local-file signature and embeds filenames', () => {
    const zip = buildStoreZip([
      { name: 'manifest.json', data: Buffer.from('{"version":"0.1.0"}', 'utf8') },
      { name: 'popup.js', data: Buffer.from('console.log(1)', 'utf8') },
    ]);

    expect(zip.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBe(true);
    expect(zip.includes(Buffer.from('manifest.json'))).toBe(true);
    expect(zip.includes(Buffer.from('popup.js'))).toBe(true);
    expect(zip.includes(Buffer.from('{"version":"0.1.0"}'))).toBe(true);
  });
});
