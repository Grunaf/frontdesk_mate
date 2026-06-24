# TZ: Guest services (commerce) v1

**Status:** In progress  
**Depends on:** guest stay session, Concierge, WA reception contact

## Problem

Laundry and similar services live in house rules (info-only). Guests need **service cards** with price + one-tap WA to reception.

## P1 scope

| Service | Price source | CTA |
|---------|--------------|-----|
| Laundry | `settings.laundryCost` or rule param | WA prefill with bed + ref |
| Late checkout | `settings.checkOutTime` | WA prefill |

- Section **Services** on Concierge (registered only), after Report issue
- Hide **laundry** house rule from FAQ when laundry service card is shown
- No in-app payment, no desk orders tab

## Non-goals v1

- Tours, towel rental, admin service editor
- Stripe / cart
- Replacing WA strip for general questions

## Acceptance

- C1: Registered guest sees Services with laundry (when cost configured)
- C2: WA message includes bed + Ref
- C3: Laundry rule hidden from house rules accordion when service shown
- C4: EN/RU, e2e smoke
