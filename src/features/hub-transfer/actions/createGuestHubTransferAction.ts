'use server';

import type { CreateGuestHubTransferInput, CreateGuestHubTransferResult } from '@/entities/guest-hub-transfer/model/types';
import { createGuestHubTransfer } from '@/entities/guest-hub-transfer/server';

export async function createGuestHubTransferAction(
  input: CreateGuestHubTransferInput
): Promise<CreateGuestHubTransferResult> {
  try {
    return await createGuestHubTransfer(input);
  } catch (error) {
    console.error('createGuestHubTransferAction:', error);
    return { ok: false, error: 'db_unavailable' };
  }
}
