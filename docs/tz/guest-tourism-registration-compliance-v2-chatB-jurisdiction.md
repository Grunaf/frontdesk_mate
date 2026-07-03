# TZ: Guest tourism registration compliance — Chat B Jurisdiction profile

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** M  
**Мастер-TZ:** [guest-tourism-registration-compliance-v2.md](./guest-tourism-registration-compliance-v2.md)

## Summary

Убрать хардкод Montenegro: tenant настраивает **профиль юрисдикции** и набор обязательных документов; i18n и server validation читают профиль, не фиксированные `passport` + `entryStamp` + тексты ME.

## Scope

### Settings model

- Расширить `GuestStayConfig`, например:

```ts
tourismRegistration?: {
  enabled: boolean;
  profileId: string; // default 'me'
};
```

- **Backward compat:** `tourismRegistrationRequired === true` без объекта → `{ enabled: true, profileId: 'me' }`.
- `resolveTourismRegistrationRequired(settings)` — true если `enabled`.
- Новый resolver: `resolveTourismRegistrationProfile(settings)` → `{ profileId, countryNameKey, requiredDocumentKinds }`.

### Registry (код, не admin free-text)

- `src/features/guest-tourism-registration/model/tourismRegistrationProfiles.ts` (или `entities/tenant` — один источник правды):
  - `me`: kinds `passport`, `entry_stamp`; i18n keys с интерполяцией `{country}`.
- Публичный API слайса — через `index.ts`.

### Admin

- Чекбокс: «Require guest tourism registration» (без Montenegro в title).
- Select profile (v2: только `me`; задел под новые id).
- Draft + hidden payload + `readSettings` / `saveTenantAction` / `normalizeGuestStaySettings`.

### Guest UI & API

- `AddTourismGuestForm`: поля upload по `requiredDocumentKinds` из профиля.
- `submitTourismGuestAction`: валидация файлов по профилю; storage paths по kind.
- i18n: заменить hardcoded Montenegro в `pages.arrivalJourney.register.intro.*` на ключи с `{country}` или profile-specific keys из registry.
- Убрать Montenegro из комментария в `guestStay.ts`.

### Reception

- Labels «entry stamp» / document kinds — из profile или generic i18n (EN only on reception).

## Поведение

- Profile `me` + enabled → поведение идентично текущему v1.
- Enabled + unknown profileId → fail safe: treat as disabled или admin validation error on save.
- Profile off → нет шага register (без регрессий).

## Out of scope

- Новые страны кроме registry entry `me` (только задел select + типы).
- Миграция БД для document kinds (paths остаются `passport` / `entry-stamp` для `me`).
- Chat C/D/E/F.

## Acceptance

- [ ] Admin save/load: enabled + profileId.
- [ ] Guest app intro не содержит «Montenegro» в коде — только из i18n + profile country name.
- [ ] Submit без обязательного kind для активного профиля → `invalid_input`.
- [ ] Старые tenants с только `tourismRegistrationRequired: true` работают как `me`.

## Файлы (strict)

- `src/entities/tenant/model/guestStay.ts`
- `src/entities/tenant/model/types.ts` (если `TenantSettings` там)
- `src/entities/tenant/lib/normalizeGuestStaySettings.ts`
- `src/app/admin/actions.ts` — `readSettings` при необходимости
- `src/app/admin/(protected)/tenants/ui/TenantFormDraftContext.tsx`
- `src/app/admin/(protected)/tenants/ui/TenantFormHiddenPayload.tsx`
- `src/app/admin/(protected)/tenants/TenantFormAccordion.tsx` — `GuestTourismRegistrationComplianceField`
- `src/features/guest-tourism-registration/model/tourismRegistrationProfiles.ts` (new)
- `src/features/guest-tourism-registration/index.ts`
- `src/features/guest-tourism-registration/ui/AddTourismGuestForm.tsx`
- `src/features/guest-tourism-registration/actions/submitTourismGuestAction.ts`
- `src/shared/i18n/en.json`, `ru.json` — register intro + document labels
- Unit tests: normalize + profile resolver (new `*.test.ts` в scope feature/tenant)

## Промпт для чата

```
ТЗ Guest tourism registration compliance Chat B: jurisdiction profile, de-hardcode Montenegro.
Зависит от Chat A (профиль me, country name). Backward compat tourismRegistrationRequired.
Strict scope: docs/tz/guest-tourism-registration-compliance-v2-chatB-jurisdiction.md
```
