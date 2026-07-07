import 'server-only';

import { APICallError, RetryError } from 'ai';

export type GuidedFillProviderFailure = 'rate_limited' | 'provider_error';

function findApiCallError(error: unknown): APICallError | undefined {
  if (APICallError.isInstance(error)) {
    return error;
  }

  if (RetryError.isInstance(error)) {
    for (const attemptError of error.errors) {
      if (APICallError.isInstance(attemptError)) {
        return attemptError;
      }
    }
    if (APICallError.isInstance(error.lastError)) {
      return error.lastError;
    }
  }

  let current: unknown = error;
  while (current instanceof Error) {
    if (APICallError.isInstance(current)) {
      return current;
    }
    current = current.cause;
  }

  return undefined;
}

export function resolveGuidedFillProviderError(error: unknown): GuidedFillProviderFailure {
  const apiError = findApiCallError(error);
  if (apiError?.statusCode === 429) {
    return 'rate_limited';
  }

  const message = error instanceof Error ? error.message : String(error);
  if (/\b429\b|too many requests|rate limit/i.test(message)) {
    return 'rate_limited';
  }

  return 'provider_error';
}

export function logGuidedFillProviderError(scope: string, error: unknown): void {
  const apiError = findApiCallError(error);
  console.error(scope, {
    message: error instanceof Error ? error.message : 'unknown',
    statusCode: apiError?.statusCode,
    responseBody: apiError?.responseBody?.slice(0, 800),
  });
}
