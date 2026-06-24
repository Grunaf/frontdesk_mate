# TZ: Concierge hub — Chat 5 Polish

**Версия:** 1.0  
**Статус:** Draft  
**Приоритет:** P2  
**Оценка:** S (0.5 дня)  
**Мастер-TZ:** [concierge-hub-v1.md](./concierge-hub-v1.md)  
**Зависимости:** Chat 2, 3, 4

## Summary

i18n, smoke-проверка, snapshot после завершения всех hub-чатов. Опционально — hub analytics events.

## Scope

- Недостающие i18n-ключи для hub-секций и page titles.
- Ручной / smoke чеклист app home + drill-down routes.
- `npm run snapshot` после крупных изменений.
- Опционально: product analytics для hub (не блокер v1).

## Out of scope

- Новая функциональность модулей.
- Consent / PostHog infra (см. [analytics-v1.md](./analytics-v1.md)).

## i18n (ориентир ключей)

| Ключ | Где |
|------|-----|
| `seeAll` / `seeAllGuide` | header CTA секций |
| `viewAllServices` | extras compact footer |
| Page titles | `pages.guide`, `pages.services`, `pages.faq` или через `SITE_CONFIG` titleKey |

Все локали проекта — по существующему процессу переводов.

## Smoke / test plan

- [ ] `/` — compact blocks, нет full explore tabs / full FAQ / full extras grid.
- [ ] `/guide` — full local guide, back → `/`.
- [ ] `/services` — full extras, sheet открывается.
- [ ] `/faq` — все вопросы.
- [ ] `!registered` — access panel, без лишних registered-only блоков.
- [ ] `registered` — wifi, issue, reception strip без регрессий.
- [ ] `FeatureGate` — модули скрыты когда выключены.
- [ ] `npm run smoke` — зелёный (если покрывает app routes).

## Analytics (опционально P2)

События в духе analytics-v1, без PII:

| Событие | Где |
|---------|-----|
| `hub_drilldown_click` | CTA See all → guide/services/faq |
| `hub_compact_action` | sheet open, FAQ expand, maps tap на home |

Properties: `tenant_slug`, `site: app`, `module: guide | services | faq`.

## Acceptance

- [ ] Нет hardcoded EN строк в новых hub-компонентах.
- [ ] Smoke / ручной чеклист пройден.
- [ ] `npm run snapshot` выполнен.
- [ ] Мастер-критерии из [concierge-hub-v1.md](./concierge-hub-v1.md) выполнены.

## Файлы (strict)

- i18n message files (только ключи hub — по факту недостающих)
- `SMOKE.md` — дополнение чеклиста при необходимости
- Без изменений бизнес-логики модулей, кроме строк и мелких правок для smoke

## Промпт для чата

```
ТЗ Chat 5: Concierge hub polish.
Добавь i18n для hub секций и page titles, прогони smoke, npm run snapshot.
Опционально hub analytics. Strict file scope из docs/tz/concierge-hub-v1-chat5-polish.md.
```
