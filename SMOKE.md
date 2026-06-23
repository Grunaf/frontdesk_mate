# Smoke tests

## Local

```bash
cp e2e/env.example e2e/env.local   # fill E2E_ADMIN_PASSWORD, E2E_TENANT_SLUG, E2E_CITY_PACK_ID; E2E_GUEST_PIN optional (auto-provision)
npm run dev                          # in another terminal
npm run smoke
```

## CI (optional)

1. Add repository **secrets**: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `E2E_ADMIN_PASSWORD`, `E2E_TENANT_SLUG`, `E2E_CITY_PACK_ID` (same as tenant's city pack in admin, e.g. `kotor`); optional `E2E_GUEST_PIN` (fallback if provision fails), `E2E_RECEPTION_DESK_PIN` for reception desk smoke
2. Add repository **variable**: `ENABLE_SMOKE_CI` = `true`
3. Push a PR — smoke job uses the Playwright Docker image (browsers preinstalled, no download step)

## Manual pass (after `npm run smoke` is green)

Automated smoke covers admin login, city packs, guest PIN, arrival routes, Local Guide essentials, guest concierge (stay chip, ref, strip), guest issue report, guest services (laundry card), and reception desk + ref search (when `E2E_RECEPTION_DESK_PIN` is set).

**Guest flow (full manual pass):** [docs/qa/guest-flow-pass.md](docs/qa/guest-flow-pass.md) — check-in, intent, `entry=` links, locked sheet, Preparation, Settlement copy, optional reception (~30–40 min, 375px).

These items still need a quick human pass:

- [ ] **Guest flow** — [guest-flow-pass.md](docs/qa/guest-flow-pass.md) (P0 A–E; stay chip S1–S7; reception R1–R6 if desk PIN set)
- [ ] **Mobile width** — reception desk: issue form without scrolling, Plan calendar, Access ··· menu on touch
- [ ] **RU locale** — switch to `/ru/welcome`, key labels not broken
- [ ] **Images** — door/facade/hero load (no broken placeholders)
- [ ] **Reception PIN one-time** — after page reload, Access tab shows QR/link and “PIN was shown once…” (no digits); re-issue shows new PIN

When something fails in automation, open the HTML report:

```bash
npx playwright show-report
```
