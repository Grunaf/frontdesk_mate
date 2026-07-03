# Frontdesk Mate

Multi-tenant guest app and landing for hostels. One codebase serves many properties via `tenants` in Supabase. In production the tenant slug comes from the hostname; locally use `NEXT_PUBLIC_TENANT_SLUG` or `{slug}.localhost`.

## Stack

- **Next.js 16** (App Router)
- **React 19**, TypeScript
- **Tailwind CSS 4**, shadcn/ui
- **Supabase** (Postgres + optional client)
- **next-intl** (EN / RU)
- **Vitest** for unit tests
- **Feature-Sliced Design** (`src/entities`, `features`, `widgets`, `views`, `shared`)

## Quick start

```bash
cp .env.example .env.local   # fill DATABASE_URL, ADMIN_SECRET, Supabase keys
npm install
npm run db:migrate
npm run dev
```

- Guest app: `/welcome`, `/concierge` (under `app-site/[locale]`)
- Landing: `landing-site/[locale]`
- Admin: `/admin` (password = `ADMIN_SECRET`)
- Dev panel (local only): `/dev-panel` (password = `ADMIN_SECRET` or `DEV_PANEL_SECRET`)
- Smoke tests: copy `e2e/env.example` → `e2e/env.local`, then `npm run smoke` (see `SMOKE.md`)
- AI context: `npm run snapshot` → `CONTEXT_SNAPSHOT.md` (gitignored, attach in Cursor chats)

Set tenant for local dev:

```bash
NEXT_PUBLIC_TENANT_SLUG=default   # or kotor-demo
```

Production URLs (one deploy, many hostels):

- Root (no slug): guest recovery page — booking link hint + hostel lookup (`https://yourdomain.com/en/`)
- Landing: `https://{slug}.yourdomain.com/en/`
- Guest app: `https://{slug}.app.yourdomain.com/en/welcome`
- Reception desk: `https://{slug}.reception.yourdomain.com/` (PIN set in SaaS admin → Contacts & reception)
- Deep-link guest bed before PMS sync: `?bed=4B` or `?bedId=4A-Top`

On production, bare domain and `app.yourdomain.com` **do not** fall back to the `default` tenant. Locally, `NEXT_PUBLIC_TENANT_SLUG` still selects the tenant when no subdomain is present.

## Production deploy (Vercel)

1. **Merge to `main`** — Production deployments come from the production branch (Settings → Git → Production Branch = `main`). Preview URLs (`*.vercel.app`) are not bound to your custom domain.
2. **`vercel.json`** — uses `npm run build:vercel` (no city-pack DB checks at build time). Set the same Supabase/DB/admin secrets in Vercel **Production** (and **Preview** if you deploy feature branches).
3. **Env (Production)** — see `.env.example`. Required: `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SECRET_KEY`, `DATABASE_URL`, `ADMIN_SECRET`, **`NEXT_PUBLIC_BASE_DOMAIN=your-apex`** (e.g. `staysync.cc`, not `localhost`). Do **not** set `NEXT_PUBLIC_TENANT_SLUG` on Vercel.
4. **Domains in Vercel** — apex + `www`, plus wildcards for multi-tenant hosts:
   - `*.yourdomain.com` (landing `{slug}.yourdomain.com`)
   - `*.app.yourdomain.com` (guest app)
   - `*.reception.yourdomain.com` (reception desk)
5. **Smoke after deploy** — `https://yourdomain.com/en/`, `https://{slug}.yourdomain.com/en/`, `https://{slug}.app.yourdomain.com/en/welcome`, `/admin`. Landing “Guest app” links must point at `*.app.yourdomain.com`, not localhost.

Rotate WiFi passwords and door codes after onboarding — demo values in early SQL migrations are not production secrets.

## Project layout

