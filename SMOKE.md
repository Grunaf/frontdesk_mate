# Smoke tests

## Local

```bash
cp e2e/env.example e2e/env.local   # fill E2E_ADMIN_PASSWORD, E2E_GUEST_PIN, E2E_TENANT_SLUG, E2E_CITY_PACK_ID
npm run dev                          # in another terminal
npm run smoke
```

## CI (optional)

1. Add repository **secrets**: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `E2E_ADMIN_PASSWORD`, `E2E_GUEST_PIN`, `E2E_TENANT_SLUG`, `E2E_CITY_PACK_ID` (same as tenant's city pack in admin, e.g. `kotor`)
2. Add repository **variable**: `ENABLE_SMOKE_CI` = `true`
3. Push a PR — smoke job uses the Playwright Docker image (browsers preinstalled, no download step)

## Manual pass (after `npm run smoke` is green)

Automated smoke covers admin login, city packs, guest PIN, arrival routes, and Local Guide essentials.
These items still need a quick human pass:

- [ ] **Mobile width** — guest app readable on phone (375px)
- [ ] **RU locale** — switch to `/ru/welcome`, key labels not broken
- [ ] **Images** — door/facade/hero load (no broken placeholders)
- [ ] **Reception flow** — open `{slug}.reception.localhost:3000/login` (prod: `{slug}.reception.domain`), sign in with desk PIN, land on desk (not landing). Walk-in: issue access for today. Custom dates: set 5 nights from a future valid-from on a bed occupied now (non-overlapping dates). Access calendar week shows occupied/scheduled nights. Change dates re-issues access with a new PIN (old PIN stops working). Old PIN from `e2e/env.local` still works for its stay until re-issued
- [ ] **Visual polish** — spacing, chips, bottom sheets feel OK

When something fails in automation, open the HTML report:

```bash
npx playwright show-report
```
