type ReceptionCopyTranslate = (
  key:
    | 'copyLineHostel'
    | 'copyLineBed'
    | 'copyLineDates'
    | 'copyLineRef'
    | 'copyLineName',
  values?: Record<string, string>
) => string;

export function buildReceptionCopyText(input: {
  hostelName: string;
  bedLine: string;
  dateRange: string;
  stayRef: string | null;
  guestName: string | null;
  compose: ReceptionCopyTranslate;
}): string {
  const lines = [
    input.compose('copyLineHostel', { hostelName: input.hostelName }),
    input.compose('copyLineBed', { bedLine: input.bedLine }),
    input.compose('copyLineDates', { dateRange: input.dateRange }),
  ];

  if (input.stayRef) {
    lines.push(input.compose('copyLineRef', { stayRef: input.stayRef }));
  }

  const trimmedName = input.guestName?.trim();
  if (trimmedName) {
    lines.push(input.compose('copyLineName', { guestName: trimmedName }));
  }

  return lines.join('\n');
}
