# TZ: Guest notifications — Chat 1 Schema & entity

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** M  
**Мастер-TZ:** [guest-notifications-v1.md](./guest-notifications-v1.md)

## Summary

Миграция Postgres, entity slice для notification preferences на `guest_stays`, read/update через `service_role`.

## Scope

### Migration `029_guest_notifications.sql`

Колонки на `guest_stays` (см. мастер-TZ). Grants как в `028_guest_tourism_registration.sql` — без anon/authenticated direct table access.

### Entity `entities/guest-notification-preferences`

Public API через `index.ts` / `server.ts`:

- Types: `GuestNotificationPreferences`, `WebPushSubscriptionJson` (структура PushSubscription JSON, без `any`)
- `getNotificationPrefsByStayId(stayId)`
- `upsertNotificationPrefs(stayId, patch)` — phone, sms flag, wa flag + consent timestamps
- `saveWebPushSubscription(stayId, subscription)`
- `revokeWhatsappMessaging(stayId)` — для webhook Chat 6

### Guest stay list/select

Минимально расширить `GUEST_STAY_COLUMNS` + `mapRow` в `guestStayRepository`, если reception list должен показывать статус каналов (иначе только через prefs entity).

## Поведение

- `whatsapp_messaging_allowed` меняется на `true` только вместе с `whatsapp_messaging_consent_at`.
- `web_push_subscription` — upsert последней подписки (v1 one device).

## Out of scope

- PWA, Twilio, UI, webhook.

## Acceptance

- [ ] `npm run db:migrate` / migrate script применяет миграцию.
- [ ] Repository тесты на map/update (mock admin или pure mappers).
- [ ] Нет `any` в типах subscription json.

## Файлы (strict)

- `supabase/migrations/029_guest_notifications.sql`
- `src/entities/guest-notification-preferences/model/types.ts`
- `src/entities/guest-notification-preferences/api/guestNotificationPreferencesRepository.ts`
- `src/entities/guest-notification-preferences/server.ts`
- `src/entities/guest-notification-preferences/index.ts`
- `src/entities/guest-notification-preferences/api/guestNotificationPreferencesRepository.test.ts` — optional
- `src/entities/guest-stay/model/types.ts` — только если нужны поля в `GuestStayRecord`
- `src/entities/guest-stay/api/guestStayRepository.ts` — только select/map колонок

## Промпт для чата

```
ТЗ Guest notifications Chat 1: миграция 029 + entity guest-notification-preferences. Defaults из Chat 0. Не путать tourism_contact_whatsapp с whatsapp_messaging_allowed. Strict scope: docs/tz/guest-notifications-v1-chat1-schema-entity.md
```
