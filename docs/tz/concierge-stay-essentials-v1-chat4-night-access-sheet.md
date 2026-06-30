# TZ: Stay essentials — Chat 4 Night access sheet + visibility

**Версия:** 1.1  
**Статус:** Draft  
**Оценка:** S–M  
**Мастер-TZ:** [concierge-stay-essentials-v1.md](./concierge-stay-essentials-v1.md)  
**Зависимости:** Chat 1; [guest-desk-check-in Chat 3](./guest-desk-check-in-v1-chat3-guest-session.md) для `keyIssuedAt`

## Summary

Sheet «Night access» + **строгая видимость мостика**. Большинство гостей мостик **не видят**. Reuse `NightAccessCard` content.

## Job night access

Помочь **в первую ночь** попасть внутрь **без ключа**, когда ресепшен закрыт. Не справочник «коды хостела на весь stay».

## Visibility — `resolveShowNightAccessBridge`

Мостик **отсутствует в списке**, если любое false:

| # | Условие | Источник |
|---|---------|----------|
| 1 | Door codes configured | `hasNightDoorCodes(settings)` |
| 2 | Arrival window | `isWithinArrivalWindow(checkInAt)` |
| 3 | Night context | `isNightMode` **OR** (check-in day AND `now > reception.close`) |
| 4 | Key not issued | `!keyIssuedAt` из session ([desk check-in](./guest-desk-check-in-v1.md)) |
| 5 | Not self-dismissed | `!readNightAccessDismissed(stayId)` localStorage |
| 6 | Registered | session |
| 7 | Feature gate | `module="nightAccess"` |

**Fallback без desk check-in (до ship):** пункт 4 считать true (ключ не выдан), пункт 5 — guest dismiss в sheet.

### Read dot vs visibility

- **Read dot** — только «открывал sheet»; **не** скрывает мостик.
- **Dismiss** — отдельная кнопка в sheet.

## Sheet content

- Коды: `resolveArrivalAccessPlan` + coded steps (как `NightAccessCard`).
- Disclaimer из `components.nightAccess`.
- Link «Full access guide» → welcome arrival (text).
- Footer: **«I picked up my room key»** → `persistNightAccessDismissed(stayId)` + закрыть sheet; мостик исчезает.

```ts
// localStorage: stayEssentialsNightDismissed:{tenantSlug}:{stayId}
```

## Out of scope

- Day door codes full guide
- Изменение `useNightMode` hours (23–8 default)
- Показ мостика днём «для информации» — **нет**

## Acceptance

- [ ] Long-stay guest (day 3+) не видит мостик.
- [ ] Guest с `keyIssuedAt` не видит мостик.
- [ ] Guest после dismiss не видит мостик (тот же stay).
- [ ] Целевой гость (первая ночь, night, codes, no key) видит мостик и коды в sheet.
- [ ] `NightAccessCard` убран с concierge home.
- [ ] Read dot работает независимо от dismiss.

## Файлы (strict)

- `src/features/stay-essentials/model/resolveShowNightAccessBridge.ts`
- `src/features/stay-essentials/model/nightAccessDismiss.ts`
- `src/features/stay-essentials/ui/StayEssentialsNightAccessSheet.tsx`
- `src/features/stay-essentials/ui/StayEssentialsBridges.tsx`

## Промпт для чата

```
ТЗ Chat 4 stay-essentials: Night access sheet + resolveShowNightAccessBridge.
keyIssuedAt from session, arrival window, night/late gate, guest dismiss in sheet.
Strict file scope: docs/tz/concierge-stay-essentials-v1-chat4-night-access-sheet.md
```
