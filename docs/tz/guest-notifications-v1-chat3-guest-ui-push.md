# TZ: Guest notifications — Chat 3 Guest UI & push registration

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** M–L  
**Мастер-TZ:** [guest-notifications-v1.md](./guest-notifications-v1.md)

## Summary

Opt-in UI в guest app (en/ru), сохранение prefs и регистрация Web Push после guest session.

## Scope

### Размещение UI

Рекомендация: шаг **`settlement`** в `ArrivalJourneyCoordinator` **или** сразу после успешного PIN/link check-in — **до** night door codes (`features/door-access`). Не на шаге `register` (tourism).

Показывать блок только если `settings.guestStay.guestNotificationsEnabled` (если флаг ещё нет — Chat 7; временно можно gate по env).

### UI

- `NotificationPreferencesBlock`: checkbox WA **off** by default, disclaimer (Chat 0 texts), phone field `sms_contact_e164` (E.164 validation — переиспользовать `validateTourismWhatsapp` или shared helper).
- Пояснение fallback: SMS / PWA.
- `AddToHomeScreenHint` — soft prompt (beforeinstallprompt где доступен).
- После save prefs — опционально `Notification.requestPermission()` + register push.

### Server actions

- `saveGuestNotificationPrefsAction` — `resolveGuestSessionFromCookies`, tenant flag on.
- `registerWebPushSubscriptionAction` — принимает serializable PushSubscription JSON, `saveWebPushSubscription`.

### i18n

- `src/shared/i18n/en.json`, `ru.json` — namespace согласовать (`notifications.*` или `guestNotifications.*`).

## Поведение

- Нет session → `unauthorized`.
- Фича выключена → `feature_disabled`.
- Отказ push permission не блокирует settlement / door access.
- WA opt-in `true` только при явной галочке + consent timestamp на сервере.

## Out of scope

- Router send, reception, webhook.
- Tourism registration fields.

## Acceptance

- [ ] Prefs persist после reload (server read).
- [ ] Push subscription сохраняется при granted permission.
- [ ] i18n validate-i18n green.

## Файлы (strict)

- `src/features/guest-notifications/ui/NotificationPreferencesBlock.tsx`
- `src/features/guest-notifications/ui/AddToHomeScreenHint.tsx`
- `src/features/guest-notifications/lib/readWebPushSupport.ts`
- `src/features/guest-notifications/actions/saveGuestNotificationPrefsAction.ts`
- `src/features/guest-notifications/actions/registerWebPushSubscriptionAction.ts`
- `src/features/guest-notifications/index.ts`
- `src/views/arrival-journey/ui/ArrivalJourneyCoordinator.tsx` **или** `src/features/guest-check-in/ui/CheckInPageContent.tsx` — один host по решению в чате
- `src/shared/i18n/en.json`, `ru.json`

## Промпт для чата

```
ТЗ Guest notifications Chat 3: opt-in UI + saveGuestNotificationPrefsAction + registerWebPushSubscriptionAction. i18n en/ru. Зависит от Chat 1–2. Тексты из Chat 0. Strict scope: docs/tz/guest-notifications-v1-chat3-guest-ui-push.md
```
