# Guest flow — full manual QA pass

**When:** after `npm run smoke` is green (automated baseline).  
**Time:** ~30–40 min on a phone or DevTools **375×812** (EN). Add ~10 min for `/ru` spot checks.  
**Replaces:** partial lists in TZ files — this is the single checklist for links, redirects, intent, and arrival guide.

---

## 0. Setup

| Item | Action |
|------|--------|
| Dev server | `npm run dev` (restart after pulling `main`) |
| Smoke | `npm run smoke` — provisions guest PIN if `E2E_GUEST_PIN` empty |
| Credentials | `e2e/env.local` — `E2E_TENANT_SLUG`, `E2E_ADMIN_PASSWORD`; optional `E2E_RECEPTION_LOGIN` + `E2E_RECEPTION_PIN` for reception rows |
| Guest PIN | Value from smoke output or `E2E_GUEST_PIN` in `e2e/env.local` |
| Incognito | Use for rows marked **no session**; normal window for post check-in |
| Viewport | **375px** width |

---

## 1. URL cheat sheet

Replace `{slug}` with `E2E_TENANT_SLUG` (e.g. `vega`).  
**Flat dev** (`E2E_URL_MODE=flat` — default in `e2e/env.local`):

| Surface | URL |
|---------|-----|
| Guest check-in | `http://app.localhost:3000/en/check-in` |
| Guest intent | `http://app.localhost:3000/en/check-in/intent` |
| Arrival guide | `http://app.localhost:3000/en/welcome` |
| Route step | `http://app.localhost:3000/en/welcome?step=route` |
| Access step (locked without session) | `http://app.localhost:3000/en/welcome?step=arrival` |
| Settlement step (locked without session) | `http://app.localhost:3000/en/welcome?step=settlement` |
| Concierge | `http://app.localhost:3000/en/concierge` |
| Reception desk | `http://localhost:3000/reception` |

**Subdomain dev** (`E2E_URL_MODE=subdomain`):

| Surface | URL |
|---------|-----|
| Guest app | `http://{slug}.app.localhost:3000/en/...` |
| Reception | `http://{slug}.reception.localhost:3000/` |

**Magic link shape** (after issuing access on reception):

```
http://{slug}.app.localhost:3000/en/check-in?t=TOKEN
http://{slug}.app.localhost:3000/en/check-in?t=TOKEN&entry=remote   # send link — skip intent → route
http://{slug}.app.localhost:3000/en/check-in?t=TOKEN&entry=door      # skip intent → Access & Doors
http://{slug}.app.localhost:3000/en/check-in?t=TOKEN&entry=desk      # skip intent → Settlement
http://{slug}.app.localhost:3000/en/check-in?t=TOKEN&mode=onsite     # legacy → Access & Doors
```

---

## 2. What automation already covers

| Area | Spec | Notes |
|------|------|-------|
| Admin + city packs | `e2e/smoke/admin.spec.ts`, `city-packs.spec.ts` | — |
| Guest PIN → welcome route | `e2e/smoke/guest-journey.spec.ts` | Intent screen handled in helper if shown |
| Guest concierge stay chip + strip | `e2e/smoke/guest-concierge.spec.ts` | My stay sheet, ref, strip hide on sheet |
| Guest issue report | `e2e/smoke/guest-issue.spec.ts` | Card, privacy notice, send, My stay link, desk Issues |
| Reception desk | `e2e/smoke/reception-desk.spec.ts` | **Skipped** unless `E2E_RECEPTION_LOGIN` + `E2E_RECEPTION_PIN` are set; includes ref search + Issues tab |

Everything below is **manual**.

---

## 3. P0 — release blockers

**Rule:** every **P0** row must be **Pass** before release. Log failures in **Notes**.

### A. Check-in & session

| # | Steps | Expected | Pass | Fail | Notes |
|---|-------|----------|------|------|-------|
| A1 | **No session**, open `/en/check-in` → enter valid 6-digit PIN | Activates stay; if no `entry=` → `/en/check-in/intent`; no spinner >10s | ☐ | ☐ | |
| A2 | On intent screen, tap **Still on my way** | `/en/welcome?step=route` | ☐ | ☐ | |
| A3 | New incognito: PIN again → tap **At the door** | `/en/welcome?step=arrival` | ☐ | ☐ | |
| A4 | New incognito: PIN again → tap **At reception** | `/en/welcome?step=settlement` | ☐ | ☐ | |
| A5 | **With session**, open magic link `?t=TOKEN` (no PIN form) | Lands on welcome per `entry` (default `step=route`); does **not** show PIN form | ☐ | ☐ | Issue link from reception or copy from Access tab |

### B. Magic links & `entry=` (skip intent)

Use **Copy send link** / **Copy QR link** on reception after issuing access, or append `entry=` manually.

