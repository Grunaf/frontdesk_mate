# E2E smoke fixtures

1. Copy `e2e/env.example` → `e2e/env.local`
2. Fill in values (see comments in the example file)
3. Run dev server (or let Playwright start it): `npm run dev`
4. Run smoke: `npm run smoke` · debug UI: `npm run smoke:ui`

## Quick fill guide

| Variable | Where to get it |
|----------|-----------------|
| `E2E_TENANT_SLUG` | Same as `NEXT_PUBLIC_TENANT_SLUG` or tenant slug in admin |
| `E2E_ADMIN_PASSWORD` | Same as `ADMIN_SECRET` in `.env.local` |
| `E2E_GUEST_PIN` | Create a stay in reception desk → copy 6-digit PIN |
| `E2E_GUEST_MAGIC_LINK` | Optional — copy full URL from reception instead of PIN |

`e2e/env.local` is gitignored — never commit real passwords.

## What smoke covers

- Admin login + tenants list
- Tenant edit page for `E2E_TENANT_SLUG`
- City pack `E2E_CITY_PACK_ID` marked Ready
- Guest PIN check-in → welcome
- Arrival route picker on welcome
- Local Guide essentials on concierge
- Wrong PIN error message

Manual checks after green smoke: see root `SMOKE.md`.
