const CALL_AHEAD_TAXI_TIP_PATTERN =
  /\b(?:call|phone|whatsapp|book\s+(?:a\s+)?taxi|dial|pre-?book)\b|(?:\+?\d[\d\s-]{6,}\d)/i;

const JACCARD_DUPLICATE_THRESHOLD = 0.55;

export type TaxiBackupSections = {
  atHub: { lines: string[] } | null;
  beforeRide: { lines: string[] } | null;
};

export type ResolveTaxiBackupSectionsInput = {
  pickupPoint: string;
  taxiTips: string[];
  packDealWarnings: string[];
};

export function normalizeTaxiCopyLine(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function wordTokenSet(value: string): Set<string> {
  const normalized = normalizeTaxiCopyLine(value);
  if (!normalized) {
    return new Set();
  }
  return new Set(normalized.split(' ').filter((token) => token.length > 1));
}

function jaccardSimilarity(a: string, b: string): number {
  const tokensA = wordTokenSet(a);
  const tokensB = wordTokenSet(b);
  if (tokensA.size === 0 || tokensB.size === 0) {
    return 0;
  }
  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersection += 1;
    }
  }
  const union = tokensA.size + tokensB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export function isDuplicateTaxiCopyLine(a: string, b: string): boolean {
  const left = a.trim();
  const right = b.trim();
  if (!left || !right) {
    return false;
  }
  const normalizedLeft = normalizeTaxiCopyLine(left);
  const normalizedRight = normalizeTaxiCopyLine(right);
  if (normalizedLeft === normalizedRight) {
    return true;
  }
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) {
    return true;
  }
  if (jaccardSimilarity(left, right) >= JACCARD_DUPLICATE_THRESHOLD) {
    return true;
  }

  const tokensLeft = wordTokenSet(left);
  const tokensRight = wordTokenSet(right);
  const [shorter, longer] =
    tokensLeft.size <= tokensRight.size
      ? [tokensLeft, tokensRight]
      : [tokensRight, tokensLeft];
  if (shorter.size === 0) {
    return false;
  }
  let overlap = 0;
  for (const token of shorter) {
    if (longer.has(token)) {
      overlap += 1;
    }
  }
  return overlap / shorter.size >= 0.65;
}

export function isCallAheadTaxiTip(value: string): boolean {
  return CALL_AHEAD_TAXI_TIP_PATTERN.test(value.trim());
}

/** Merge pack stand + meter into deal lines without repeating the same paragraph. */
export function mergePackTaxiDealWarnings(standWarning: string, meterWarning: string): string[] {
  const lines: string[] = [];
  for (const candidate of [standWarning, meterWarning]) {
    const trimmed = candidate.trim();
    if (!trimmed) {
      continue;
    }
    if (lines.some((line) => isDuplicateTaxiCopyLine(line, trimmed))) {
      continue;
    }
    lines.push(trimmed);
  }
  return lines;
}

function appendUniqueLine(lines: string[], candidate: string): void {
  const trimmed = candidate.trim();
  if (!trimmed || isCallAheadTaxiTip(trimmed)) {
    return;
  }
  if (lines.some((line) => isDuplicateTaxiCopyLine(line, trimmed))) {
    return;
  }
  lines.push(trimmed);
}

export function resolveTaxiBackupSections(input: ResolveTaxiBackupSectionsInput): TaxiBackupSections {
  const pickup = input.pickupPoint.trim();
  const tips = input.taxiTips.map((tip) => tip.trim()).filter(Boolean).slice(0, 2);
  const whereTip = tips[0];
  const dealTip = tips[1];

  const atHubLines: string[] = [];
  if (pickup) {
    atHubLines.push(pickup);
  }
  if (whereTip) {
    appendUniqueLine(atHubLines, whereTip);
  }

  const beforeRideLines: string[] = [];
  if (dealTip) {
    appendUniqueLine(beforeRideLines, dealTip);
  }
  for (const packLine of input.packDealWarnings) {
    appendUniqueLine(beforeRideLines, packLine);
  }

  return {
    atHub: atHubLines.length > 0 ? { lines: atHubLines } : null,
    beforeRide: beforeRideLines.length > 0 ? { lines: beforeRideLines } : null,
  };
}
