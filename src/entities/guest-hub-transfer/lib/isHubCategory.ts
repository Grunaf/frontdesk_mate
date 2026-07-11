import { HUB_TRANSFER_CATEGORIES, type HubTransferCategory } from '../model/types';

export function isHubCategory(value: string): value is HubTransferCategory {
  return (HUB_TRANSFER_CATEGORIES as readonly string[]).includes(value);
}
