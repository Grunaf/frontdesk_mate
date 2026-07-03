# TZ: Guest tourism registration — Chat 4 Arrival gate

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** M  
**Мастер-TZ:** [guest-tourism-registration-mne-v1.md](./guest-tourism-registration-mne-v1.md)

## Summary

Шаг `register` в arrival journey; блокировка `settlement` до завершения tourism registration (если флаг tenant on).

## Scope

### Steps

`Step = 'info' | 'route' | 'arrival' | 'register' | 'settlement'`

### Coordinator

- Новый chip между arrival и settlement (i18n `pages.arrivalJourney.tabs.register`).
- `arrival.onComplete` → `register` (если флаг on), иначе → `settlement` как сейчас.
- `register` step: только `TourismRegistrationPanel`; onComplete → `settlement`.
- **PIN gate** без изменений: `REGISTRATION_LOCKED_STEPS` для guest session — `arrival`, `register`, `settlement` (уточнить: `register` тоже требует PIN).

### Tourism gate (только settlement content)

- Условие разблокировки settlement **контента**: guest session OK AND (`!tourismRegistrationRequired` OR `tourismRegistrationComplete`).
- Если пользователь на settlement без complete — redirect на `register` (и/или locked chip).
- URL `?step=settlement` при incomplete → `register`.
- URL `?step=register` — валидный step в effect парсере.

### Server props для welcome page

- `src/app/app-site/[locale]/welcome/page.tsx`: загрузить `tourismRegistrationComplete` для текущей guest session (repository чата 1).
- Передать в coordinator через props или thin wrapper provider (минимальный diff).

### Primary button keys

- Обновить `resolveArrivalJourneyPrimaryButtonKey` для шага `register`.

## Поведение

- Флаг tenant off: шаг `register` скрыт из chips; flow info → route → arrival → settlement.
- Флаг on: нельзя отрендерить `SettlementPhase` (Wi‑Fi, bed, rules) до complete.

## Out of scope

- Форма внутри panel (чат 3)
- Reception

## Acceptance

- [ ] С флагом on: после PIN guest попадает на register до settlement.
- [ ] FindYourBed / settlement widgets не видны до complete.
- [ ] С флагом off: регрессий нет.
- [ ] Deep link `?step=settlement` уважает tourism gate.

## Файлы (strict)

- `src/views/arrival-journey/model/useCheckInState.ts`
- `src/views/arrival-journey/ui/ArrivalJourneyCoordinator.tsx`
- `src/views/arrival-journey/lib/resolveArrivalJourneyPrimaryButtonKey.ts`
- `src/views/arrival-journey/lib/resolveArrivalJourneyPrimaryButtonKey.test.ts`
- `src/app/app-site/[locale]/welcome/page.tsx`
- `src/shared/i18n/messages/en.json` — tab label register

## Промпт для чата

```
ТЗ Guest tourism registration Chat 4: step register + gate settlement.
Зависит от Chat 0 flag, Chat 1 read API, Chat 3 TourismRegistrationPanel.
Strict file scope: docs/tz/guest-tourism-registration-mne-v1-chat4-arrival-gate.md
```
