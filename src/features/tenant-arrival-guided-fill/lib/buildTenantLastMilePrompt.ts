import type { TenantLastMileFillRequest } from '../model/types';

const SYSTEM = `You write the final "walk to hostel" step for a specific hostel building.

Rules:
- Output JSON only.
- English only in walkEn.
- Do NOT rewrite airport/bus/train steps or city walk from hub — only last mile from the city route anchor to hostel door.
- walkEn: one short paragraph (2–4 sentences). Imperative, friendly. Start at the city anchor, not at the airport/station.
- Use {address} placeholder once where the street address belongs if the operator did not paste the full address.
- Do not invent door codes, prices, or transit lines.
- Do not repeat get-off text, transit steps, or city Good to know tips listed in the city boundary block.
- tipsEn: omit by default. Max 2 bullets only for building entrance / stairs / side door — never tickets, taxi, or line numbers.
- If information is missing, leave walkEn empty and add openQuestions (id + short question).
- If operator marked unknown, keep walkEn empty and retain the question.`;

function formatFollowUps(followUpAnswers?: Record<string, string>): string {
  if (!followUpAnswers || Object.keys(followUpAnswers).length === 0) {
    return '';
  }
  return `\n\nFollow-up answers:\n${Object.entries(followUpAnswers)
    .map(([id, answer]) => `- ${id}: ${answer.trim()}`)
    .join('\n')}`;
}

export function buildTenantLastMileUserPrompt(input: TenantLastMileFillRequest): string {
  const boundaryBlock = input.cityBoundaryBlock?.trim()
    ? `\n\nCity pack boundary (do not repeat in output):\n"""\n${input.cityBoundaryBlock.trim()}\n"""`
    : input.cityContext?.trim()
      ? `\n\nCity pack context:\n"""\n${input.cityContext.trim()}\n"""`
      : '';

  return `Tenant: ${input.tenantSlug}
Hub: ${input.hubLabel} (${input.routeId})
${boundaryBlock}

Source answers:
"""
${input.rawInput.trim()}
"""
${formatFollowUps(input.followUpAnswers)}

Return walkEn and tipsEn only when building-specific (0–2 tips).`;
}

export function tenantLastMileSystemPrompt(): string {
  return SYSTEM;
}
