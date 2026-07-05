import { getOwnerSession } from './getOwnerSession';

export class OwnerAuthError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'OwnerAuthError';
  }
}

export async function assertOwnerAuthenticated(): Promise<{ id: string; email: string | null }> {
  const session = await getOwnerSession();
  if (!session) {
    throw new OwnerAuthError();
  }
  return session;
}
