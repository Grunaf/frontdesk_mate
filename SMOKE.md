# Smoke tests

## Local

```bash
cp e2e/env.example e2e/env.local   # fill E2E_ADMIN_PASSWORD, E2E_GUEST_PIN, E2E_TENANT_SLUG, E2E_CITY_PACK_ID; optional E2E_RECEPTION_DESK_PIN for desk smoke
npm run dev                          # in another terminal
npm run smoke
```

## CI (optional)

1. Add repository **secrets**: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `E2E_ADMIN_PASSWORD`, `E2E_GUEST_PIN`, `E2E_TENANT_SLUG`, `E2E_CITY_PACK_ID` (same as tenant's city pack in admin, e.g. `kotor`); optional `E2E_RECEPTION_DESK_PIN` for reception desk smoke
2. Add repository **variable**: `ENABLE_SMOKE_CI` = `true`
3. Push a PR — smoke job uses the Playwright Docker image (browsers preinstalled, no download step)

## Manual pass (after `npm run smoke` is green)

Automated smoke covers admin login, city packs, guest PIN, arrival routes, Local Guide essentials, and reception desk (when `E2E_RECEPTION_DESK_PIN` is set).
These items still need a quick human pass:

- [ ] **Mobile width** — guest app readable on phone (375px); reception desk: issue form without scrolling, Plan calendar, Access ··· menu on touch
- [ ] **RU locale** — switch to `/ru/welcome`, key labels not broken
- [ ] **Images** — door/facade/hero load (no broken placeholders)
- [ ] **Reception PIN one-time** — after page reload, Access tab shows QR/link and “PIN was shown once…” (no digits); re-issue shows new PIN
- [ ] **Visual polish** — spacing, chips, bottom sheets feel OK

When something fails in automation, open the HTML report:

```bash
npx playwright show-report
```
