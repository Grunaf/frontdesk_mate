import { z } from 'zod';

import { extractJsonPayload } from './extractJsonPayload';
import type {
  StaffKnowledgeBootstrapContextParseResult,
  StaffKnowledgeBootstrapParseResult,
  StaffKnowledgeBootstrapRolesParseResult,
} from '../model/types';

const laborTypeSchema = z.enum(['paid', 'volunteer']).nullable().optional();

const bootstrapRoleSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).default(''),
  headcount: z.coerce.number().int().min(1).max(50),
  laborType: laborTypeSchema,
  checklist: z.array(z.string().trim().min(1).max(500)).max(40).default([]),
});

const bootstrapDocumentSchema = z.object({
  summary: z.string().trim().max(4000).optional(),
  roles: z.array(bootstrapRoleSchema).min(1).max(30),
});

const contextDocumentSchema = z.object({
  ready: z.enum(['green', 'yellow', 'red']),
  laborModel: z.enum(['paid', 'volunteers', 'mix']),
  constraints: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  mustUse: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  missing: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  unclear: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  followUpQuestions: z.array(z.string().trim().min(1).max(300)).max(3).default([]),
});

const rolesOnlyRoleSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).default(''),
  headcount: z.coerce.number().int().min(1).max(50),
  laborType: laborTypeSchema,
});

const rolesOnlyDocumentSchema = z.object({
  summary: z.string().trim().max(4000).optional(),
  roles: z.array(rolesOnlyRoleSchema).min(1).max(30),
});

function parseJsonPayload(raw: string): { ok: true; value: unknown } | { ok: false; message: string } {
  const payload = extractJsonPayload(raw);
  if (!payload) {
    return {
      ok: false,
      message: 'Paste the full AI reply that contains a JSON object.',
    };
  }

  try {
    return { ok: true, value: JSON.parse(payload) };
  } catch {
    return {
      ok: false,
      message: 'Could not parse JSON. Ask the AI again using the copied prompt.',
    };
  }
}

export function parseStaffKnowledgeBootstrapJson(
  raw: string
): StaffKnowledgeBootstrapParseResult {
  const parsed = parseJsonPayload(raw);
  if (!parsed.ok) return parsed;

  const result = bootstrapDocumentSchema.safeParse(parsed.value);
  if (!result.success) {
    return {
      ok: false,
      message: 'JSON shape is wrong. Roles need name, headcount, and checklist[].',
    };
  }

  return {
    ok: true,
    document: {
      summary: result.data.summary,
      roles: result.data.roles.map((role) => ({
        name: role.name,
        description: role.description,
        headcount: role.headcount,
        laborType: role.laborType ?? null,
        checklist: role.checklist,
      })),
    },
  };
}

export function parseStaffKnowledgeBootstrapContextJson(
  raw: string
): StaffKnowledgeBootstrapContextParseResult {
  const parsed = parseJsonPayload(raw);
  if (!parsed.ok) return parsed;

  const result = contextDocumentSchema.safeParse(parsed.value);
  if (!result.success) {
    return {
      ok: false,
      message: 'JSON shape is wrong. Need ready, laborModel, mustUse, missing, unclear.',
    };
  }

  return {
    ok: true,
    document: {
      ready: result.data.ready,
      laborModel: result.data.laborModel,
      constraints: result.data.constraints,
      mustUse: result.data.mustUse,
      missing: result.data.missing,
      unclear: result.data.unclear,
      followUpQuestions: result.data.followUpQuestions,
    },
  };
}

export function parseStaffKnowledgeBootstrapRolesJson(
  raw: string
): StaffKnowledgeBootstrapRolesParseResult {
  const parsed = parseJsonPayload(raw);
  if (!parsed.ok) return parsed;

  const result = rolesOnlyDocumentSchema.safeParse(parsed.value);
  if (!result.success) {
    return {
      ok: false,
      message: 'JSON shape is wrong. Roles need name and headcount (no checklist yet).',
    };
  }

  return {
    ok: true,
    document: {
      summary: result.data.summary,
      roles: result.data.roles.map((role) => ({
        name: role.name,
        description: role.description,
        headcount: role.headcount,
        laborType: role.laborType ?? null,
      })),
    },
  };
}