```
src/
  app/                    # routes (admin, app-site, landing-site, platform-site, api)
  entities/               # tenant, room, hostel — domain models + API
  features/               # booking, door-access, find-your-bed, …
  views/                  # arrival-journey, concierge
  widgets/                # HostelHero, RoomsGallery
  shared/                 # ui, i18n, config, lib
supabase/migrations/      # SQL migrations (run via npm run db:migrate)
scripts/                  # migrate-db, validate-i18n
```

## Tenant configuration

All per-hostel content lives in **`tenants.settings`** (JSONB). Admin UI: `/admin/tenants/[slug]`.

| Section | Settings key | Purpose |
|--------|--------------|---------|
| Identity | slug, name, cityPackId | Brand + city pack (routes, guide) |
| Subscription | `subscription_starts_at`, `subscription_ends_at`, `archived_at` | Guest access window; archive instead of delete |
| Landing | `landing`, `heroBgUrl` | Hero + bookable room cards on public landing |
| Arrival | `arrivalAccess` | Access points, codes, landmark photos |
| Guest stay | `guestStay` | Floors, rooms, beds, room map |
| Booking | `booking` | none / cloudbeds / frontdesk_master |

Capabilities (`resolveCapabilities`) derive module visibility: `doorAccess`, `roomMap`, `booking`, etc.

## Guest stay & room map

**Find your bed** — Settlement tab + Concierge card.

Data model (`settings.guestStay`):

```json
{
  "floors": [{ "id": "2", "label": "Floor 2", "pathHint": "…" }],
  "rooms": [{ "id": "vega", "label": "Vega", "floorId": "2", "doorImage": "/images/…", "mapWidth": 260, "mapHeight": 220 }],
  "beds": [
    { "id": "4B", "roomId": "vega", "x": 30, "y": 110, "bedType": "single", "rotation": 0 },
    { "id": "4A", "roomId": "vega", "x": 30, "y": 30, "bedType": "bunk", "topId": "4A-Top", "bottomId": "4A-Bot", "rotation": 90 }
  ]
}
```

- **`bedType`**: `single` | `bunk` | `double`
- **`mapWidth` / `mapHeight`**: room floor size on the SVG (140–320 × 120–280, step 10). Drag the corner handle in admin.
- **`rotation`**: `0 | 90 | 180 | 270` (degrees, bed center)

### Admin: room map editor

**Guest app modules** — grouped UX:

1. **Floors** (collapsed) — wayfinding hints per floor
2. **Rooms** — one card per room:
   - Header: name · floor · bed count
   - **Room details** (collapsed): ID, label, floor, door photo
   - **Bed map** (collapsed): place beds, rotate, drag; **drag room corner** to resize floor

Guests see their assigned bed on the map after check-in (PIN / magic link session).

Key files:

- `src/app/admin/(protected)/tenants/ui/RoomLayoutEditor.tsx`
- `src/entities/room/ui/RoomLayout/RoomLayoutCanvas.tsx` — branded frame, no clip
- `src/entities/room/model/room-layout.ts` — coordinates & constants
- `src/features/find-your-bed/` — guest UI

### Arrival vs in-room navigation

- **Arrival** (`arrivalAccess.accessPoints`) — doors, codes, photos to enter the building/floor
- **Guest stay** (`guestStay`) — room door, floor path hint, in-room bed map

Do not mix door codes into the room map section.

## Database migrations

```bash
npm run db:migrate          # apply pending
npm run db:migrate:status   # list state
```

**Production:** Vercel deploy does not run SQL. After merging new files under `supabase/migrations/`:

1. **GitHub Actions** — Actions → **DB migrate (production)** → Run workflow. Add repo secret `PROD_DATABASE_URL` (Supabase → Connect → Session pooler, port 5432). Optional: enable required reviewers on the `production` environment.
2. **Local** — `DATABASE_URL='postgresql://…pooler…' npm run db:migrate` (explicit URL avoids hitting dev DB from `.env.local`).

Then redeploy if the release depends on the new schema.

Recent migrations:

