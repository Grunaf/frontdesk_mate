# TZ: Guest desk check-in — Chat 3 Guest session wire

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** S  
**Мастер-TZ:** [guest-desk-check-in-v1.md](./guest-desk-check-in-v1.md)  
**Зависимости:** Chat 1

## Summary

Проброс `key_issued_at` (и `desk_checked_in_at`) в guest session для app-site.

## Scope

- `ResolvedGuestSession.keyIssuedAt?: string | null`
- Загрузка из БД при resolve session (cookie → stay lookup).
- `GuestSessionProvider` / consumers получают поле.

## Out of scope

- `resolveShowNightAccessBridge` (stay essentials Chat 4)
- Reception UI

## Acceptance

- [ ] Зарегистрированный гость после key issue на reception имеет `keyIssuedAt` в session.
- [ ] Без key issue — null.
- [ ] Нет PII leak beyond timestamps.

## Файлы (strict)

- `src/entities/guest-stay/model/types.ts`
- `src/entities/guest-stay/lib/guestSession.ts` (или resolve path)
- `src/features/guest-check-in/ui/GuestSessionProvider.tsx`
- app-site layout / server session loader

## Промпт для чата

```
ТЗ Guest desk check-in Chat 3: keyIssuedAt in ResolvedGuestSession.
Strict file scope: docs/tz/guest-desk-check-in-v1-chat3-guest-session.md
```
