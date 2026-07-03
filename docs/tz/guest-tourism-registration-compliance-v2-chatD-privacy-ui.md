# TZ: Guest tourism registration compliance — Chat D Privacy UI

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** S  
**Мастер-TZ:** [guest-tourism-registration-compliance-v2.md](./guest-tourism-registration-compliance-v2.md)

## Summary

Показать на шаге Register **privacy notice** (тексты из Chat A): кто обрабатывает данные, зачем, срок хранения; опционально ссылка на privacy policy tenant.

## Scope

### `TourismRegistrationPanel`

- Под блоком intro (или сразу после title/description): компактный notice — стиль как `GuestIssueReportSheet` `privacyNotice` (muted text, `text-xs` / `text-sm`).
- i18n keys: `pages.arrivalJourney.register.privacy.*` (body; optional link label).
- Если в tenant settings есть URL privacy policy (найти существующее поле или **не добавлять** новое без отдельного согласования) — `Link` external/new tab.

### Чекбокс «everyone listed»

- **Не заменять** на GDPR consent; оставить операционным.
- Отдельный optional checkbox «I have read…» — **только** если Chat A явно требует; иначе out of scope.

### Complete / read-only summary

- Notice можно не дублировать на summary screen (достаточно на форме до submit).

## Поведение

- Фича выключена → panel не показывается (без изменений).
- Registration complete → summary без обязательного повторного notice.

## Out of scope

- Retention job (Chat E).
- Landing privacy policy CMS.
- Юридическое написание текстов (берём из Chat A).

## Acceptance

- [ ] До complete на Register виден privacy block EN (+ RU если есть в A).
- [ ] Complete flow без регрессий.
- [ ] Нет смешения с notifications opt-in copy.

## Файлы (strict)

- `src/features/guest-tourism-registration/ui/TourismRegistrationPanel.tsx`
- `src/shared/i18n/en.json`, `ru.json` — `pages.arrivalJourney.register.privacy`
- Опционально один файл tenant resolver для privacy URL — **только если поле уже существует**; иначе stop и оставить текст без ссылки

## Промпт для чата

```
ТЗ Guest tourism registration compliance Chat D: privacy notice на TourismRegistrationPanel.
Тексты из Chat A. Не трогать everyoneListed checkbox как GDPR consent.
Strict scope: docs/tz/guest-tourism-registration-compliance-v2-chatD-privacy-ui.md
```
