# TZ: Concierge hub — Chat 1 Foundation

**Версия:** 1.0  
**Статус:** Draft  
**Приоритет:** P1  
**Оценка:** S (0.5–1 день)  
**Мастер-TZ:** [concierge-hub-v1.md](./concierge-hub-v1.md)

## Summary

Общий UI-каркас hub-секции, новые routes (`/guide`, `/services`, `/faq`), placeholder pages, рефактор `ConciergeContent` под зоны. Full-модули подключаются в Chat 2–4.

## Scope

- `ConciergeModuleSection`: header + children + optional footer link.
- Routes в `SITE_CONFIG` + страницы app-site.
- `ConciergeContent`: структура зон, wire compact-слотов (stub до Chat 2–4).
- `setInAppReturnTo(concierge.path)` при переходе на drill-down.

## Out of scope

- Реализация compact/full внутри LocalGuide, GuestExtras, FAQ.
- i18n для всех новых строк (Chat 5).
- Analytics.

## Поведение

### ConciergeModuleSection

Props (ориентир):

- `title` — заголовок секции
- `seeAllHref` — URL drill-down (опционально)
- `seeAllLabel` — текст CTA в header
- `children` — compact-контент модуля

Header: title слева, `See all →` справа (если `seeAllHref` задан).

### ConciergeContent

Порядок блоков — по IA из мастер-TZ. Тяжёлые модули оборачиваются в `ConciergeModuleSection`; inline full-версии убираются (временно stub или пустой children до следующих чатов).

### Drill-down pages

- `/guide`, `/services`, `/faq` — открываются, рендерят placeholder или full stub.
- Навигация назад / return ведёт на `/`.

## Acceptance

- [ ] `/guide`, `/services`, `/faq` открываются без ошибок.
- [ ] `SITE_CONFIG.routes.app` содержит `guide`, `services`, `faq`; типы не ломаются.
- [ ] `ConciergeContent` — читаемая структура зон hub.
- [ ] Inline full `LocalGuide` убран с главной (stub compact или секция без контента до Chat 2).
- [ ] Переход на drill-down устанавливает `setInAppReturnTo` как у `ArrivalGuideButton`.

## Файлы (strict)

- `src/shared/config/site.ts`
- `src/shared/ui/` — `ConciergeModuleSection` (или `src/features/concierge-hub/`)
- `src/views/concierge/ui/ConciergeContent.tsx`
- `src/app/app-site/[locale]/guide/page.tsx`
- `src/app/app-site/[locale]/services/page.tsx`
- `src/app/app-site/[locale]/faq/page.tsx`
- View-обёртки для drill-down (по FSD: `src/views/guide/`, `src/views/services/`, `src/views/faq/` или аналог)

## Промпт для чата

```
ТЗ Chat 1: Concierge hub foundation.
Реализуй ConciergeModuleSection, routes guide/services/faq в SITE_CONFIG,
placeholder pages, рефактор ConciergeContent под зоны hub.
Full-модули пока stub на drill-down pages. Strict file scope из docs/tz/concierge-hub-v1-chat1-foundation.md.
```
