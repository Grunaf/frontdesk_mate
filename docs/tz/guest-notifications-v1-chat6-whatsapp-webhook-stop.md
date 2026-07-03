# TZ: Guest notifications — Chat 6 WhatsApp inbound STOP

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** M  
**Мастер-TZ:** [guest-notifications-v1.md](./guest-notifications-v1.md)

## Summary

Route handler для inbound сообщений gateway: `STOP` → отзыв WA consent + подтверждение по SMS/Push (без WA).

## Scope

### Route

- `POST src/app/api/webhooks/whatsapp-inbound/route.ts`
- Verify provider signature / secret header (конкретный провайдер — env `WHATSAPP_GATEWAY_WEBHOOK_SECRET`).
- Parse body → normalized sender phone + message text.

### Logic

- `parseWhatsappInbound` — pure function + tests.
- If message matches `STOP` (case-insensitive, trim): find stay by `sms_contact_e164` + active window (document collision policy: latest active stay per tenant if needed).
- `revokeWhatsappMessaging(stayId)` → set `whatsapp_messaging_allowed false`, `whatsapp_messaging_revoked_at`.
- `sendGuestStayNotification` kind `whatsapp_opt_out_confirm` — channels push/sms only (router must skip WA for this kind or force flags).

### Response

- 200 quickly for provider retry safety; idempotent if already revoked.

## Поведение

- Invalid signature → 401.
- Unknown phone → 200 no-op (log info).

## Out of scope

- Two-way support chat
- Guest app UI

## Acceptance

- [ ] STOP revokes DB flag.
- [ ] Confirmation sent without WA.
- [ ] Tests for parse + STOP matcher.

## Файлы (strict)

- `src/app/api/webhooks/whatsapp-inbound/route.ts`
- `src/features/guest-notifications/lib/parseWhatsappInbound.ts`
- `src/features/guest-notifications/lib/parseWhatsappInbound.test.ts`
- `src/features/guest-notifications/lib/sendGuestStayNotification.ts` — только если нужен kind guard (минимально)

## Промпт для чата

```
ТЗ Guest notifications Chat 6: inbound webhook STOP → revoke whatsapp_messaging + confirm SMS/Push. Verify signature. Зависит от Chat 1, 4. Strict scope: docs/tz/guest-notifications-v1-chat6-whatsapp-webhook-stop.md
```
