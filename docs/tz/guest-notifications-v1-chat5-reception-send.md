# TZ: Guest notifications — Chat 5 Reception send

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** M  
**Мастер-TZ:** [guest-notifications-v1.md](./guest-notifications-v1.md)

## Summary

Reception desk: отправка access message гостю через notification router; EN UI; не заменяет copy-to-clipboard в v1.

## Scope

### Action

- `sendGuestAccessNotificationAction({ tenantSlug, stayId })`
  - `assertReceptionAuthenticated`
  - Tenant `guestNotificationsEnabled` (если флаг из Chat 7 ещё не merged — проверка optional / env)
  - Load stay + prefs; build context для `renderGuestAccessMessage` (PIN decrypt pattern как в issue flow)
  - Call `sendGuestStayNotification` kind `access_issued` или `access_reissued`

### UI (reception-site, EN only)

- Кнопка «Send to guest» рядом с существующим copy template в `IssueGuestAccessForm` / row actions в `IssuedAccessList`.
- Toast / inline result: `push` | `whatsapp` | `sms` | `failed` (human-readable EN).
- Не добавлять `next-intl` в reception feature UI.

### Auto-send

- v1 default: **manual** button only; auto on issue — out of scope unless явно добавить tenant sub-flag v2.

## Поведение

- Stay revoked / expired → error.
- Router errors не ломают issue access flow (кнопка отдельная).

## Out of scope

- Guest PWA UI
- Webhook STOP
- Admin flag UI (Chat 7) — но action должен уважать флаг когда появится

## Acceptance

- [ ] Только authenticated reception session.
- [ ] Успешная отправка хотя бы одним каналом при настроенных prefs + env.
- [ ] English strings only in reception components.

## Файлы (strict)

- `src/features/guest-notifications/actions/sendGuestAccessNotificationAction.ts`
- `src/features/guest-notifications/index.ts`
- `src/features/guest-registration/ui/IssueGuestAccessForm.tsx` и/или `src/features/guest-registration/ui/IssuedAccessList.tsx` — минимальный diff
- `src/features/guest-registration/actions/receptionActions.ts` — только если нужен shared helper для PIN/link context (избегать дублирования)

## Промпт для чата

```
ТЗ Guest notifications Chat 5: reception Send to guest через router Chat 4. EN only, assertReceptionAuthenticated. Strict scope: docs/tz/guest-notifications-v1-chat5-reception-send.md
```
