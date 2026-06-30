# TZ: Concierge hub — Chat 2 Local Guide

**Версия:** 1.0  
**Статус:** Draft  
**Приоритет:** P0  
**Оценка:** M (1–2 дня)  
**Мастер-TZ:** [concierge-hub-v1.md](./concierge-hub-v1.md)  
**Зависимости:** Chat 1 (foundation)

## Summary

`LocalGuide` получает `variant: 'compact' | 'full'`. Compact на главной concierge; full на `/guide`. Arrival mode и explore unlock остаются внутри модуля.

## Scope

- Prop `variant` на `LocalGuide`.
- Compact-лимиты контента на home.
- Full без регрессий на `/guide`.
- Wire в `ConciergeContent` + page `/guide`.

## Out of scope

- Guest extras, FAQ.
- Новые данные в tenant / cityPack.
- Редизайн `RecommendationCard`, `EssentialsSection` beyond limit props.

## Поведение

### Compact (на `/`)

1. **Near hostel** — до 2 карточек `RecommendationCard` (если есть `hostelPlaces`).
2. **Essentials** — `EssentialsSection` свёрнут по умолчанию; внутри до 3 utilities (или prop `limit` на секцию).
3. **Map card** — если `customMapUrl`, показать; tap → Google Maps (как сейчас).
4. **Explore** — не показывать tabs и длинные списки. Одна строка-teaser или только CTA в header «See all».
5. **Arrival mode** (`isArrivalMode`):
   - compact = essentials (highlight) + near hostel;
   - explore не раскрывается на home — только teaser или скрыт;
   - `unlockExplore` — только в full variant на `/guide`.

### Full (на `/guide`)

- Текущий `LocalGuide` без регрессий: near hostel, essentials, explore, sticky `SegmentedChipBar`, `showAllPlaces`, arrival unlock flow.

### Concierge home

- Секция в `ConciergeModuleSection` с `seeAllHref` → `/guide`.
- `FeatureGate module="localGuide"` на home и на `/guide`.

## Acceptance

- [ ] Главная: local guide не содержит sticky tabs и полный explore-скролл.
- [ ] Tap на essential / near hostel / map работает на home без перехода.
- [ ] `/guide` — полный функционал как до рефактора.
- [ ] Arrival mode: unlock explore только на full.
- [ ] Пустые состояния: секция скрыта или минимальный empty (без поломки layout).
- [ ] `FeatureGate module="localGuide"` сохранён.

## Файлы (strict)

- `src/features/welcome/ui/LocalGuide.tsx`
- `src/features/welcome/ui/EssentialsSection.tsx` (если нужен prop `limit` / `defaultExpanded`)
- `src/features/welcome/index.ts`
- `src/views/concierge/ui/ConciergeContent.tsx` (только wire compact)
- `src/app/app-site/[locale]/guide/page.tsx`
- View wrapper для `/guide` (если не создан в Chat 1)

## Промпт для чата

```
ТЗ Chat 2: LocalGuide compact/full.
variant prop, compact на Concierge home, full на /guide.
Лимиты: 2 near hostel, essentials collapsed max 3, map card, no explore tabs on home.
Arrival mode только внутри модуля. Strict file scope из docs/tz/concierge-hub-v1-chat2-local-guide.md.
```
