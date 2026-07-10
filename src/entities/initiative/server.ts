import 'server-only';

import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { buildInitiativeStaleSnapshot } from './model/stale';
import type {
  CreateInitiativeInput,
  Initiative,
  InitiativeErrorCode,
  InitiativeErrorPayload,
  InitiativeFieldError,
  InitiativeListInput,
  InitiativeListItem,
  InitiativeListOutput,
  InitiativeStaleSnapshot,
  InitiativeMutationResult,
  InitiativeWarning,
  RecalculateInitiativesInput,
  UpdateInitiativePatch,
} from './model/types';

const MAX_TITLE = 140;
const MIN_TITLE = 3;
const MAX_SUMMARY = 2000;
const MAX_SPEC = 30000;
const MAX_TAGS = 10;
const MAX_TRACKED_PATHS = 50;
const MAX_RELATED_FILES = 100;
const MAX_LIST_LIMIT = 200;
const DEFAULT_LIST_LIMIT = 50;

export class InitiativeServiceError extends Error {
  code: InitiativeErrorCode;
  fieldErrors: InitiativeFieldError[];

  constructor(
    code: InitiativeErrorCode,
    message: string,
    fieldErrors: InitiativeFieldError[] = []
  ) {
    super(message);
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  toPayload(): InitiativeErrorPayload {
    return {
      code: this.code,
      message: this.message,
      fieldErrors: this.fieldErrors,
    };
  }
}

const initiativeStore = new Map<string, Initiative>([
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
      relatedFiles: [],
      tags: ['check-in', 'tourism-registration'],
      lastReviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 35).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      staleScore: 0,
      isStale: false,
      staleReason: [],
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
      relatedFiles: [],
      tags: ['admin', 'city-pack'],
      lastReviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 17).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
      staleScore: 0,
      isStale: false,
      staleReason: [],
    },
  ],
  [
    'guest-ui-system-first-refactor',
    {
      id: 'guest-ui-system-first-refactor',
      title: 'Guest UI system-first refactor for shared styling primitives',
      priority: 'P1',
      status: 'idea',
      summary:
        'Перевести ключевые guest UI-компоненты на system-first подход (tokens/theme/shared UI) без изменения текущего масштаба и кегля.',
      spec: `Проблема:
Локальные ad-hoc стили в guest UI усложняют масштабные изменения и повышают стоимость поддержки.

Цель:
Систематизировать стилизацию в выбранных компонентах через общие токены, семантические классы и переиспользуемые UI-примитивы без визуального resize.

Scope:
- src/views/arrival-journey/ui/ArrivalJourneyCoordinator.tsx
- src/features/guest-tourism-registration/ui/TourismRegistrationPanel.tsx
- src/features/stay-essentials/ui/StayEssentialsReceptionSheet.tsx
- src/features/hostel-rules/ui/HostelRules.tsx

Out of scope:
- Изменение кегля/размеров/плотности интерфейса.
- Изменение бизнес-логики, API-контрактов и UX-флоу.
- Рефакторинг файлов вне согласованного списка без отдельного апрува.

Acceptance:
- Устранены новые ad-hoc значения типографики/spacing/цветов в целевых компонентах.
- Повторяемые UI-паттерны унифицированы через shared/system слой там, где это уместно.
- Визуальное поведение сохранено (pixel-close), без намеренного изменения масштаба.
- Зафиксированы legacy-исключения (если останутся) с обоснованием.`,
      trackedPaths: [
        'src/views/arrival-journey/ui/ArrivalJourneyCoordinator.tsx',
        'src/features/guest-tourism-registration/ui/TourismRegistrationPanel.tsx',
        'src/features/stay-essentials/ui/StayEssentialsReceptionSheet.tsx',
        'src/features/hostel-rules/ui/HostelRules.tsx',
      ],
      relatedFiles: [],
      tags: ['guest-app', 'ui-system-first', 'refactor'],
      lastReviewedAt: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      staleScore: 0,
      isStale: false,
      staleReason: [],
    },
  ],
  [
    'stay-setup-status-ssr',
    {
      id: 'stay-setup-status-ssr',
      title: 'Stay setup status: SSR initial + banner skeleton',
      priority: 'P1',
      status: 'planned',
      summary:
        'Убрать задержку появления registration/settlement баннеров и повторные client-fetch статуса tourism/contact на concierge, sheet и смежных экранах.',
      spec: `Проблема:
Статус registration (tourism + contact) подтягивается после mount через getStaySetupStatusAction; до ответа баннеры рендерят null, tourism-блок грузится с задержкой — гость может пропустить CTA.

Цель:
1) Общий server resolver stay-setup status (как на stay-setup/registration page) и initial props на concierge (и при необходимости app layout).
2) Client revalidate после save, не единственный источник truth.
3) Skeleton на баннерах, пока статус неизвестен (без layout shift).

Scope:
- src/features/guest-stay-contact (getStaySetupStatusAction / shared server helper)
- src/features/stay-essentials/ui/StayEssentialsPreCheckInBanner.tsx
- src/features/stay-essentials/ui/StayEssentialsSettlementBanner.tsx
- src/features/stay-essentials/ui/StayEssentialsConciergeBannerLayout.tsx
- src/views/concierge/ui/ConciergeContent.tsx
- app-site concierge page (SSR initial)
- src/features/guest-stay-chip/ui/GuestStaySheet.tsx (по возможности тот же context/initial)
- src/features/find-your-bed (useStaySetupBedMapStep) — опционально в фазе 2

Out of scope:
- Полный перенос settlement progress из localStorage на сервер.
- Рефактор tourism upload UX.

Acceptance:
- Concierge: баннер виден на первом paint (SSR) или skeleton, не «пусто → через секунды».
- Один resolver, меньше дублирующих useEffect fetch.
- Unit-тесты resolve* banner остаются зелёными.`,
      trackedPaths: [
        'src/features/guest-stay-contact',
        'src/features/stay-essentials',
        'src/views/concierge',
        'src/app/app-site',
        'src/features/guest-stay-chip/ui/GuestStaySheet.tsx',
        'src/features/find-your-bed',
        'src/views/stay-setup/model/useStaySetupCompletionSync.ts',
      ],
      relatedFiles: [],
      tags: ['guest-app', 'stay-setup', 'registration', 'performance'],
      lastReviewedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      staleScore: 0,
      isStale: false,
      staleReason: [],
    },
  ],
]);