| # | Steps | Expected | Pass | Fail | Notes |
|---|-------|----------|------|------|-------|
| B1 | Incognito → open link with `&entry=remote` | Auth → `/welcome?step=route`; **no** intent screen | ☐ | ☐ | Matches “Copy send link” |
| B2 | Incognito → open link with `&entry=door` | Auth → `/welcome?step=arrival` | ☐ | ☐ | QR link without `entry` may still show intent after PIN-equivalent token auth |
| B3 | Incognito → open link with `&entry=desk` | Auth → `/welcome?step=settlement` | ☐ | ☐ | |
| B4 | Incognito → open link with `&mode=onsite` (legacy) | Auth → `/welcome?step=arrival` | ☐ | ☐ | |

### C. Locked tabs & check-in sheet

**No session** (incognito) unless noted.

| # | Steps | Expected | Pass | Fail | Notes |
|---|-------|----------|------|------|-------|
| C1 | Open `/en/welcome?step=arrival` | Stays on welcome; **route** tab active; check-in sheet opens; **no** redirect to `/check-in` | ☐ | ☐ | |
| C2 | Same for `/en/welcome?step=settlement` | Same sheet behavior | ☐ | ☐ | |
| C3 | On welcome, tap locked **Access & Doors** chip | Sheet opens; chip does not switch to locked tab | ☐ | ☐ | |
| C4 | Tap locked **Settlement** chip | Same sheet | ☐ | ☐ | |
| C5 | In sheet, tap primary **Sign in** | Navigates to `/en/check-in` | ☐ | ☐ | |
| C6 | Close sheet (backdrop / dismiss) | Remains on welcome; URL still `/welcome` | ☐ | ☐ | |
| C7 | On **Route** tab, tap bottom primary CTA **without** session | Opens check-in sheet (not silent redirect) | ☐ | ☐ | |
| C8 | **Tenant without routes** (no Route chip), **no session**, Preparation tab | Bottom CTA is **Check in to continue** (not View Directions) | ☐ | ☐ | |
| C9 | Same tenant, tap Preparation bottom CTA | Check-in sheet; chip stays **Preparation**; no Access & Doors content | ☐ | ☐ | |
| C10 | **Tenant without routes**, open `/en/welcome?step=arrival` | **Preparation** tab active; check-in sheet (not Access content) | ☐ | ☐ | |

### D. Arrival guide tabs (after check-in)

Complete A1→A2 (or B1) first so session exists.

| # | Steps | Expected | Pass | Fail | Notes |
|---|-------|----------|------|------|-------|
| D1 | Tap **Preparation** chip | Two sections: **Before you travel** and **When you arrive** (not one merged block) | ☐ | ☐ | |
| D2 | Tap **Route To Hostel** | “From which location are you arriving?”; category tabs tappable | ☐ | ☐ | |
| D3 | Route → **Step by step** on primary route | Large bottom sheet (~full screen); scroll body; official link sticky at bottom if present; no horizontal page shift on open/close | ☐ | ☐ | |
| D4 | Close route sheet → **Taxi backup** (if shown) | Compact sheet; WA/tel actions work; close returns to route tab | ☐ | ☐ | |
| D5 | Tap **Access & Doors** | Door/access content; images load; bottom **Settling In** CTA visible without excessive scroll | ☐ | ☐ | |
| D6 | Route tab → bottom **How to Enter** CTA | Advances to Access & Doors (or sheet if session lost) | ☐ | ☐ | |

### E. Settlement copy by intent

Use a **fresh incognito** per row so intent is not reused from sessionStorage.

| # | Steps | Expected title on Settlement tab | Pass | Fail | Notes |
|---|-------|----------------------------------|------|------|-------|
| E1 | PIN → intent **Still on my way** → open Settlement | **When you're inside** | ☐ | ☐ | |
| E2 | PIN → intent **At the door** → open Settlement | **You're in!** | ☐ | ☐ | |
| E3 | PIN → intent **At reception** → open Settlement | **Welcome at reception** | ☐ | ☐ | |
| E4 | Magic link `entry=desk` → Settlement | **Welcome at reception** (no intent screen) | ☐ | ☐ | |

---

## 4. P1 — reception desk (optional)

Requires reception staff credentials and `E2E_RECEPTION_LOGIN` + `E2E_RECEPTION_PIN` in `e2e/env.local`.

| # | Steps | Expected | Pass | Fail | Notes |
|---|-------|----------|------|------|-------|
| R1 | Open reception → sign in with staff login + PIN | Issue access form visible | ☐ | ☐ | |
| R2 | Issue access for tonight | PIN shown **once**; QR + guest link + **Copy send link** | ☐ | ☐ | |
| R3 | Reload reception → Access list | PIN not shown again; QR/link still available | ☐ | ☐ | |
| R4 | **Copy send link** → open in incognito | `entry=remote` in URL; lands on `step=route` after auth | ☐ | ☐ | |
| R5 | **Copy QR link** (no `entry`) → open in incognito | Token auth; intent screen or default route per product rules | ☐ | ☐ | |
| R6 | Access tab → **Ref #XXXXXX** search | Finds stay, scrolls to row; `#ref` visible on list item | ☐ | ☐ | |

---

## 5. P1 — stay chip (header)

