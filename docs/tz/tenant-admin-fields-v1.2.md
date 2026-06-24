# TZ: Tenant admin — поля, зависимости, guest empty states (v1.2)

**Version:** 1.2  
**Status:** Implemented (Phases 1–3)  
**Depends on:** tenant-admin refactor v1 / v1.1 (8 sections, draft save, currency)  
**Goal:** единый контракт для admin-полей и гостевого UI — без слова «optional», с зависимостями между полями и предсказуемым поведением при пустых значениях.

## Problem

- Обязательность полей неочевидна; в copy встречается «optional».
- Связанные поля (booking engine ↔ room engine id, phone ↔ mask) не скрываются.
- Короткие поля растянуты на всю ширину.
- Пустые значения у гостя дают обрывистый UI (`from ` без time, tax без суммы).

## Principles

| Layer | Rule |
|-------|------|
| **Admin required** | Маркер только у обязательных: `Required for guests` + amber, пока пусто |
| **Admin optional** | Без маркера, без слова optional; hint объясняет fallback |
| **Dependencies** | Скрытое поле не считается incomplete |
| **Guest empty** | Каждое поле: hide / fallback / gate / degrade / filter / fail |

## Admin required pattern

Три уровня (источник истины):

- `blocker` — slug, name, subscription
- `must` — guest-path launch checklist
- `recommended` — advanced readiness

`missing={true}` только если поле must/blocker, пустое и `visible === true`.

## Field dependencies (summary)

| Parent | Child | Rule |
|--------|-------|------|
| `booking.provider === 'none'` | `bookingEngineId`, `bookingUrl`, `room.engineRoomTypeId` | hidden |
| `booking.provider !== 'none'` | `engineRoomTypeId` | visible; required if room on landing |
| `phoneRaw` empty, no default | mask, preset, preview | hidden |
| `displayMode === 'primary'` | secondary currency, rate | hidden |
| `roomMapEnabled === false` | floors, rooms, preview bed | hidden |

## Guest empty state contract

| Mode | Behavior |
|------|----------|
| `hide` | Block not rendered (WiFi, empty description) |
| `fallback` | Generic copy without empty placeholder |
| `gate` | Module preview/hidden via capabilities |
| `degrade` | Explicit hint / alternate CTA |
| `filter` | Data dropped at normalize (incomplete room card) |
| `fail` | Blocks guest path |

### Runtime fixes

1. **check-in empty** — hide PreTrip clock/luggage rows or gate `preTripInfo`
2. **city tax empty** — hide tax row in PreTrip
3. **room description empty** — compact card: title + `mt-auto` CTA footer, no empty paragraph; admin `LandingRoomCardPreview`
4. **WA booking** — room cards without `engineRoomTypeId` still valid

## Layout

| Width | Examples |
|-------|----------|
| `xs` | time, tax amount, price |
| `sm` | provider, engine id, internal id |
| `md` | phone, email |
| `lg` | image URL, hero |
| `full` | address, description |

Use `AdminFieldRow` for pairs (check-in/out, reception hours).

## Implementation files

| File | Purpose |
|------|---------|
| `src/app/admin/(protected)/tenants/lib/tenantAdminFieldSpecs.ts` | visibility / required helpers |
| `src/app/admin/(protected)/tenants/lib/tenantAdminFieldSpecs.test.ts` | unit tests |
| `src/entities/tenant/lib/resolveGuestFieldPresentation.ts` | guest empty presentation |
| `src/app/admin/(protected)/tenants/ui/AdminFieldRow.tsx` | layout row |
| `AdminField`, `AdminPhoneField`, `LandingFields`, `PreTripInfo`, `RoomsGallery` | wired consumers |

## Acceptance criteria

**Admin:** no «optional» in tenant field labels/hints; conditional fields hidden; short fields not full-width.  
**Guest:** no broken i18n placeholders; tax/check-in rows hidden when empty; WA rooms work without engine id.  
**Tests:** `tenantAdminFieldSpecs.test.ts`, `resolveGuestFieldPresentation.test.ts`, updated `resolveLandingRooms.test.ts`.

## Rollout order

1. Specs + guest presentation helpers + tests  
2. Guest runtime fixes (PreTrip, RoomsGallery, resolveLandingRooms)  
3. AdminField width/row, AdminPhoneField collapse  
4. Landing + Booking + Contacts copy and wiring  
5. Section progress in nav (follow-up)
