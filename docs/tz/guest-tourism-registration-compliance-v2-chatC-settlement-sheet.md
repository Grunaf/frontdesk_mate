# TZ: Guest tourism registration compliance — Chat C Settlement sheet

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** S  
**Мастер-TZ:** [guest-tourism-registration-compliance-v2.md](./guest-tourism-registration-compliance-v2.md)

## Summary

При клике на **заблокированный** chip Settlement (guest **с PIN**, tourism registration **не complete**, флаг tenant on) показывать **bottom sheet** с объяснением и CTA «Go to registration» — по паттерну `CheckInRequiredSheet`, без silent redirect только сменой tab.

## Scope

### Компонент `TourismRegistrationRequiredSheet`

- Расположение: `src/features/guest-tourism-registration/ui/` или `src/features/guest-check-in/ui/` (если логически рядом с arrival gate — предпочтительно **guest-tourism-registration** или thin re-export из `guest-check-in` public API).
- Props: `open`, `onOpenChange`, `onGoToRegistration: () => void`.
- UI: `BottomSheet` из `@/shared/ui`, структура как `CheckInRequiredSheet` (header, short steps, footer button).
- Тексты: i18n `pages.arrivalJourney.tourismGate.*` (строки из Chat A).

### `ArrivalJourneyCoordinator`

- State: `tourismGateSheetOpen`.
- `handleLockedChipClick` + `handleStepChange`: если `isSettlementTourismLocked(...)` → **open sheet** (не только `setCurrentStep('register')`).
- CTA в sheet: закрыть sheet + `setCurrentStep('register')`.
- **PIN locked** settlement по-прежнему → `CheckInRequiredSheet` (без изменений).
- Опционально: primary button на settlement при `!canAccessSettlement` и PIN ok → open sheet вместо silent jump (согласовать с redirect effect).

### Не ломать

- URL effect: `?step=settlement` при incomplete → может оставаться redirect на `register`; sheet — **on explicit locked chip click** (минимум из acceptance). Если product хочет sheet и на deep link — отдельный пункт в F.

## Поведение

| Состояние | Клик locked Settlement |
|-----------|-------------------------|
| Нет PIN | `CheckInRequiredSheet` |
| PIN есть, tourism incomplete | `TourismRegistrationRequiredSheet` |
| Tourism complete | обычная навигация |

## Out of scope

- Изменение tourism form (Chat D).
- Deep links с concierge (Chat F).
- Jurisdiction profile (Chat B).

## Acceptance

- [ ] Locked Settlement + PIN + incomplete → sheet visible, copy из i18n.
- [ ] CTA переводит на step `register`.
- [ ] Locked arrival/register без PIN → по-прежнему check-in sheet.
- [ ] Tourism complete: Settlement chip не locked.

## Файлы (strict)

- `src/features/guest-tourism-registration/ui/TourismRegistrationRequiredSheet.tsx` (new)
- `src/features/guest-tourism-registration/index.ts` — export
- `src/views/arrival-journey/ui/ArrivalJourneyCoordinator.tsx`
- `src/shared/i18n/en.json`, `ru.json` — `pages.arrivalJourney.tourismGate`
- Опционально: `src/features/guest-check-in/index.ts` — re-export если нужен единый импорт в coordinator (только если согласовано в чате)

## Промпт для чата

```
ТЗ Guest tourism registration compliance Chat C: TourismRegistrationRequiredSheet + ArrivalJourneyCoordinator locked Settlement click.
Тексты tourismGate из Chat A. Паттерн CheckInRequiredSheet.
Strict scope: docs/tz/guest-tourism-registration-compliance-v2-chatC-settlement-sheet.md
```
