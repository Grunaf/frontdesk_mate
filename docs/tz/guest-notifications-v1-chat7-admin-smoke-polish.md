# TZ: Guest notifications — Chat 7 Admin flag, smoke, polish

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** S–M  
**Мастер-TZ:** [guest-notifications-v1.md](./guest-notifications-v1.md)

## Summary

Tenant flag в admin, smoke-сценарий, snapshot после склейки чатов 0–6.

## Scope

### Admin

- `TenantSettings.guestStay.guestNotificationsEnabled?: boolean` (default false).
- Draft UI + `TenantFormHiddenPayload` + `readSettings` / `saveTenantAction`.
- Чекбокс в секции Guest stay (рядом с tourism flag если есть).

### Guest / reception gate

- `useTenant` / `getTenantConfig` отдаёт флаг; Chat 3 UI и Chat 5 action уважают выключенное состояние.

### Smoke

- Секция в `SMOKE.md`: enable flag → guest opt-in → optional mock send on staging; webhook STOP manual note.

### Snapshot

- `npm run snapshot` после merge всех чатов.

### Tests (optional polish)

- Дополнить тесты из Chat 3–4 если пробелы; не новая функциональность.

## Out of scope

- Новые каналы доставки
- Per-tenant gateway credentials UI

## Acceptance

- [ ] Admin save/load flag.
- [ ] Guest block скрыт при flag off.
- [ ] `npm test` green для notification tests.
- [ ] Snapshot обновлён локально (gitignored).

## Файлы (strict)

- `src/entities/tenant/model/guestStay.ts` (или types settings)
- `src/app/admin/actions.ts` — readSettings
- `src/app/admin/(protected)/tenants/ui/TenantFormDraftContext.tsx`
- `src/app/admin/(protected)/tenants/ui/TenantFormHiddenPayload.tsx`
- `src/app/admin/(protected)/tenants/TenantFormAccordion.tsx`
- `SMOKE.md`
- `src/features/guest-notifications/**/*.test.ts` — только дополнения

## Промпт для чата

```
ТЗ Guest notifications Chat 7: admin guestStay.guestNotificationsEnabled + SMOKE.md + npm run snapshot. Паттерн TenantFormAccordion draft/hidden payload. После чатов 0–6. Strict scope: docs/tz/guest-notifications-v1-chat7-admin-smoke-polish.md
```
