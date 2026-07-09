import { mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  createInitiative,
  getInitiative,
  listInitiatives,
  markInitiativeReviewed,
  updateInitiative,
} from './server';

const createdTempDirs: string[] = [];

async function createTrackedFile(name: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'initiative-test-'));
  createdTempDirs.push(dir);
  const filePath = path.join(dir, name);
  await writeFile(filePath, 'seed');
  return filePath;
}

afterAll(async () => {
  await Promise.all(createdTempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('initiative server', () => {
  it('validates required fields for create', async () => {
    await expect(
      createInitiative({
        title: 'x',
        summary: 'ok',
        trackedPaths: ['src/entities/initiative'],
      })
    ).rejects.toMatchObject({
      code: 'validation_error',
      fieldErrors: [{ field: 'title' }],
    });

    await expect(
      createInitiative({
        title: 'Valid title',
        summary: 'ok',
        trackedPaths: [],
      })
    ).rejects.toMatchObject({
      code: 'validation_error',
      fieldErrors: [{ field: 'trackedPaths' }],
    });
  });

  it('resets stale after review and gets stale again on new change', async () => {
    const trackedPath = `tmp/non-existent-${Date.now()}`;
    const created = await createInitiative({
      title: `qa-freshness-${Date.now()}`,
      summary: 'validate stale transitions',
      trackedPaths: [trackedPath],
      status: 'in_progress',
      priority: 'P1',
    });

    expect(created.item.isStale).toBe(true);
    const reviewed = await markInitiativeReviewed(created.item.id);
    expect(reviewed.isStale).toBe(false);

    // Simulate new tracked-path changes after review by shifting review timestamp backward.
    const reviewInPast = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const updatedAfterChange = await updateInitiative(created.item.id, {
      lastReviewedAt: reviewInPast,
      trackedPaths: ['src/entities/initiative/model/stale.ts'],
    });
    expect(updatedAfterChange.item.isStale).toBe(true);
    expect(updatedAfterChange.item.staleReason.some((reason) => reason.includes('Tracked paths changed'))).toBe(
      true
    );
  });

  it('combines filters and keeps default stale-priority-updated sorting', async () => {
    const token = `qa-sort-${Date.now()}`;
    const missingTrackedPath = `tmp/non-existent-sort-${Date.now()}`;

    const staleP0 = await createInitiative({
      title: `${token}-stale-p0`,
      summary: `${token} stale`,
      trackedPaths: [missingTrackedPath],
      priority: 'P0',
      status: 'in_progress',
      tags: [token],
    });
    const staleP1 = await createInitiative({
      title: `${token}-stale-p1`,
      summary: `${token} stale`,
      trackedPaths: [missingTrackedPath],
      priority: 'P1',
      status: 'in_progress',
      tags: [token],
    });
    const freshP0 = await createInitiative({
      title: `${token}-fresh-p0`,
      summary: `${token} fresh`,
      trackedPaths: [missingTrackedPath],
      priority: 'P0',
      status: 'done',
      tags: [token],
    });
    await markInitiativeReviewed(freshP0.item.id);

    const fullList = await listInitiatives({ tag: token, limit: 20 });
    const idsByOrder = fullList.items.map((item) => item.id);
    expect(idsByOrder).toContain(staleP0.item.id);
    expect(idsByOrder).toContain(staleP1.item.id);
    expect(idsByOrder).toContain(freshP0.item.id);
    expect(idsByOrder.indexOf(staleP0.item.id)).toBeLessThan(idsByOrder.indexOf(staleP1.item.id));
    expect(idsByOrder.indexOf(staleP1.item.id)).toBeLessThan(idsByOrder.indexOf(freshP0.item.id));

    const onlyStale = await listInitiatives({ tag: token, onlyStale: true, limit: 20 });
    expect(onlyStale.items.some((item) => item.id === freshP0.item.id)).toBe(false);

    const combined = await listInitiatives({
      tag: token,
      priority: ['P0'],
      status: ['in_progress'],
      onlyStale: true,
      limit: 20,
    });
    expect(combined.items).toHaveLength(1);
    expect(combined.items[0]?.id).toBe(staleP0.item.id);
  });

  it('returns warning for invalid tracked path pattern', async () => {
    const result = await createInitiative({
      title: `qa-pattern-${Date.now()}`,
      summary: 'pattern validation',
      trackedPaths: ['src/**'],
    });

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid_tracked_path_pattern',
          field: 'trackedPaths',
        }),
      ])
    );
  });

  it('supports old reviews without forced stale when no churn', async () => {
    const trackedFile = await createTrackedFile('old-review.ts');
    const created = await createInitiative({
      title: `qa-old-review-${Date.now()}`,
      summary: 'old review scenario',
      trackedPaths: [trackedFile],
    });

    const now = Date.now();
    const oldMtime = new Date(now - 60 * 24 * 60 * 60 * 1000);
    await utimes(trackedFile, oldMtime, oldMtime);
    const oldReviewIso = new Date(Date.now() - 46 * 24 * 60 * 60 * 1000).toISOString();
    const updated = await updateInitiative(created.item.id, { lastReviewedAt: oldReviewIso });
    expect(updated.item.freshness).toBe('warning');
    expect(updated.item.isStale).toBe(false);
  });
});
