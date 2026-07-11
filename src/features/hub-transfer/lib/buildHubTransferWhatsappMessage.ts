import type { HubTransferDirection } from '@/entities/guest-hub-transfer';

export type BuildHubTransferWhatsappMessageInput = {
  hostelName: string;
  hubLabel: string;
  direction: HubTransferDirection;
  directionToLabel: string;
  directionFromLabel: string;
  requestedDate: string;
  requestedTime: string;
  guestName: string | null;
  stayRef: string | null;
  formatMessage: (
    key: 'whatsappMessage',
    params: Record<string, string>
  ) => string;
};

export function buildHubTransferWhatsappMessage(
  input: BuildHubTransferWhatsappMessageInput
): string {
  const directionPhrase =
    input.direction === 'to_hostel' ? input.directionToLabel : input.directionFromLabel;

  return input.formatMessage('whatsappMessage', {
    hostelName: input.hostelName,
    hubName: input.hubLabel,
    direction: directionPhrase,
    date: input.requestedDate,
    time: input.requestedTime,
    guestName: input.guestName?.trim() || '—',
    stayRef: input.stayRef ?? '',
  });
}
