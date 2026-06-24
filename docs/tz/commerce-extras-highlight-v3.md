# TZ: Commerce Extras — Highlight visual tiles (v3)

**Version:** 3.0  
**Status:** Implemented  
**Depends on:** Commerce bento v2 (`guestExtras`, Concierge Extras)  
**Replaces in v2:** full-width hero tile (`col-span-2`)

## Goal

Promoted extras use a **horizontal featured strip** with square photo cards. All other extras use a **static 2×2 grid** below. Scroll gestures do not conflict: only the featured strip scrolls horizontally.

## Layout

| Zone | Condition | Max items | Scroll |
|------|-----------|-----------|--------|
| **Featured strip** | `highlight && imageUrl` | 4 | horizontal |
| **Standard grid** | everything else enabled | 4 (2 rows × 2) | none |

- Partner extras visible without check-in; ops only when registered.
- `partner_transfer` — no schedule (on-demand).
- Highlight without photo → standard grid (admin warning).

## Featured tile

- Square (`aspect-square`), ~44vw width (peek of next card).
- Background image, bottom gradient, title (2–3 words), price chip (`w-fit`, min 72×32px).
- Whole card opens bottom sheet.

## Standard tile

- Text card: title + price (+ schedule for tour/guide).
- Half width in 2-column grid, no photo.

## Bottom sheet

| Type | Size |
|------|------|
| Ops | `small` (~280px) |
| Partner, 1 CTA | `small` |
| Partner, WA + link | `compact` |

Description clamped to 2 lines in sheet.

## Data model

```ts
interface GuestExtraConfig {
  presetId: GuestExtraPresetId;
  enabled: boolean;
  highlight?: boolean;
  imageUrl?: string; // required for featured strip
  priceLabel?: string;
  scheduleLabel?: string; // not partner_transfer
  externalUrl?: string;
  whatsappEnabled?: boolean;
}
```

`ResolvedGuestExtra.tileVariant`: `'highlight' | 'standard'`.

## Admin

- Checkbox **Highlight (featured strip)**.
- **Tile image URL** + 1:1 preview when highlight is on.
- Warning if highlight without image; warning if >4 visual highlights.

## Analytics

`fdm:guest-extra` events include `tileVariant: 'highlight' | 'standard'`.

## QA

- [ ] 2+ featured cards scroll horizontally; grid below stays fixed.
- [ ] Vertical Concierge scroll unaffected by featured strip swipe.
- [ ] Laundry in standard grid; transfer with photo in featured strip.
- [ ] Sheet `small` for ops laundry flow.
