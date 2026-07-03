# TZ: Guest tourism registration compliance — Chat E Retention & lifecycle

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** M–L  
**Мастер-TZ:** [guest-tourism-registration-compliance-v2.md](./guest-tourism-registration-compliance-v2.md)

## Summary

Реализовать **автоудаление** tourism document files и связанных чувствительных данных по policy из Chat A (storage limitation).

## Scope

### Policy (из Chat A)

- Зафиксировать триггер, например:
  - `guest_stays.check_out_at` + N days, **или**
  - `tourism_exported_at` + M days, **или**
  - max(check_out, exported) + N days.
- Что удаляем:
  - Объекты в bucket `guest-documents` по paths из `guest_stay_tourism_guests`.
  - Строки `guest_stay_tourism_guests` и/или очистка `passport_storage_path` / `entry_stamp_storage_path`.
  - Опционально: null `tourism_contact_whatsapp` после retention (решение в A).

### Job

- Server-only runner: Supabase Edge Function, cron route в Next, или существующий паттерн в репо (найти и повторить).
- Идемпотентность; batch limit; логирование (stay_id, tenant_id, deleted object count).
- **Не** удалять stays целиком — только tourism artifact.

### Reception / guest UX после удаления

- Signed URL actions → понятная ошибка «documents expired».
- Badge/status: «Documents purged» vs «Complete» (опционально, EN on reception).

### Safety

- Не удалять, если stay активен и `check_out_at` в будущем/null — уточнить в A.
- Dry-run flag в env для staging.

## Поведение

- Документы недоступны после policy; metadata stay (exported_at, completed_at) может остаться для аудита reception.

## Out of scope

- Backup/legal hold per tenant.
- Guest self-service erase API.
- Удаление bucket migration.

## Acceptance

- [ ] Тестовый stay с backdated check_out → job удаляет storage objects и обновляет DB.
- [ ] Повторный запуск job не падает.
- [ ] Reception view не ломается (empty state / message).
- [ ] Policy duration совпадает с Chat A.

## Файлы (strict)

- Новый job module, например `src/features/guest-tourism-registration/jobs/purgeExpiredTourismDocuments.ts` (или `scripts/` если так принято в проекте)
- `src/entities/guest-tourism-registration/api/guestTourismRegistrationRepository.ts` — delete/list helpers
- `src/features/guest-tourism-registration/actions/getTourismDocumentSignedUrlAction.ts` (или reception action) — expired handling
- `src/features/guest-registration/ui/IssuedAccessList.tsx` — только tourism block empty/error copy при необходимости
- Документация deploy cron в комментарии к job или `SMOKE.md` ops note (одна секция)
- `*.test.ts` для pure policy date function

## Промпт для чата

```
ТЗ Guest tourism registration compliance Chat E: retention job для guest-documents + guest_stay_tourism_guests.
Policy из Chat A. Idempotent batch job, reception graceful degradation.
Strict scope: docs/tz/guest-tourism-registration-compliance-v2-chatE-retention.md
```
