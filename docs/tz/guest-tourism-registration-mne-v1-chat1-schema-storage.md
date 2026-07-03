# TZ: Guest tourism registration — Chat 1 Schema & Storage

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** M  
**Мастер-TZ:** [guest-tourism-registration-mne-v1.md](./guest-tourism-registration-mne-v1.md)

## Summary

Миграции Postgres, private bucket Supabase Storage, entity slice с read/update для tourism registration.

## Scope

### Migration: `guest_stays`

```sql
tourism_contact_whatsapp text,
tourism_registration_completed_at timestamptz,
tourism_exported_at timestamptz
```

### Migration: `guest_stay_tourism_guests`

| Колонка | Тип |
|---------|-----|
| `id` | uuid PK default gen_random_uuid() |
| `stay_id` | uuid NOT NULL REFERENCES guest_stays(id) ON DELETE CASCADE |
| `first_name` | text NOT NULL |
| `last_name` | text NOT NULL |
| `passport_storage_path` | text NOT NULL |
| `entry_stamp_storage_path` | text NOT NULL |
| `created_at` | timestamptz NOT NULL default now() |

Index: `(stay_id)`.

### Storage bucket `guest-documents`

- `public = false`
- `file_size_limit` ≈ 2_097_152 (2 MB)
- `allowed_mime_types`: `image/jpeg`, `image/webp`
- Политики: **нет** insert/update для anon/authenticated; чтение через service_role / signed URLs в приложении

### Entity `entities/guest-tourism-registration`

Public API через `index.ts`:

- Types: `GuestTourismGuest`, `GuestTourismRegistrationSummary`
- `getTourismRegistrationByStayId(stayId)`
- `isTourismRegistrationComplete(summary | stayId)` — `completed_at` set AND guests.length >= 1
- `setTourismExportedAt(stayId, exported: boolean)` — для чата 5
- `listTourismGuestsByStayId(stayId)`

Опционально: расширить select в `guestStayRepository` / list stays полями-флагами для reception (counts).

## Поведение

- `guest_name` на stay **не трогать** в этом чате.
- Grant: как в других миграциях — service_role full; guest tables без прямого anon access.

## Out of scope

- Upload файлов, server actions, UI
- Signed URL generation (чат 5)

## Acceptance

- [ ] `npm run` migrate (или проектный migrate) применяет SQL.
- [ ] Bucket private; публичный URL не отдаёт файлы.
- [ ] Repository read возвращает агрегат по stay_id.

## Файлы (strict)

- `supabase/migrations/*_guest_tourism_registration.sql`
- `supabase/migrations/*_guest_documents_storage.sql`
- `src/entities/guest-tourism-registration/model/types.ts`
- `src/entities/guest-tourism-registration/api/guestTourismRegistrationRepository.ts`
- `src/entities/guest-tourism-registration/index.ts`
- `src/entities/guest-tourism-registration/server.ts` — если нужен re-export для server-only

## Промпт для чата

```
ТЗ Guest tourism registration Chat 1: schema + guest-documents bucket + entities/guest-tourism-registration read API.
Strict file scope: docs/tz/guest-tourism-registration-mne-v1-chat1-schema-storage.md
Не смешивать upload/UI в этот чат.
```