**My stay** only on Concierge (`/`). Hidden on Arrival guide, drill-down (`/guide`, `/services`, `/faq`), and check-in.

| # | Steps | Expected | Pass | Fail | Notes |
|---|-------|----------|------|------|-------|
| S1 | After PIN → Concierge (`/`) | Stay chip **My stay** top-right; stay essentials bridges; **fixed** reception strip at bottom | ☐ | ☐ | |
| S2 | Tap stay chip | Sheet: **For reception** block (bed, dates, **Ref #XXXXXX**); optional **Registered as** if name issued; copy icon in header; extend notice; room map link; footer WA extend (includes ref) | ☐ | ☐ | |
| S3 | Open Arrival guide (`/welcome`) | Stay chip **hidden**; header back shows **Concierge** label; no reception strip on welcome | ☐ | ☐ | |
| S3b | Concierge → **See all** on guide/services/faq | Header: icon-only back (no label), no brand, no My stay; back returns to Concierge | ☐ | ☐ | |
| S4 | Sheet → **Show room map** link (registration incomplete) | Lands on **`/registration`** (guest registration + contact prerequisites) | ☐ | ☐ | |
| S4b | Sheet → **Show room map** (registration complete) | Lands on **stay-setup** (`?step=room` or essentials per `resolveGuestStaySetupPath`) | ☐ | ☐ | |
| S5 | Concierge reception strip | **Fixed** at bottom; opens WA. On short viewport (≤520px height): compact single-line label, no hints | ☐ | ☐ | |
| S6 | Tap **copy icon** in For reception header | Clipboard has hostel, bed line, dates, Ref; icon briefly shows check | ☐ | ☐ | |
| S7 | My stay or rules sheet open on Concierge | Reception strip **hidden** until sheet closes | ☐ | ☐ | |

### Issues (report a problem)

After check-in on Concierge.

| # | Steps | Expected | Pass | Fail | Notes |
|---|-------|----------|------|------|-------|
| I1 | Concierge → **Report issue** card | Sheet opens; **privacy notice** visible; bed + Ref preview (no name emphasis) | ☐ | ☐ | |
| I2 | Choose category + optional note → **Send report** | Success screen with Ref; optional WA link | ☐ | ☐ | |
| I3 | My stay sheet → **Report issue** link | Same form as I1 | ☐ | ☐ | |
| I4 | Reception desk → **Issues** tab | New report with category, bed, ref; guest name secondary | ☐ | ☐ | Needs `E2E_RECEPTION_LOGIN` + `E2E_RECEPTION_PIN` |
| I5 | **Mark done** on desk | Row leaves Open filter | ☐ | ☐ | |
| I6 | Arrival guide Settlement / Access tabs | **No** Report card or link | ☐ | ☐ | |

---

## 6. P1 — locale & polish (not release blockers)

| # | Steps | Expected | Pass | Fail | Notes |
|---|-------|----------|------|------|-------|
| P1 | Repeat C1 + D1 on `/ru/welcome` | RU labels readable; sheet + tabs work | ☐ | ☐ | |
| P2 | Concierge link from settlement CTA | Navigates to concierge without error | ☐ | ☐ | |
| P3 | Cosmetic | Chip alignment, sheet animation, long route copy wrap | ☐ | ☐ | Optional |

---

## 7. Out of scope

Do not expand this pass into:

- Landing marketing pages
- Local Guide content accuracy
- Room map / Find your bed deep QA
- Admin arrival access editor
- New city-pack routes or copy edits
- PR4 desk QR variants / ops stickers (not shipped yet)

---

## 8. Quick reference — intent & entry

| Guest choice / `entry` | Welcome step | Settlement copy variant |
|------------------------|--------------|-------------------------|
| Still on my way / `remote` | `route` | When you're inside |
| At the door / `door` / `mode=onsite` | `arrival` | You're in! |
| At reception / `desk` | `settlement` | Welcome at reception |

---

## 9. Related docs

| Doc | Purpose |
|-----|---------|
| [`SMOKE.md`](../../SMOKE.md) | Run automation first |
| [`docs/tz/guest-entry-routing-v2.md`](../tz/guest-entry-routing-v2.md) | Product spec (may lag QA; prefer this file for acceptance) |
| [`docs/tz/locked-tab-sheet-v1.md`](../tz/locked-tab-sheet-v1.md) | Locked tab sheet spec |
| [`docs/tz/guest-stay-header-chip-v1.md`](../tz/guest-stay-header-chip-v1.md) | Stay chip in header spec |
| [`docs/tz/guest-stay-sheet-and-concierge-contact-v1.md`](../tz/guest-stay-sheet-and-concierge-contact-v1.md) | My stay sheet + Concierge contact |
| [`docs/tz/guest-stay-reception-reference-v1.md`](../tz/guest-stay-reception-reference-v1.md) | Reception ref block in My stay |
| [`docs/tz/guest-issues-v1.md`](../tz/guest-issues-v1.md) | Guest issue report + desk Issues tab |