let initiativeIdCounter = 0;

function generateInitiativeId(): string {
  initiativeIdCounter = (initiativeIdCounter + 1) % Number.MAX_SAFE_INTEGER;
  const timestamp = Date.now().toString(36);
  const counter = initiativeIdCounter.toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `initiative-${timestamp}-${counter}-${random}`;
}

function normalizePath(raw: string): string {
  return raw.trim().replaceAll('\\', '/').replace(/\/+/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function normalizeStringArray(values: string[] | undefined, limit: number): string[] {
  if (!values) return [];
  return dedupeStrings(
    values.map((item) => item.trim()).filter((item) => item.length > 0).slice(0, limit)
  );
}

function normalizePathArray(values: string[] | undefined, limit: number): string[] {
  if (!values) return [];
  return dedupeStrings(
    values.map(normalizePath).filter((item) => item.length > 0).slice(0, limit)
  );
}

function buildPatternWarnings(trackedPaths: string[]): InitiativeWarning[] {
  const warnings: InitiativeWarning[] = [];
  for (const trackedPath of trackedPaths) {
    const hasInvalidChars = /[<>"|]/.test(trackedPath);
    if (hasInvalidChars) {
      warnings.push({
        code: 'invalid_tracked_path_pattern',
        field: 'trackedPaths',
        value: trackedPath,
        message: `Tracked path pattern "${trackedPath}" contains unsupported characters.`,
      });
    }
    const isOverlyBroadPattern = trackedPath === '*' || trackedPath === '**' || trackedPath.includes('**');
    if (isOverlyBroadPattern) {
      warnings.push({
        code: 'invalid_tracked_path_pattern',
        field: 'trackedPaths',
        value: trackedPath,
        message: `Tracked path pattern "${trackedPath}" is too broad and may cause stale false positives.`,
      });
    }
  }
  return warnings;
}

function assertCreateInput(input: CreateInitiativeInput): void {
  const title = input.title.trim();
  if (title.length < MIN_TITLE || title.length > MAX_TITLE) {
    throw new InitiativeServiceError('validation_error', 'Validation failed', [
      { field: 'title', message: 'Title must be between 3 and 140 characters.' },
    ]);
  }
  const summary = input.summary.trim();
  if (summary.length === 0 || summary.length > MAX_SUMMARY) {
    throw new InitiativeServiceError('validation_error', 'Validation failed', [
      { field: 'summary', message: 'Summary must be between 1 and 2000 characters.' },
    ]);
  }
  if ((input.spec ?? '').length > MAX_SPEC) {
    throw new InitiativeServiceError('payload_too_large', 'Spec exceeds 30000 characters');
  }
  const trackedPaths = normalizePathArray(input.trackedPaths, MAX_TRACKED_PATHS);
  if (trackedPaths.length === 0) {
    throw new InitiativeServiceError('validation_error', 'Validation failed', [
      { field: 'trackedPaths', message: 'At least one tracked path is required.' },
    ]);
  }
}

function assertPatchInput(patch: UpdateInitiativePatch): void {
  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (title.length < MIN_TITLE || title.length > MAX_TITLE) {
      throw new InitiativeServiceError('validation_error', 'Validation failed', [
        { field: 'title', message: 'Title must be between 3 and 140 characters.' },
      ]);
    }
  }
  if (patch.summary !== undefined) {
    const summary = patch.summary.trim();
    if (summary.length === 0 || summary.length > MAX_SUMMARY) {
      throw new InitiativeServiceError('validation_error', 'Validation failed', [
        { field: 'summary', message: 'Summary must be between 1 and 2000 characters.' },
      ]);
    }
  }
  if (patch.spec !== undefined && patch.spec.length > MAX_SPEC) {
    throw new InitiativeServiceError('payload_too_large', 'Spec exceeds 30000 characters');
  }
  if (patch.trackedPaths !== undefined) {
    const trackedPaths = normalizePathArray(patch.trackedPaths, MAX_TRACKED_PATHS);
    if (trackedPaths.length === 0) {
      throw new InitiativeServiceError('validation_error', 'Validation failed', [
        { field: 'trackedPaths', message: 'At least one tracked path is required.' },
      ]);
    }
  }
  if (patch.lastReviewedAt !== undefined && patch.lastReviewedAt !== null) {
    const parsed = new Date(patch.lastReviewedAt);
    if (!Number.isFinite(parsed.getTime())) {
      throw new InitiativeServiceError('validation_error', 'Validation failed', [
        { field: 'lastReviewedAt', message: 'lastReviewedAt must be a valid ISO date or null.' },
      ]);
    }
  }
}

function resolvePathRootsForScan(trackedPath: string): string[] {
  const wildcardIndex = trackedPath.search(/[*?{]/);
  if (wildcardIndex === -1) {
    return [trackedPath];
  }
  const staticPrefix = trackedPath.slice(0, wildcardIndex).replace(/\/$/, '');
  return [staticPrefix || '.'];
}

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

async function countChangesAfterReview(
  trackedPaths: string[],
  referenceTs: string
): Promise<number> {
  const reviewedAtMs = new Date(referenceTs).getTime();
  if (!Number.isFinite(reviewedAtMs)) {
    return 0;
  }

  const workspaceRoot = process.cwd();
  const perPath = await Promise.allSettled(
    trackedPaths.flatMap((trackedPath) =>
      resolvePathRootsForScan(trackedPath).map((scanRoot) => {
        const absPath = path.resolve(workspaceRoot, scanRoot);
        return countChangedFilesInPath(absPath, reviewedAtMs);
      })
    )
  );
  return perPath.reduce((acc, result) => {
    if (result.status === 'fulfilled') {
      return acc + result.value;
    }
    return acc;
  }, 0);
}

function applyListFilters(
  items: InitiativeListItem[],
  input: InitiativeListInput = {}
): InitiativeListItem[] {
  const search = input.search?.trim().toLowerCase();
  const tag = input.tag?.trim().toLowerCase();
  return items.filter((item) => {
    if (input.status && input.status.length > 0 && !input.status.includes(item.status)) {
      return false;
    }
    if (input.priority && input.priority.length > 0 && !input.priority.includes(item.priority)) {
      return false;
    }
    if (input.onlyStale && !item.isStale) {
      return false;
    }
    if (tag && !item.tags.some((itemTag) => itemTag.toLowerCase() === tag)) {
      return false;
    }
    if (search) {
      const haystack = `${item.title}\n${item.summary}\n${item.tags.join(' ')}`.toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }
    return true;
  });
}

function comparePriority(a: Initiative['priority'], b: Initiative['priority']): number {
  const order: Record<Initiative['priority'], number> = { P0: 0, P1: 1, P2: 2 };
  return order[a] - order[b];
}

function sortListItems(items: InitiativeListItem[]): InitiativeListItem[] {
  return [...items].sort((a, b) => {
    if (a.isStale !== b.isStale) {
      return a.isStale ? -1 : 1;
    }
    const priorityOrder = comparePriority(a.priority, b.priority);
    if (priorityOrder !== 0) {
      return priorityOrder;
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function projectInitiativeWithStale(
  initiative: Initiative,
  stale: InitiativeStaleSnapshot
): InitiativeListItem {
  return {
    ...initiative,
    staleScore: stale.staleScore,
    isStale: stale.isStale,
    staleReason: stale.staleReason,
    freshness: stale.freshness,
    changesCount: stale.changesCount,
    daysSinceReview: stale.daysSinceReview,
  };
}

async function withStale(initiative: Initiative): Promise<InitiativeListItem> {
  const referenceTs = initiative.lastReviewedAt ?? initiative.createdAt;
  const changesCount = await countChangesAfterReview(initiative.trackedPaths, referenceTs);
  const stale = buildInitiativeStaleSnapshot({
    createdAt: initiative.createdAt,
    lastReviewedAt: initiative.lastReviewedAt,
    changesCount,
  });
  return projectInitiativeWithStale(initiative, stale);
}

async function recalculateAndPersist(initiative: Initiative): Promise<InitiativeListItem> {
  const item = await withStale(initiative);
  initiativeStore.set(initiative.id, {
    ...initiative,
    staleScore: item.staleScore,
    isStale: item.isStale,
    staleReason: item.staleReason,
    updatedAt: new Date().toISOString(),
  });
  return item;
}

export function toInitiativeErrorPayload(error: unknown): InitiativeErrorPayload {
  if (error instanceof InitiativeServiceError) {
    return error.toPayload();
  }
  if (error instanceof Error) {
    return { code: 'internal_error', message: error.message, fieldErrors: [] };
  }
  return { code: 'internal_error', message: 'Unknown error', fieldErrors: [] };
}

export async function listInitiatives(input: InitiativeListInput = {}): Promise<InitiativeListOutput> {
  const limit = Math.min(Math.max(1, input.limit ?? DEFAULT_LIST_LIMIT), MAX_LIST_LIMIT);
  const offset = Math.max(0, input.offset ?? 0);
  const items = await Promise.all(Array.from(initiativeStore.values()).map(withStale));
  const filtered = applyListFilters(items, input);
  const sorted = sortListItems(filtered);
  return { items: sorted.slice(offset, offset + limit), total: sorted.length };
}

export async function createInitiative(input: CreateInitiativeInput): Promise<InitiativeMutationResult> {
  assertCreateInput(input);
  const nowIso = new Date().toISOString();
  const trackedPaths = normalizePathArray(input.trackedPaths, MAX_TRACKED_PATHS);
  const initiative: Initiative = {
    id: generateInitiativeId(),
    title: input.title.trim(),
    status: input.status ?? 'idea',
    priority: input.priority ?? 'P1',
    summary: input.summary.trim(),
    spec: (input.spec ?? '').trim(),
    trackedPaths,
    relatedFiles: normalizePathArray(input.relatedFiles, MAX_RELATED_FILES),
    tags: normalizeStringArray(input.tags, MAX_TAGS),
    lastReviewedAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
    staleScore: 0,
    isStale: false,
    staleReason: [],
  };
  initiativeStore.set(initiative.id, initiative);
  const item = await recalculateAndPersist(initiative);
  return { item, warnings: buildPatternWarnings(trackedPaths) };
}

export async function updateInitiative(id: string, patch: UpdateInitiativePatch): Promise<InitiativeMutationResult> {
  const current = initiativeStore.get(id);
  if (!current) {
    throw new InitiativeServiceError('not_found', 'Initiative not found');
  }
  assertPatchInput(patch);
  const next: Initiative = {
    ...current,
    ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
    ...(patch.summary !== undefined ? { summary: patch.summary.trim() } : {}),
    ...(patch.spec !== undefined ? { spec: patch.spec.trim() } : {}),
    ...(patch.trackedPaths !== undefined
      ? { trackedPaths: normalizePathArray(patch.trackedPaths, MAX_TRACKED_PATHS) }
      : {}),
    ...(patch.relatedFiles !== undefined
      ? { relatedFiles: normalizePathArray(patch.relatedFiles, MAX_RELATED_FILES) }
      : {}),
    ...(patch.tags !== undefined ? { tags: normalizeStringArray(patch.tags, MAX_TAGS) } : {}),
    ...(patch.lastReviewedAt !== undefined ? { lastReviewedAt: patch.lastReviewedAt } : {}),
    updatedAt: new Date().toISOString(),
  };
  initiativeStore.set(id, next);
  const mustRecalculate =
    patch.trackedPaths !== undefined ||
    patch.status !== undefined ||
    patch.lastReviewedAt !== undefined;
  const item = mustRecalculate ? await recalculateAndPersist(next) : await withStale(next);
  const warnings = patch.trackedPaths !== undefined ? buildPatternWarnings(next.trackedPaths) : [];
  return { item, warnings };
}

export async function markInitiativeReviewed(id: string): Promise<InitiativeListItem> {
  const current = initiativeStore.get(id);
  if (!current) {
    throw new InitiativeServiceError('not_found', 'Initiative not found');
  }
  const reviewed = {
    ...current,
    lastReviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  initiativeStore.set(id, reviewed);
  return recalculateAndPersist(reviewed);
}

export async function recalculateInitiativesStale(
  input: RecalculateInitiativesInput = {}
): Promise<{ processed: number; changed: number }> {
  const limit = Math.min(Math.max(1, input.limit ?? MAX_LIST_LIMIT), MAX_LIST_LIMIT);
  const allItems = await Promise.all(Array.from(initiativeStore.values()).map(withStale));
  const filtered = allItems
    .filter((item) => (input.ids ? input.ids.includes(item.id) : true))
    .filter((item) => (input.status ? input.status.includes(item.status) : true))
    .filter((item) => (input.onlyStale ? item.isStale : true))
    .slice(0, limit);

  let changed = 0;
  for (const item of filtered) {
    const existing = initiativeStore.get(item.id);
    if (!existing) continue;
    const previousSignature = `${existing.staleScore}|${existing.isStale}|${existing.staleReason.join('|')}`;
    const recalculated = await recalculateAndPersist(existing);
    const nextSignature = `${recalculated.staleScore}|${recalculated.isStale}|${recalculated.staleReason.join('|')}`;
    if (nextSignature !== previousSignature) {
      changed += 1;
    }
  }

  return { processed: filtered.length, changed };
}

export async function getInitiative(id: string): Promise<InitiativeListItem | null> {
  const initiative = initiativeStore.get(id);
  if (!initiative) return null;
  return withStale(initiative);
}

// Compatibility wrappers for current admin pages/actions.
export async function listInitiativesForAdmin(onlyStale = false): Promise<{
  rows: InitiativeListItem[];
  error: InitiativeErrorPayload | null;
}> {
  try {
    const { items } = await listInitiatives({ onlyStale, limit: MAX_LIST_LIMIT, offset: 0 });
    return { rows: items, error: null };
  } catch (error) {
    return { rows: [], error: toInitiativeErrorPayload(error) };
  }
}

export async function getInitiativeForAdmin(id: string): Promise<{
  initiative: (Initiative & InitiativeStaleSnapshot) | null;
  error: InitiativeErrorPayload | null;
}> {
  try {
    const initiative = await getInitiative(id);
    return { initiative, error: null };
  } catch (error) {
    return { initiative: null, error: toInitiativeErrorPayload(error) };
  }
}

export async function markInitiativeAsReviewed(id: string): Promise<{
  ok: boolean;
  error?: InitiativeErrorPayload;
}> {
  try {
    await markInitiativeReviewed(id);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toInitiativeErrorPayload(error) };
  }
}

export async function recalculateInitiativesForAdmin(): Promise<{
  ok: boolean;
  error?: InitiativeErrorPayload;
}> {
  try {
    await recalculateInitiativesStale();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toInitiativeErrorPayload(error) };
  }
}
