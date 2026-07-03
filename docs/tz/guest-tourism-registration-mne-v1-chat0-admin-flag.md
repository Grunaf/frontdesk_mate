# TZ: Guest tourism registration — Chat 0 Admin flag

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** S  
**Мастер-TZ:** [guest-tourism-registration-mne-v1.md](./guest-tourism-registration-mne-v1.md)

## Summary

Boolean в настройках tenant: включить обязательную туристическую регистрацию гостя (Montenegro).

## Scope

- `TenantSettings.guestStay.tourismRegistrationRequired?: boolean` (default `false` при отсутствии).
- Нормализация при чтении/save (как остальные поля `guestStay`).
- Admin UI: чекбокс + короткий help (EN), draft без `name`, hidden payload на submit.
- `readSettings` / `saveTenantAction` — парсинг и сохранение.

## Поведение

- `false` или отсутствует → guest app без шага `register` (чат 4 не ломает текущий flow).
- `true` → app-site читает флаг через `getTenantConfig` / `useTenant` (как другие settings).

## Out of scope

- UI guest app, миграции БД, storage.

## Acceptance

- [ ] Сохранение tenant с флагом on/off переживает reload admin.
- [ ] Guest-facing config отдаёт поле (для gate в чате 4).

## Файлы (strict)

- `src/entities/tenant/model/types.ts` (или где объявлен `TenantSettings` / `GuestStayConfig`)
- `src/entities/tenant/model/guestStay.ts` — при необходимости расширить `GuestStayConfig`
- `src/entities/tenant/lib/*` — normalize/readiness если есть единый normalize settings
- `src/app/admin/actions.ts` — `readSettings`
- `src/app/admin/(protected)/tenants/ui/TenantFormDraftContext.tsx`
- `src/app/admin/(protected)/tenants/ui/TenantFormHiddenPayload.tsx`
- `src/app/admin/(protected)/tenants/TenantFormAccordion.tsx` — секция Guest stay / compliance
- `src/app/admin/(protected)/tenants/lib/validateTenantFormBeforeSave.ts` — только если нужна явная валидация

## Промпт для чата

```
ТЗ Guest tourism registration Chat 0: tenant setting guestStay.tourismRegistrationRequired.
Strict file scope: docs/tz/guest-tourism-registration-mne-v1-chat0-admin-flag.md
Default false. Admin tenant form draft + hidden payload pattern.
```
