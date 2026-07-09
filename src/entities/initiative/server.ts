import 'server-only';

import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { buildInitiativeStaleSnapshot } from './model/stale';
import type { InitiativeCard, InitiativeListItem, InitiativeStaleSnapshot } from './model/types';

const initiativeStore = new Map<string, InitiativeCard>([
  [
    'guest-registration-v2',
    {
      id: 'guest-registration-v2',
      title: 'Guest registration flow v2',
      priority: 'P0',
      status: 'in_progress',
      summary: 'Сократить drop-off на шаге загрузки документов.',
      spec: 'Упростить шаги, улучшить подсказки и сделать понятнее ошибки загрузки.',
      trackedPaths: [
        'src/features/guest-tourism-registration',
        'src/features/guest-check-in',
        'src/shared/i18n/en.json',
      ],
      lastReviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    },
  ],
  [
    'city-pack-readiness',
    {
      id: 'city-pack-readiness',
      title: 'City pack readiness improvements',
      priority: 'P1',
      status: 'planned',
      summary: 'Упростить проверку готовности city pack перед publish.',
      spec: 'Единый checklist для places/routes и прозрачные причины блокировки публикации.',
      trackedPaths: ['src/app/admin/(protected)/city-packs', 'src/entities/city-pack'],
      lastReviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    },
  ],
]);

async function countChangedFilesInPath(absPath: string, reviewedAtMs: number): Promise<number> {
  let fileStat;
  try {
    fileStat = await stat(absPath);
  } catch {
    return 0;
  }

  if (fileStat.isFile()) {
    return fileStat.mtimeMs > reviewedAtMs ? 1 : 0;
  }

  if (!fileStat.isDirectory()) {
    return 0;
  }

  let total = 0;
  const entries = await readdir(absPath, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(absPath, entry.name);
    if (entry.isDirectory()) {
      total += await countChangedFilesInPath(entryPath, reviewedAtMs);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const entryStat = await stat(entryPath);
    if (entryStat.mtimeMs > reviewedAtMs) {
      total += 1;
    }
  }
  return total;
}

async function countChangedFilesAfterReview(
  trackedPaths: string[],
  lastReviewedAt: string | null
): Promise<number> {
  if (!lastReviewedAt) {
    return 0;
  }
  const reviewedAtMs = new Date(lastReviewedAt).getTime();
  if (!Number.isFinite(reviewedAtMs)) {
    return 0;
  }

  const workspaceRoot = process.cwd();
  const perPath = await Promise.all(
    trackedPaths.map((trackedPath) => {
      const absPath = path.resolve(workspaceRoot, trackedPath);
      return countChangedFilesInPath(absPath, reviewedAtMs);
    })
  );
  return perPath.reduce((acc, value) => acc + value, 0);
}

async function withStale(card: InitiativeCard): Promise<InitiativeListItem> {
  const changedFilesCount = await countChangedFilesAfterReview(card.trackedPaths, card.lastReviewedAt);
  const stale = buildInitiativeStaleSnapshot({
    lastReviewedAt: card.lastReviewedAt,
    changedFilesCount,
  });
  return { ...card, ...stale };
}

export async function listInitiativesForAdmin(onlyStale = false): Promise<{
  rows: InitiativeListItem[];
  error: string | null;
}> {
  try {
    const rows = await Promise.all(Array.from(initiativeStore.values()).map(withStale));
    const filtered = onlyStale ? rows.filter((row) => row.isStale) : rows;
    return { rows: filtered, error: null };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getInitiativeForAdmin(id: string): Promise<{
  initiative: (InitiativeCard & InitiativeStaleSnapshot) | null;
  error: string | null;
}> {
  try {
    const card = initiativeStore.get(id);
    if (!card) {
      return { initiative: null, error: null };
    }
    const item = await withStale(card);
    return { initiative: item, error: null };
  } catch (error) {
    return {
      initiative: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function markInitiativeAsReviewed(id: string): Promise<{ ok: boolean; error?: string }> {
  const card = initiativeStore.get(id);
  if (!card) {
    return { ok: false, error: 'Initiative not found' };
  }
  initiativeStore.set(id, { ...card, lastReviewedAt: new Date().toISOString() });
  return { ok: true };
}

export async function recalculateInitiativesForAdmin(): Promise<{ ok: boolean; error?: string }> {
  try {
    await Promise.all(Array.from(initiativeStore.values()).map(withStale));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
