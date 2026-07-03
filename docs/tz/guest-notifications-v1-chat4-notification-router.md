# TZ: Guest notifications — Chat 4 Notification router

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** L  
**Мастер-TZ:** [guest-notifications-v1.md](./guest-notifications-v1.md)

## Summary

Server-only router доставки с иерархией: Web Push → WhatsApp (opt-in) → SMS fallback.

## Scope

### Core

`sendGuestStayNotification(input)`:

- Input: `stayId`, `kind` (из Chat 0), `body` или template context, optional `tenantSlug` for template resolution.
- Output: structured `SendGuestStayNotificationResult` (per-channel attempts, final channel, errors без секретов).

### Иерархия

1. Если есть `web_push_subscription` — `web-push` send (attempt; не ждать delivery receipt в v1).
2. Если `whatsapp_messaging_allowed` и настроен gateway + destination phone — один текстовый блок.
3. Если WA fail / opt-out / skip — при `sms_transactional_allowed` и `sms_contact_e164` → Twilio SMS.

### Adapters (`lib/channels/`)

- `sendWebPush.ts` — VAPID from env
- `sendWhatsappGateway.ts` — HTTP client, env base URL + token; интерфейс под Green-API / Whapi
- `sendSmsTwilio.ts`

### Access message kind

Для `access_issued` / `access_reissued`: собрать body через `renderGuestAccessMessage` + `resolveGuestAccessMessageTemplate` (tenant settings), PIN/link из stay/reissue result — согласовать payload с Chat 5.

### Env

Missing config → channel `skipped` + reason code, не throw uncaught.

## Поведение

- Не использовать `tourism_contact_whatsapp` как consent flag.
- Логирование: `console.error` с message only, без tokens.

## Out of scope

- Публичный route handler для send.
- Inbound webhook (Chat 6).
- Reception UI (Chat 5).

## Acceptance

- [ ] Vitest matrix: prefs × channel success/fail (mocked adapters).
- [ ] Strict TypeScript, no `any`.
- [ ] Dependencies `web-push`, `twilio` added if missing.

## Файлы (strict)

- `src/features/guest-notifications/lib/sendGuestStayNotification.ts`
- `src/features/guest-notifications/lib/channels/sendWebPush.ts`
- `src/features/guest-notifications/lib/channels/sendWhatsappGateway.ts`
- `src/features/guest-notifications/lib/channels/sendSmsTwilio.ts`
- `src/features/guest-notifications/lib/notificationKinds.ts`
- `src/features/guest-notifications/lib/sendGuestStayNotification.test.ts`
- `src/features/guest-notifications/index.ts` — export server-only helpers if needed
- `package.json` / lock — new deps

## Промпт для чата

```
ТЗ Guest notifications Chat 4: server-only router Push → WA opt-in → SMS. Mocked adapter tests. Зависит от Chat 1. Strict scope: docs/tz/guest-notifications-v1-chat4-notification-router.md
```
