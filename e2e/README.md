# E2E smoke fixtures

1. Copy `e2e/env.example` → `e2e/env.local`
2. Fill in values (see comments in the example file)
3. Run dev server (or let Playwright start it): `npm run dev`
4. Run smoke: `npm run smoke` · debug UI: `npm run smoke:ui`

## Quick fill guide

| Variable | Where to get it |
|----------|-----------------|
| `E2E_TENANT_SLUG` | Same as `NEXT_PUBLIC_TENANT_SLUG` or tenant slug in admin |
| `E2E_CITY_PACK_ID` | City pack on that tenant (admin → tenant → Identity), e.g. `kotor` |
| `E2E_ADMIN_PASSWORD` | Same as `ADMIN_SECRET` in `.env.local` |
| `E2E_GUEST_PIN` | **Optional** — auto-provision creates a smoke stay before tests (guest name `__e2e_smoke__`) |
| `E2E_GUEST_MAGIC_LINK` | Optional — copy full URL from reception instead of PIN |
| `E2E_TOURISM_SMOKE` | Optional — set to `1` to run tourism deep-link smoke (enable **tourism registration** on `E2E_TENANT_SLUG` in admin first; uses fresh provisioned stay with incomplete registration) |

Auto-provision needs the same Supabase keys as dev (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`) plus `ADMIN_SECRET` (or `GUEST_SESSION_SECRET`) in `.env.local`. Use a **dev/test tenant**, not production.

Set `E2E_PROVISION_GUEST_STAY=false` and `E2E_GUEST_PIN` to pin a manual stay instead.

`e2e/env.local` is gitignored — never commit real passwords.

## What smoke covers

- Admin login + tenants list
- Tenant edit page for `E2E_TENANT_SLUG`
- City pack `E2E_CITY_PACK_ID` marked Ready
- Guest PIN check-in → welcome (PIN from auto-provision or `E2E_GUEST_PIN`)
- Arrival route picker on welcome
- Local Guide essentials on concierge
- Wrong PIN error message
- Concierge **My stay → Show room map** → `/registration` when guest registration prerequisites are incomplete (fresh provisioned stay)
- Arrival **`welcome?step=register`** when `E2E_TOURISM_SMOKE=1` (skipped by default; tenant needs tourism registration enabled)

Manual checks after green smoke: see root `SMOKE.md`.
