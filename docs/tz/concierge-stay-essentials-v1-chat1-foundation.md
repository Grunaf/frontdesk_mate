# TZ: Stay essentials — Chat 1 Foundation

**Версия:** 1.1  
**Статус:** Draft  
**Оценка:** S (0.5–1 день)  
**Мастер-TZ:** [concierge-stay-essentials-v1.md](./concierge-stay-essentials-v1.md)

## Summary

Feature slice `stay-essentials`: карточка-мостик, read state, список мостиков в порядке Wi‑Fi → Check-out → Night access → About reception. Sheets — заглушки. Wire в `ConciergeContent`, убрать `WifiCompactRow` и зону `NightAccessCard`.

## Scope

- `StayEssentialsBridgeCard` — layout по UI-контракту мастер-TZ.
- `useStayEssentialReadState(bridgeId)` — localStorage + `stayId`.
- `StayEssentialsBridges` — список мостиков в порядке Wi‑Fi → Check-out → Night → Reception; visibility stubs (night hidden до Chat 4).
- Пустые `BottomSheet` stubs per bridge.
- `ConciergeContent`: registered only, после `ArrivalGuideButton`.

## UI-контракт карточки

- **Title only**, top-left, без subtitle.
- **Icon** 36×36, `absolute bottom-left`, Lucide per bridge.
- **Chevron** справа.
- **Read dot** top-right inset: unread = ring; read = filled.
- **Background** default theme (accent из admin — Chat 6).
- **Min-height** ~88–96px; `relative`; padding для текста с учётом иконки снизу.

### Иконки (ориентир)

| bridgeId | Icon |
|----------|------|
| `wifi` | `Wifi` |
| `checkout` | `LogOut` или `DoorOpen` |
| `nightAccess` | `Moon` или `KeyRound` |
| `reception` | `ConciergeBell` или `Users` |

## Read state

```ts
// key: stayEssentialsRead:{tenantSlug}:{stayId}:{bridgeId}
// mark read on sheet onOpenChange(true) — first open
```

## Поведение

- Tap карточки → открыть соответствующий sheet.
- `registered` only; иначе блок не рендерится.
- Секция без видимых мостиков → не рендерить обёртку.

## Out of scope

- Реальный контент sheets (Chat 2–5).
- Admin colors (Chat 6).
- i18n кроме минимальных ключей title.

## Acceptance

- [ ] 4 мостика в фиксированном порядке.
- [ ] Layout: title top-left, icon 36×36 bottom-left, dot top-right.
- [ ] Нет subtitle на карточках.
- [ ] Open sheet → dot filled; persist после reload (тот же stay).
- [ ] `WifiCompactRow` и `NightAccessCard` убраны из `ConciergeContent`.
- [ ] Sheets открываются (stub body).

## Файлы (strict)

- `src/features/stay-essentials/` (index, model, ui)
- `src/views/concierge/ui/ConciergeContent.tsx`

## Промпт для чата

```
ТЗ Chat 1 stay-essentials foundation.
StayEssentialsBridgeCard (title only, icon 36px bottom-left, read dot top-right),
useStayEssentialReadState, StayEssentialsBridges, sheet stubs.
ConciergeContent: replace WifiCompactRow, remove NightAccessCard zone.
Strict file scope: docs/tz/concierge-stay-essentials-v1-chat1-foundation.md
```
