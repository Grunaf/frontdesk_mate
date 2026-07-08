import { z } from 'zod';
import type { RouteId } from '@/entities/hostel';
import type { PackBulkImportDocument, PackBulkImportParseResult } from '../model/types';

const ROUTE_IDS = ['airport', 'bus_central', 'bus_istochno', 'train_station'] as const satisfies readonly RouteId[];

const openQuestionSchema = z.object({
  id: z.string().min(1),
  field: z.string().min(1),
  question: z.string().min(1),
});

const copyBlockSchema = z
  .object({
    publicTitle: z.string().optional(),
    publicSummary: z.string().optional(),
    publicPreview: z.string().optional(),
    publicText: z.string().optional(),
    publicGetOffAt: z.string().optional(),
    publicWalkToHostel: z.string().optional(),
    transitScheduleAdvice: z.array(z.string()).max(2).optional(),
    transitTicketPayment: z.array(z.string()).max(2).optional(),
    tips: z.array(z.string()).max(2).optional(),
  })
  .optional();

const localizedEnSchema = z.union([z.string(), z.object({ en: z.string().optional() })]).optional();

const taxiBlockSchema = z
  .object({
    taxiCost: localizedEnSchema,
    taxiPickupPoint: localizedEnSchema,
    tips: z.array(z.string()).max(5).optional(),
  })
  .optional();

const hubSchema = z.object({
  primaryRouteMode: z.enum(['transit', 'walk_only']).optional(),
  hubArrivalKind: z.enum(['city_shared', 'tenant_local']).optional(),
  transit: copyBlockSchema,
  walk: copyBlockSchema,
  taxi: taxiBlockSchema,
  metadata: z
    .object({
      transitDurationMin: z.number().optional(),
      transitStops: z.number().optional(),
      ticketKioskKm: z.number().optional(),
      ticketDriverKm: z.number().optional(),
      taxiEurMin: z.number().optional(),
      taxiEurMax: z.number().optional(),
      taxiKmMin: z.number().optional(),
      taxiKmMax: z.number().optional(),
      taxiDurationMin: z.number().optional(),
      taxiDurationMax: z.number().optional(),
    })
    .optional(),
  openQuestions: z.array(openQuestionSchema).optional(),
});

const routeIdEnum = z.enum(ROUTE_IDS);

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

export const packBulkImportDocumentSchema = z.object({
  packId: z.string().min(1),
  suggestedEnabledRoutes: z.array(routeIdEnum).optional(),
  routes: routesSchema,
});

function formatZodError(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) {
    return 'Invalid JSON shape for pack bulk import.';
  }
  const path = first.path.length ? first.path.join('.') : 'root';
  return `${path}: ${first.message}`;
}

export function parsePackBulkImportJson(raw: string): PackBulkImportParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, message: 'Invalid JSON — use one object only, no markdown fences.' };
  }

  const result = packBulkImportDocumentSchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, message: formatZodError(result.error) };
  }

  const routes: PackBulkImportDocument['routes'] = {};
  for (const routeId of ROUTE_IDS) {
    const hub = result.data.routes[routeId];
    if (!hub) {
      continue;
    }
    routes[routeId] = {
      primaryRouteMode: hub.primaryRouteMode,
      hubArrivalKind: hub.hubArrivalKind,
      transit: hub.transit,
      walk: hub.walk,
      taxi: hub.taxi,
      metadata: hub.metadata,
      openQuestions: hub.openQuestions,
    };
  }

  if (Object.keys(routes).length === 0) {
    return { ok: false, message: 'routes: include at least one hub (airport, bus_central, …).' };
  }

  return {
    ok: true,
    document: {
      packId: result.data.packId,
      suggestedEnabledRoutes: result.data.suggestedEnabledRoutes,
      routes,
    },
  };
}
