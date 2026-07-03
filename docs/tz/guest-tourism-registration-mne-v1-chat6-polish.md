# TZ: Guest tourism registration — Chat 6 Polish

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** S  
**Мастер-TZ:** [guest-tourism-registration-mne-v1.md](./guest-tourism-registration-mne-v1.md)

## Summary

Тесты, smoke-заметки, snapshot после склейки чатов 0–5.

## Scope

### Unit tests

- `compressImageForUpload` — mock canvas / фикстура small blob (если тестируемо без DOM — extract pure math helper)
- `validateTourismWhatsapp` / E.164
- `isTourismRegistrationComplete`
- `resolveArrivalJourneyPrimaryButtonKey` для `register`

### Integration / action tests (optional)

- `submitTourismGuestAction` с mocked admin storage (паттерн `uploadTenantAsset.test.ts`)

### E2E (optional, если есть guest PIN flow)

- Tenant e2e с флагом on: PIN → add guest (mock storage?) → settlement shows bed section

### Docs / ops

- Краткий пункт в `SMOKE.md`: включить флаг, пройти register, reception checkbox (если в проекте принято)

### Snapshot

- `npm run snapshot` после merge всех чатов

## Out of scope

- Новая функциональность
- Retention job для storage

## Acceptance

- [ ] `npm test` / project test runner green для добавленных тестов.
- [ ] Snapshot обновлён локально (файл gitignored).

## Файлы (strict)

- `src/features/guest-tourism-registration/**/*.test.ts`
- `src/views/arrival-journey/lib/resolveArrivalJourneyPrimaryButtonKey.test.ts`
- `SMOKE.md` — только при согласованной практике проекта (одна секция)

## Промпт для чата

```
ТЗ Guest tourism registration Chat 6: tests + smoke note + npm run snapshot.
После завершения чатов 0–5. Strict scope: docs/tz/guest-tourism-registration-mne-v1-chat6-polish.md
```
