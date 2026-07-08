import { z } from 'zod';
import type { RouteId } from '@/entities/hostel';
import type {
  TenantLastMileBulkDocument,
  TenantLastMileBulkParseResult,
} from '../model/types';

const ROUTE_IDS = ['airport', 'bus_central', 'bus_istochno', 'train_station'] as const satisfies readonly RouteId[];

const hubSchema = z.object({
  mode: z.enum(['from_get_off', 'walk_only_hub', 'tenant_local_full']),
  walkEn: z.string().optional(),
  tipsEn: z.array(z.string()).max(2).optional(),
  getOffEn: z.string().optional(),
  localMode: z.enum(['walk', 'transit_lite']).optional(),
  titleEn: z.string().optional(),
  summaryEn: z.string().optional(),
  primaryEn: z.string().optional(),
  walkToHostelEn: z.string().optional(),
  mapsOriginLabel: z.string().optional(),
  openQuestions: z
    .array(z.object({ id: z.string().min(1), question: z.string().min(1) }))
    .optional(),
});

const routesSchema = z
  .object({
    airport: hubSchema.optional(),
    bus_central: hubSchema.optional(),
    bus_istochno: hubSchema.optional(),
    train_station: hubSchema.optional(),
  })
  .refine(
    (value) =>
      Boolean(value.airport || value.bus_central || value.bus_istochno || value.train_station),
    { message: 'Include at least one hub under routes.' }
  );

const documentSchema = z.object({
  tenantSlug: z.string().min(1),
  routes: routesSchema,
});

function formatZodError(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) {
    return 'Invalid JSON shape for tenant last mile bulk import.';
  }
  const path = first.path.length ? first.path.join('.') : 'root';
  return `${path}: ${first.message}`;
}

export function parseTenantLastMileBulkJson(raw: string): TenantLastMileBulkParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, message: 'Invalid JSON — use one object only, no markdown fences.' };
  }

  const result = documentSchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, message: formatZodError(result.error) };
  }

  const routes: TenantLastMileBulkDocument['routes'] = {};
  for (const routeId of ROUTE_IDS) {
    const hub = result.data.routes[routeId];
    if (hub) {
      routes[routeId] = hub;
    }
  }

  return {
    ok: true,
    document: {
      tenantSlug: result.data.tenantSlug,
      routes,
    },
  };
}
