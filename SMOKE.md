# Smoke tests

## Tourism document retention (ops)

Daily job: `purgeExpiredTourismDocuments()` in
`src/features/guest-tourism-registration/jobs/purgeExpiredTourismDocuments.ts`.
Policy: **90 days** after `guest_reservations.check_out_at` (Chat A). Requires `SUPABASE_SECRET_KEY`.

- Staging dry-run: `TOURISM_DOCUMENT_PURGE_DRY_RUN=1` (logs only, no storage/DB deletes).
- Optional: `TOURISM_DOCUMENT_RETENTION_DAYS`, `TOURISM_DOCUMENT_PURGE_BATCH_LIMIT` (default 50).
- **Vercel:** set `CRON_SECRET` on the project; `vercel.json` runs `GET /api/cron/tourism-document-purge` daily at **03:00 UTC**. Vercel sends `Authorization: Bearer <CRON_SECRET>`.
- Manual trigger: `curl -sS -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/cron/tourism-document-purge` — check Vercel function logs for `[tourism-document-purge]`.

Manual check: backdate a test stay `check_out_at` → run job → storage objects and
`guest_stay_tourism_guests` rows gone; reception tourism block shows **Documents purged**.

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

- [ ] **Concierge hub** — `/` shows compact services, local guide, and FAQ blocks (no full explore tabs, full FAQ list, or full extras grid); drill-down `/guide`, `/services`, `/faq` opens full views; back returns to `/`; `FeatureGate` hides modules when disabled in tenant settings
- [ ] **Stay essentials bridges** (registered guest on `/`) — horizontal bridge cards: title only, icon bottom-left, pastel tint per bridge; **border** = read state (primary unread / muted read); tap opens sheet; Wi‑Fi copy; check-out / reception / night access sheets when tenant data allows; night bridge hidden after key issued, dismiss, or outside arrival window; read state persists per stay after reload; reception strip hidden while any sheet is open; **pre-check-in banner** (`stay-banner-registration`) when contact and/or tourism prerequisites are incomplete — tap opens `/registration` (no stay-setup bridge tile)
- [ ] **Guest flow** — [guest-flow-pass.md](docs/qa/guest-flow-pass.md) (P0 A–E; stay chip S1–S7; reception R1–R6 if desk PIN set)
- [ ] **Mobile width** — reception desk: issue form without scrolling, Plan calendar, Access ··· menu on touch
- [ ] **RU locale** — switch to `/ru/welcome`, key labels not broken
- [ ] **Images** — door/facade/hero load (no broken placeholders)
- [ ] **Reception PIN one-time** — after page reload, Access tab shows QR/link and “PIN was shown once…” (no digits); re-issue shows new PIN
- [ ] **Guest tourism registration (MNE)** — in admin, enable tourism registration for the tenant; guest PIN → Arrival journey **Register** step: add guest (passport + entry stamp), complete registration; on reception desk, confirm tourism checkbox / panel reflects completed stay
  - [ ] **Locked Settlement** — with tourism on and registration incomplete: open **Settlement** tab (or `?step=settlement` deep link) → tourism required sheet (Chat C), not Wi‑Fi / bed map content
  - [ ] **Privacy on Register** — Register step shows tourism privacy notice before submit (Chat D)
  - [ ] **Concierge bed map** — My stay → **Show room map** (and Find your bed card if shown) lands on **`/registration`** until guest registration prerequisites are complete; after complete, links open **stay-setup** (essentials or room per tenant). Arrival journey **`welcome?step=register`** still opens the Register tab on the arrival guide (not stay-setup).

When something fails in automation, open the HTML report:

```bash
npx playwright show-report
```
