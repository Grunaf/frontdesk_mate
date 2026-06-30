# TZ: Guest desk check-in — Chat 1 Schema & API

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** S  
**Мастер-TZ:** [guest-desk-check-in-v1.md](./guest-desk-check-in-v1.md)

## Summary

Миграция `guest_stays`, типы, server action `completeDeskCheckIn` для reception.

## Scope

- SQL migration: `desk_checked_in_at`, `key_issued_at`, `passport_checked_at`, `tax_collected_at`.
- Обновить `GuestStayRecord`, repository read/write.
- `completeDeskCheckInAction({ tenantSlug, stayId, passportChecked?, taxCollected?, keyIssued })` — reception auth.

## Поведение

- `desk_checked_in_at` = now при любом successful complete.
- `key_issued_at` = now если `keyIssued === true`.
- Optional fields только если галочки true.
- Idempotent: повторный complete — update или no-op (зафиксировать в реализации).

## Out of scope

- UI reception
- Guest app session

## Acceptance

- [ ] Миграция применяется.
- [ ] Action доступен только authenticated reception.
- [ ] Поля возвращаются в `listActiveGuestStays` / stay by id.

## Файлы (strict)

- `supabase/migrations/*_guest_stay_desk_check_in.sql`
- `src/entities/guest-stay/model/types.ts`
- `src/entities/guest-stay/api/guestStayRepository.ts`
- `src/features/guest-registration/actions/receptionActions.ts`

## Промпт для чата

```
ТЗ Guest desk check-in Chat 1: schema + completeDeskCheckInAction.
Strict file scope: docs/tz/guest-desk-check-in-v1-chat1-schema.md
```
