# TZ: Guest desk check-in — Chat 2 Reception UI

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** S–M  
**Мастер-TZ:** [guest-desk-check-in-v1.md](./guest-desk-check-in-v1.md)  
**Зависимости:** Chat 1

## Summary

Кнопка **Complete desk check-in** на stay row в reception Access tab; sheet с чеклистом.

## Scope

- `DeskCheckInSheet` или dialog в `guest-registration` feature.
- Wire в `IssuedAccessList` / `StayRow`: кнопка если `!desk_checked_in_at`.
- Badge «Checked in» / key icon если `key_issued_at`.
- Optional чеклисты: passport (always optional v1), tax (if `shouldShowPreTripCityTax`), key (recommended default on).

## Поведение

- Submit → `completeDeskCheckInAction` → refresh stays list.
- После complete кнопка скрыта; в expand — timestamps read-only.
- Секция **Arriving today** — primary контекст использования.

## Out of scope

- Guest app
- Admin toggles для обязательности полей (v2)

## Acceptance

- [ ] Reception completes check-in с key issued.
- [ ] Stay row показывает checked-in state.
- [ ] Ошибки action отображаются.

## Файлы (strict)

- `src/features/guest-registration/ui/DeskCheckInSheet.tsx` (или аналог)
- `src/features/guest-registration/ui/IssuedAccessList.tsx`
- `src/features/guest-registration/index.ts`

## Промпт для чата

```
ТЗ Guest desk check-in Chat 2: Complete desk check-in UI on reception Access tab.
Strict file scope: docs/tz/guest-desk-check-in-v1-chat2-reception-ui.md
```
