# TZ: Guest tourism registration — Chat 2 Guest API

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** M  
**Мастер-TZ:** [guest-tourism-registration-mne-v1.md](./guest-tourism-registration-mne-v1.md)

## Summary

Клиентское сжатие фото и server actions: добавить гостя с документами, завершить регистрацию (WhatsApp на stay).

## Scope

### `compressImageForUpload` (client-safe import from feature lib)

- Вход: `File` (image/*, в т.ч. HEIC если браузер отдаёт)
- Выход: `File` или `Blob` как JPEG/WebP
- Max long edge ~1600px, quality ~0.8, целевой размер < ~500 KB где возможно
- Отклонять исходник > 10 MB до сжатия с понятной ошибкой

### `submitTourismGuestAction`

- Auth: `resolveGuestSessionFromCookies(tenantSlug)` — как другие guest actions
- Tenant: `tourismRegistrationRequired === true`
- Stay не завершён: `tourism_registration_completed_at` IS NULL
- FormData: `firstName`, `lastName`, `passport` (file), `entryStamp` (file)
- Upload через `getSupabaseAdmin()` → bucket `guest-documents`
- Path pattern: `{tenantId}/{stayId}/{guestRowId}/passport.webp` (и `entry-stamp.webp`)
- Insert в `guest_stay_tourism_guests`
- Return: `{ ok: true, guest: { id, firstName, lastName } }` или error keys

### `completeTourismRegistrationAction`

- Input: `contactWhatsapp` (string) — нормализация E.164 (переиспользовать существующие helpers tenant WhatsApp если есть)
- Требует ≥ 1 guest row для stay
- Sets `tourism_contact_whatsapp`, `tourism_registration_completed_at = now()`
- Idempotent: если уже completed — `{ ok: true, alreadyComplete: true }`

### `listTourismGuestsForSessionAction` (optional, для UI refresh)

- Возвращает список гостей + флаг complete без путей к storage (только ids и names)

## Поведение

- Фича выключена → `feature_disabled`
- Нет session → `unauthorized`
- После complete → `submitTourismGuestAction` → `registration_closed`

## Out of scope

- React UI (чат 3)
- Arrival journey gate (чат 4)
- Reception signed URLs (чат 5)

## Acceptance

- [ ] Upload только server-side service_role.
- [ ] Complete без guests и без whatsapp — ошибка валидации.
- [ ] Два гостя на один stay — две строки в БД, разные storage paths.

## Файлы (strict)

- `src/features/guest-tourism-registration/lib/compressImageForUpload.ts`
- `src/features/guest-tourism-registration/lib/validateTourismWhatsapp.ts` — если нет общего helper
- `src/features/guest-tourism-registration/api/uploadGuestTourismDocument.ts`
- `src/features/guest-tourism-registration/actions/submitTourismGuestAction.ts`
- `src/features/guest-tourism-registration/actions/completeTourismRegistrationAction.ts`
- `src/features/guest-tourism-registration/actions/listTourismGuestsForSessionAction.ts` — optional
- `src/features/guest-tourism-registration/index.ts`

Импорты entity только из `@/entities/guest-tourism-registration`.

## Промпт для чата

```
ТЗ Guest tourism registration Chat 2: compress + submitTourismGuestAction + completeTourismRegistrationAction.
Зависит от Chat 1. WhatsApp один на stay при complete. Strict scope: features/guest-tourism-registration (lib/api/actions).
```
