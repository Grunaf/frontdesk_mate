export const PIN_RATE_LIMIT_MAX_FAILURES = 5;
export const PIN_RATE_LIMIT_WINDOW_SEC = 15 * 60;
export const PIN_RATE_LIMIT_BLOCK_SEC = 15 * 60;

export type PinRateLimitScope = 'guest' | 'reception';
