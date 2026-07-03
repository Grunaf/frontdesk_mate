# TZ: Guest tourism registration — Chat 5 Reception

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** M  
**Мастер-TZ:** [guest-tourism-registration-mne-v1.md](./guest-tourism-registration-mne-v1.md)

## Summary

Reception: статус tourism registration, просмотр документов, галочка «Submitted to tourism organization».

## Scope

### Actions (`features/guest-tourism-registration` или расширение `guest-registration/actions`)

- `setTourismExportedAction({ tenantSlug, stayId, exported: boolean })`
  - `assertReceptionAuthenticated`
  - `exported === true` → `tourism_exported_at = now()`
  - `exported === false` → `tourism_exported_at = NULL`
- `getTourismDocumentSignedUrlAction({ tenantSlug, stayId, guestId, kind: 'passport' | 'entry_stamp' })`
  - TTL 5–15 minutes
  - Возвращает signed URL только reception

### UI (reception-site, **EN only**)

В expand stay row (Access tab — `IssuedAccessList` / связанная панель):

- Показывать блок только если `settings.guestStay.tourismRegistrationRequired`
- **Name on reservation:** `guest_name` или «—»
- **Contact WhatsApp:** `tourism_contact_whatsapp` → `wa.me` link после complete
- **Status badge:** Not started | In progress (guests but not complete) | Complete
- **Guests table:** name, buttons View passport / View stamp (open signed URL new tab)
- **Checkbox:** «Submitted to tourism organization» bound to `tourism_exported_at`

### Read path

- Использовать `getTourismRegistrationByStayId` + поля stay из list payload (добавить в list stays при необходимости в repository).

## Поведение

- Guest complete и reception export — независимые статусы.
- Без tourism guests — badge Not started.

## Out of scope

- Guest app, admin flag UI
- Email/export file bundle

## Acceptance

- [ ] Только authenticated reception tenant.
- [ ] Signed URL не генерируется для guest session.
- [ ] Checkbox переживает refresh.
- [ ] UI English, без next-intl в reception если проект так устроен — plain strings OK.

## Файлы (strict)

- `src/features/guest-tourism-registration/actions/receptionTourismActions.ts`
- `src/features/guest-tourism-registration/index.ts` — export actions types
- `src/entities/guest-tourism-registration/api/guestTourismRegistrationRepository.ts` — update exported_at, signed url helper
- `src/features/guest-registration/ui/IssuedAccessList.tsx` — или выделенный `StayTourismRegistrationBlock.tsx` в том же feature
- `src/entities/guest-stay/api/guestStayRepository.ts` — только если нужны поля в list select (минимально)

## Промпт для чата

```
ТЗ Guest tourism registration Chat 5: reception view + signed URLs + exported checkbox.
Зависит от Chat 1. EN UI on reception-site. Strict scope: docs/tz/guest-tourism-registration-mne-v1-chat5-reception.md
```
