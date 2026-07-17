import { z } from 'zod';

import { extractJsonPayload } from './extractJsonPayload';
import type { StaffKnowledgeArticleParseResult } from '../model/types';

function normalizeOptionalUrl(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

const articleDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20000),
  videoUrl: z.unknown().optional(),
  roleName: z.string().trim().max(120).nullable().optional(),
});

export function parseStaffKnowledgeArticleJson(raw: string): StaffKnowledgeArticleParseResult {
  const payload = extractJsonPayload(raw);
  if (!payload) {
    return {
      ok: false,
      message: 'Paste the full AI reply that contains a JSON object.',
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return {
      ok: false,
      message: 'Could not parse JSON. Ask the AI again using the copied prompt.',
    };
  }

  const result = articleDocumentSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      message: 'JSON shape is wrong. Need title and body (optional videoUrl, roleName).',
    };
  }

  const videoUrl = normalizeOptionalUrl(result.data.videoUrl);
  if (result.data.videoUrl != null && String(result.data.videoUrl).trim() && !videoUrl) {
    return {
      ok: false,
      message: 'videoUrl must be an http(s) URL or null.',
    };
  }

  return {
    ok: true,
    document: {
      title: result.data.title,
      body: result.data.body,
      videoUrl,
      roleName: result.data.roleName ?? null,
    },
  };
}
