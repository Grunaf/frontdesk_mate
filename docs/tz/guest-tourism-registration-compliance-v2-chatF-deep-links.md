# TZ: Guest tourism registration compliance — Chat F Deep links & smoke

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** S  
**Мастер-TZ:** [guest-tourism-registration-compliance-v2.md](./guest-tourism-registration-compliance-v2.md)

## Summary

Согласовать переходы на Settlement из concierge / guest stay с tourism gate; обновить smoke checklist.

## Scope

### Entry points (audit + fix)

| Источник | Текущее поведение | Целевое |
|----------|-------------------|---------|
| `FindYourBedCard` | `?step=settlement` | Если tourism required && !complete → `?step=register` **или** settlement + coordinator redirect (уже есть); опционально открыть sheet (Chat C) |
| `GuestStaySheet` settlement link | проверить path | то же |
| `welcome?step=settlement` deep link | redirect register | OK; document in SMOKE |

### Реализация (минимальный diff)

- Client hooks: `useIsGuestRegistered` + tourism complete flag — если complete только на server today, передать через существующий guest session / lightweight action или welcome page prop pattern (не дублировать тяжёлый fetch).
- Предпочтение: ссылки ведут на `?step=register` когда gate active, чтобы не полагаться только на client effect.

### SMOKE.md

- Расширить пункт MNE tourism:
  - locked Settlement → sheet (Chat C)
  - privacy notice on register (Chat D)
  - concierge «find bed» при incomplete → register

### E2E (optional)

- Расширить `e2e/smoke/guest-concierge.spec.ts` или arrival spec — только если стабильный PIN fixture есть.

## Поведение

- Tourism off → ссылки как сейчас на settlement.
- Tourism on, incomplete → гость не видит Wi‑Fi/bed map без register complete.

## Out of scope

- Retention (Chat E).
- Новые jurisdiction profiles beyond B.

## Acceptance

- [ ] Find your bed / stay sheet не обходит gate.
- [ ] SMOKE.md обновлён.
- [ ] `npm run smoke` manual checklist покрывает sheet + deep link.

## Файлы (strict)

- `src/features/find-your-bed/ui/FindYourBedCard.tsx`
- `src/features/guest-stay-chip/ui/GuestStaySheet.tsx` — если есть settlement href
- Опционально: `src/app/app-site/[locale]/welcome/page.tsx` — только если нужен prop для client link decisions
- `SMOKE.md`
- Опционально: `e2e/smoke/*.spec.ts`

## Промпт для чата

```
ТЗ Guest tourism registration compliance Chat F: deep links FindYourBed/GuestStaySheet + SMOKE.
Зависит от Chat B (gate flag) и Chat C (sheet). Не обходить tourism gate.
Strict scope: docs/tz/guest-tourism-registration-compliance-v2-chatF-deep-links.md
```
