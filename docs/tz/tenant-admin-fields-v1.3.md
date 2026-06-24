# TZ: Tenant admin — layout, dirty state, currency hints, phones (v1.3)

**Version:** 1.3  
**Status:** Implemented  
**Depends on:** tenant-admin-fields v1.2  
**Goal:** стабильная вёрстка полей, честный unsaved, валюта у цен, один вход для телефонов, единая карточка комнаты.

## Layout

- Label сверху для всех input/time/phone/select; сбоку только checkbox.
- Time в ряду — без hint внутри колонки; hint под полем на отдельной строке.
- `AdminMoneyField` — amount + badge primary currency.

## Dirty state

- `syncDraft()` — обновляет draft без `isDirty`.
- `updateDraft()` — помечает unsaved (только user actions).
- Guest app tabs не размонтируются (`hidden`).
- Mount `useEffect` → `syncDraft` или удалены.

## Phones

- Full settings: reception phone + collapsible «Different numbers for specific channels».
- Launch WA: info + кнопка «Open Reception & hostel» (без отдельного booking phone).

## Room card

- Канон: `LandingRoomCard` (`variant="live" | "preview"`).
- `LandingRoomCardPreview` — admin shell + hints.

## Phases

| Phase | Scope |
|-------|--------|
| 3a | Dirty fix |
| 3b | Time rows |
| 3c | AdminMoneyField |
| 3d | Phone UX + launch |
| 3e | LandingRoomCard preview |
