import type { TenantLastMileFillRequest } from '../model/types';

const SYSTEM = `You write the final "walk to hostel" step for a specific hostel building.

Rules:
- Output JSON only.
- English only in walkEn.
- Do NOT rewrite airport/bus/train steps — only last mile from drop-off to hostel door.
- Use {address} placeholder once where the street address belongs if the operator did not paste the full address.
- Do not invent door codes, prices, or transit lines.
- Do not include content that belongs in city pack tips or taxi cards.
- If information is missing, leave walkEn empty and add openQuestions (id + short question).
- If operator marked unknown, keep walkEn empty and retain the question.
- Put building-specific tips (stairs, side door) in tipsEn[] — not door codes.
- walkEn: one concise guest-facing paragraph (imperative, friendly).`;

function formatFollowUps(followUpAnswers?: Record<string, string>): string {
  if (!followUpAnswers || Object.keys(followUpAnswers).length === 0) {
    return '';
  }
  return `\n\nFollow-up answers:\n${Object.entries(followUpAnswers)
    .map(([id, answer]) => `- ${id}: ${answer.trim()}`)
    .join('\n')}`;
}

export function buildTenantLastMileUserPrompt(input: TenantLastMileFillRequest): string {
  return `Tenant: ${input.tenantSlug}
Hub: ${input.hubLabel} (${input.routeId})

Source answers:
"""
${input.rawInput.trim()}
"""
${formatFollowUps(input.followUpAnswers)}

Return walkEn and optional tipsEn (max 5).`;
}

export function tenantLastMileSystemPrompt(): string {
  return SYSTEM;
}
