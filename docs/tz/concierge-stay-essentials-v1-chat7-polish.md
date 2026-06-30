# TZ: Stay essentials — Chat 7 Polish

**Версия:** 1.1  
**Статус:** Draft  
**Оценка:** S  
**Мастер-TZ:** [concierge-stay-essentials-v1.md](./concierge-stay-essentials-v1.md)  
**Зависимости:** Chat 2–6; night visibility — [guest-desk-check-in](./guest-desk-check-in-v1.md) Chat 3

## Summary

i18n, a11y, smoke, snapshot.

## Scope

### i18n

- `components.stayEssentials.bridges.*` — title мостиков (без subtitle).
- Sheet copy — per sheet namespaces.
- Night dismiss: «I picked up my room key».
- en + ru.

### a11y

- Bridge: `aria-label` с read state («Not viewed» / «Viewed»).
- `data-testid`: `stay-bridge-{bridgeId}`, `stay-bridge-{bridgeId}-indicator-read|unread`.

### Smoke / manual

- [ ] Registered: bridges title-only, layout icon 36 bottom-left, dot top-right.
- [ ] Wi‑Fi sheet + copy.
- [ ] Check-out / reception sheets при наличии данных.
- [ ] Night bridge: **скрыт** для guest с key issued / после dismiss / вне arrival window.
- [ ] Night bridge: **виден** для first-night guest без key (night + codes).
- [ ] Read dot persists; dismiss independent.
- [ ] My stay + reception strip OK.
- [ ] `npm run smoke` green.

### Snapshot

- `npm run snapshot` после фичи.

## Acceptance

- [ ] Нет hardcoded EN.
- [ ] Мастер-критерии выполнены.

## Файлы (strict)

- `src/shared/i18n/en.json`, `ru.json`
- `SMOKE.md` при необходимости

## Промпт для чата

```
ТЗ Chat 7 stay-essentials polish: i18n, a11y, testids, SMOKE (incl. night visibility), snapshot.
Strict file scope: docs/tz/concierge-stay-essentials-v1-chat7-polish.md
```
