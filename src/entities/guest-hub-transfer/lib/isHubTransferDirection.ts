import { HUB_TRANSFER_DIRECTIONS, type HubTransferDirection } from '../model/types';

export function isHubTransferDirection(value: string): value is HubTransferDirection {
  return (HUB_TRANSFER_DIRECTIONS as readonly string[]).includes(value);
}
