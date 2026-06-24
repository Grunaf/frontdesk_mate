# TZ: Concierge hub — Chat 3 Guest Extras

**Версия:** 1.0  
**Статус:** Draft  
**Приоритет:** P1  
**Оценка:** S–M (0.5–1 день)  
**Мастер-TZ:** [concierge-hub-v1.md](./concierge-hub-v1.md)  
**Зависимости:** Chat 1 (foundation)

## Summary

`GuestExtrasBlock` → `variant: 'compact' | 'full'`. На home — featured + sheet без полного grid; на `/services` — полный каталог.

## Scope

- Prop `variant` на `GuestExtrasBlock`.
- Compact: featured (max 2) + `GuestExtraSheet`.
- Full: текущий featured strip + grid standard.
- Wire в `ConciergeContent` + page `/services`.

## Out of scope

- Local guide, FAQ.
- Новые preset extras / admin.
- Изменение логики `resolveGuestExtrasLayout`.

## Поведение

### Compact (на `/`)

- Показать `layout.featured` — максимум 2 элемента (`GuestExtrasFeaturedStrip` с slice).
- Tap на tile → `GuestExtraSheet` (без перехода на другую страницу).
- **Не** рендерить `grid grid-cols-2` для `layout.standard`.
- Header CTA «View all services (N)» если `standard.length > 0` или `featured.length > 2`.
- `hasExtras === false` → секция не рендерится (как сейчас).

### Full (на `/services`)

- Текущее поведение: featured + standard grid + sheet.
- Те же `bedLabel`, `stayRef`, `trackGuestExtraEvent`.

### Concierge home

- `ConciergeModuleSection` с `seeAllHref` → `/services`.

## Acceptance

- [ ] Заказ / запрос extra с главной через sheet без перехода.
- [ ] `/services` — полный каталог (featured + standard grid).
- [ ] Compact не показывает standard grid.
- [ ] `trackGuestExtraEvent('extras_tile_click', …)` без регрессии.
- [ ] Нет extras → блок отсутствует на home и на `/services`.

## Файлы (strict)

- `src/features/guest-services/ui/GuestExtrasBlock.tsx`
- `src/features/guest-services/index.ts`
- `src/views/concierge/ui/ConciergeContent.tsx` (wire)
- `src/app/app-site/[locale]/services/page.tsx`
- View wrapper для `/services` (если не создан в Chat 1)

## Промпт для чата

```
ТЗ Chat 3: GuestExtrasBlock compact/full.
Home: featured max 2 + sheet, no standard grid. /services: full grid.
ConciergeModuleSection + see all link. Strict file scope из docs/tz/concierge-hub-v1-chat3-guest-extras.md.
```
