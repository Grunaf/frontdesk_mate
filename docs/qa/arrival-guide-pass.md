# Arrival guide — manual QA pass

**When:** after `npm run smoke` is green, before merging guest-app / arrival changes.  
**Time:** ~15–20 min on a real phone or DevTools **375×812**.

---

## Preconditions


| Item              | Value                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| Dev server        | `npm run dev` running                                                                                     |
| Tenant            | Same as `E2E_TENANT_SLUG` in `e2e/env.local` (e.g. `vega`)                                                |
| Guest PIN         | Run `npm run smoke` once (auto-provision) **or** issue access on reception and set `E2E_GUEST_PIN`        |
| Check-in URL      | Flat: `http://app.localhost:3000/en/check-in` · Subdomain: `http://{slug}.app.localhost:3000/en/check-in` |
| Arrival guide URL | `…/en/welcome` (optionally `?step=route` / `?step=arrival`)                                               |
| Viewport          | **375px** width (iPhone SE / DevTools responsive)                                                         |
| Locale            | EN first; repeat critical paths on `/ru/welcome` if you ship RU                                           |


---

## P0 scenarios (release blockers)


| #   | Steps                                                                                                        | Expected                                                                                                                    | Pass | Fail | Notes |
| --- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ---- | ---- | ----- |
| 1   | Open check-in URL → enter valid 6-digit PIN                                                                  | Intent screen (if no `entry=`); pick option → `/welcome?step=route`; no stuck spinner >10s                                  | ☐    | ☐    |       |
| 2   | On welcome, tap **Route** chip                                                                               | “From which location are you arriving?” (or equivalent); category tabs visible and tappable                                 | ☐    | ☐    |       |
| 3   | Route tab → tap **Step by step** (primary route)                                                             | Large bottom sheet (~full screen) with grabber; title stays fixed; scroll body to end; official link/button sticky at bottom if route has one; no horizontal page shift on open/close | ☐    | ☐    |       |
| 4   | Close route sheet → open **Taxi backup** (if card shown)                                                     | Compact sheet (content-height, not full screen); WA/tel actions tappable; close returns to route tab without page shifted left/right | ☐    | ☐    |       |
| 5   | **Without** PIN (incognito): open `/en/welcome?step=arrival` or tap locked **Arrival** / **Settlement** chip | Redirect to `/en/check-in` (not reception call sheet)                                                                       | ☐    | ☐    |       |
| 6   | After PIN check-in: **Arrival** tab                                                                          | Door/access content visible; images load; bottom **Continue** CTA visible without scrolling the whole page off-screen       | ☐    | ☐    |       |
| 7   | Route tab → primary CTA at page bottom                                                                       | Button full width, not clipped; tap advances to next step (or redirects to check-in if still locked)                          | ☐    | ☐    |       |


**Release rule:** all P0 rows **Pass**. Any **Fail** → log in Notes, fix or defer with explicit P1 ticket.

---

## Cosmetic (not release blockers)

- Minor spacing / chip alignment
- Sheet handle animation
- Long route copy wrapping on very small screens
- RU strings slightly longer than EN
- Concierge → “How to get to the hostel” link styling

---

## Out of scope (do not expand this pass)

- Landing / reception desk
- Room map / Find your bed
- Local Guide content accuracy
- Booking / WhatsApp hero
- Admin arrival access editor
- New city-pack routes or copy changes

---

## Quick links (flat dev)

Replace `{slug}` with your tenant slug.

```
http://app.localhost:3000/en/check-in
http://app.localhost:3000/en/welcome
http://app.localhost:3000/en/welcome?step=route
http://app.localhost:3000/en/welcome?step=arrival
```
