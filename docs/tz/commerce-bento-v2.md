# Commerce Extras — Bento v2

## Product model

| Type | Examples | Sheet CTAs |
|------|----------|------------|
| **Ops** | Laundry, early check-in, late checkout | «Come to reception» + optional WhatsApp |
| **Partner** | Transfer (on call), tour, paid guide | WhatsApp + external link |

- **Local Guide** (free places) stays below Extras — not commerce.
- **Paid guide** is a partner tile only.
- No taxi tile, extend stay on Concierge, online payment, or desk Orders v2 in this scope.

## Concierge order

```
Wi‑Fi → Extras (bento) → Report issue → Local Guide → FAQ
```

## Bento rules

- Max **4 tiles**, **2 rows** (hero counts toward limit).
- **Hero** (`highlight: true`) spans 2 columns; only the first highlighted tile is hero.
- Tap tile → **bottom sheet** (no direct WhatsApp from tile).
- Partner tiles visible **without** check-in; ops tiles only when registered.

## Admin catalog presets

`laundry`, `early_checkin`, `late_checkout`, `partner_transfer`, `partner_tour`, `partner_guide`

Per service: `enabled`, `priceLabel`, `highlight`, `externalUrl`, `whatsappEnabled`.

- **`scheduleLabel`** — only for scheduled partners (`partner_tour`, `partner_guide`).
- **`partner_transfer`** is on-demand — **no schedule field** in admin or guest UI.

Laundry is configured in **Concierge extras**, not house rules. Legacy `laundryCost` and laundry house rules migrate into the laundry extra on read.

## Example: on-demand transfer

```json
{
  "presetId": "partner_transfer",
  "enabled": true,
  "highlight": true,
  "priceLabel": "30€",
  "externalUrl": "https://partner.example/book",
  "whatsappEnabled": true
}
```

No `scheduleLabel`.

## Analytics

Custom events via `fdm:guest-extra`: `extras_tile_click`, `extras_sheet_open`, `extras_cta_reception`, `extras_cta_whatsapp`, `extras_cta_link`.