| File | Description |
|------|-------------|
| `011_access_points.sql` | Building + floor zones (Balkan Han) |
| `012_guest_stay.sql` | Rooms/beds for default tenant |
| `013_room_layout_in_guest_stay.sql` | Bed x/y in DB (no hardcoded layouts) |
| `014_bed_types.sql` | Explicit `bedType` on beds |
| `015_normalize_legacy_settings.sql` | Strip legacy `doors`/`doorImages`/`isBunk`; accessPoints-only arrival |
| `016_landing_rooms.sql` | Per-tenant landing room types in `settings.landing` |

## Dev tooling

| Tool | Command / URL | Purpose |
|------|---------------|---------|
| Snapshot | `npm run snapshot` | Writes `CONTEXT_SNAPSHOT.md` — compact project map for AI chats |
| Dev panel | `http://localhost:3000/dev-panel` | Env checks, module status, product map (dev only, 404 in production) |
| Smoke | `npm run smoke` | Playwright P0 tests — see `SMOKE.md` |
| CI smoke | GitHub Actions | Set secrets + repo variable `ENABLE_SMOKE_CI=true` (`SMOKE.md`) |

Tenant settings are edited in **admin** (`/admin/tenants/[slug]`), not on the dev panel.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | migrate (quiet) + Next dev |
| `npm test` | Vitest |
| `npm run smoke` | Playwright smoke suite (`e2e/env.local`) |
| `npm run snapshot` | Regenerate `CONTEXT_SNAPSHOT.md` |
| `npm run lint:fsd` | Steiger FSD boundaries |
| `npm run validate-i18n` | JSON key parity EN/RU |

## Environment variables

See `.env.example`. Required for full flow:

- `DATABASE_URL` — Postgres (Supabase pooler)
- `ADMIN_SECRET` — admin login
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` — tenant fetch / admin save
- `SUPABASE_TENANT_ASSETS_BUCKET` — optional; Supabase Storage bucket for admin image uploads (default `tenant-assets`)
- `NEXT_PUBLIC_TENANT_SLUG` — **local dev only** (which tenant on flat localhost)
- `NEXT_PUBLIC_BASE_DOMAIN` — **production** public hostname for generated links (Vercel env)

## Changelog (developer notes)

### 2026-06 — Scaling & per-tenant content

- Subdomain tenant routing: `{slug}.domain` (landing), `{slug}.app.domain` (guest app)
- Landing room cards moved to `settings.landing.roomTypes` (admin-editable, no `ROOMS_DATA` hardcode)
- Guest bed deep-link via `?bed=` / `?bedId=` until PMS sync
- Missing tenant slug returns 404 instead of empty settings fallback

### 2026-06 — Legacy settings cleanup

- Migration `015`: normalize tenant JSON — `arrivalAccess.accessPoints` only, `bedType` only on beds
- Removed dual-write `doors`/`doorImages` sync from admin save and `buildHostelConfig`
- Removed deprecated APIs: `resolveDoorAccessPlan`, `useDoorAccessPlan`, `INTEGRATIONS`, legacy `ArrivalAccessPlan` fields
- Booking reads only `settings.booking`; settlement rules from `settings.houseRules` (legacy `activeRulesKeys` migrated on read)

### 2025-06 — Room map editor & guest stay

- Removed hardcoded `balkan-han` layout; bed positions stored in `guestStay.beds`
- Visual admin editor: place, drag, rotate beds; types single / bunk / double
- `RoomLayoutCanvas`: brand gradient frame, larger viewBox (500×400), floor not clipped
- Admin: room map editor **collapsed by default** per room; floors in separate collapsed section
- Per-room **mapWidth / mapHeight** with drag-to-resize corner (simple limits, 10px snap)
- `README.md` — project docs for new developers

### Earlier (summary)

- Multi-tenant admin accordion form with sticky save
- Access points model (building → zones vs direct-to-floor)
- Booking providers: none / Cloudbeds / Frontdesk Master
- Modular capabilities per tenant (`preview` / `ready` / `hidden`)

---

For questions about a module, search `settings.guestStay` or `resolveGuestStayPlan` and follow imports in `src/entities/tenant`.
