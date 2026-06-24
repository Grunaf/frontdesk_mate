# TZ: Concierge hub — Chat 4 FAQ

**Версия:** 1.0  
**Статус:** Draft  
**Приоритет:** P1  
**Оценка:** S (0.5 дня)  
**Мастер-TZ:** [concierge-hub-v1.md](./concierge-hub-v1.md)  
**Зависимости:** Chat 1 (foundation)

## Summary

FAQ на home — compact (2 вопроса inline); полный accordion на `/faq`.

## Scope

- `variant: 'compact' | 'full'` на `FAQAccordion` или отдельный `FAQCompact` с reuse items из model.
- Wire в `ConciergeContent` + page `/faq`.

## Out of scope

- Local guide, guest extras.
- Редактирование FAQ в admin.
- Поиск по FAQ.

## Поведение

### Compact (на `/`)

- Первые 2 вопроса (порядок как в full) — mini accordion; ответ раскрывается на месте.
- `ConciergeModuleSection` с CTA → `/faq`.
- Если вопросов ≤2 — CTA в header опционален или скрыт.
- Если вопросов 0 — секция не рендерится.

### Full (на `/faq`)

- Текущий `FAQAccordion` целиком, без урезания.

### Feature gate

- `FeatureGate module="faq"` на home и на `/faq`.

## Acceptance

- [ ] Ответ на top-2 вопроса доступен на home без перехода.
- [ ] `/faq` — все вопросы.
- [ ] Порядок вопросов совпадает между compact и full.
- [ ] `FeatureGate module="faq"` сохранён.

## Файлы (strict)

- `src/features/faq/ui/FAQAccordion.tsx` (или новый `FAQCompact.tsx` в том же feature)
- `src/features/faq/index.ts`
- `src/views/concierge/ui/ConciergeContent.tsx` (wire)
- `src/app/app-site/[locale]/faq/page.tsx`
- View wrapper для `/faq` (если не создан в Chat 1)

## Промпт для чата

```
ТЗ Chat 4: FAQ compact/full.
Home: 2 questions inline accordion. /faq: full FAQAccordion.
Strict file scope из docs/tz/concierge-hub-v1-chat4-faq.md.
```
