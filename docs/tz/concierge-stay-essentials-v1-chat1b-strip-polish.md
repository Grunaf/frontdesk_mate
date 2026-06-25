# TZ: Stay essentials — Chat 1b Strip polish

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** S (2–4 ч)  
**Мастер-TZ:** [concierge-stay-essentials-v1.md](./concierge-stay-essentials-v1.md)  
**Зависимости:** Chat 1 (foundation) ✓

## Summary

Доработка горизонтального слайдера stay essentials: компактнее плитки (−30% ширины), title и read-индикатор в одной верхней строке, **обводка карточки** вместо dot, **«Как добраться»** — первая плитка в том же слайдере. Отдельный `ArrivalGuideButton` убрать.

## Проблема

Плитки крупные; dot в углу слабо читается на квадрате; «Как добраться» живёт отдельной full-width кнопкой над слайдером — визуально не единая зона arrival essentials.

## Цель

Один горизонтальный snap-slider для arrival essentials: navigation + sheet-мостики в одном ряду, единый UI-язык, понятный affordance tap без dot.

## Scope

### 1. Размер плитки (−30%)

Текущее: `w-[42vw] max-w-[140px]`.

Новое (**−30%**):
- `w-[30vw]` (или `w-[29.4vw]`)
- `max-w-[98px]` (округлить до `max-w-[100px]` если удобнее в сетке)

`aspect-square` сохранить. Иконку при необходимости уменьшить пропорционально (ориентир **28×28**, `h-7 w-7`), если 36×36 не влезает.

### 2. Верхняя строка: title + read-статус

```
┌──────────────────┐
│ Wi‑Fi      [stat]│  ← одна строка, baseline/inset top
│                  │
│ [icon]           │
└──────────────────┘
```

- Title: `line-clamp-2`, **верхний inset** (`top-2.5`), слева.
- Read-статус: **справа на той же высоте**, что и первая строка title (не absolute dot в углу).
- Убрать отдельный dot-элемент.

### 3. Read-индикатор = обводка карточки

Вместо dot — **border всей плитки**:

| Состояние | Обводка | Affordance tap |
|-----------|---------|----------------|
| **Unread** (новое) | контрастная: `border-2 border-primary` (или accent, когда Chat 6) | `hover:bg-muted/40`, `active:bg-muted/60` |
| **Read** | серая: `border border-border` / `border-muted-foreground/30` | те же hover/active + `cursor-pointer` |

Плитка всегда выглядит как кнопка (не `opacity-*`, не `pointer-events-none`).

Persist read state — без изменений:
```ts
// stayEssentialsRead:{tenantSlug}:{stayId}:{bridgeId}
// mark read on sheet onOpenChange(true)
```

### 4. «Как добраться» — первая плитка слайдера

Перенести логику `ArrivalGuideButton` из `ConciergeContent` в slice `stay-essentials`:

| Поле | Значение |
|------|----------|
| `tileId` | `arrivalGuide` |
| Позиция | **первая** в слайдере |
| Действие | `setInAppReturnTo(concierge)` → `router.push(welcome)` (как сейчас) |
| Иконка | `MapPin` или `Navigation` (Lucide) |
| Title | `pages.concierge.arrivalGuideButton` (переиспользовать ключ) |
| Read state | **нет** в v1 — всегда контрастная обводка (navigation CTA) |

### 5. Порядок плиток в слайдере

1. **Arrival guide** (navigation)
2. Wi‑Fi → sheet
3. Check-out → sheet
4. Night access → sheet (скрыт до Chat 4)
5. About reception → sheet

### 6. Видимость / IA

```
[GuestAccessPanel]           — !registered only
[StayEssentialsStrip]        — NEW name (или расширенный StayEssentialsBridges)
  - !registered: только arrivalGuide
  - registered: arrivalGuide + visible bridges
[services / issue / guide / faq]
[ConciergeReceptionStrip]
```

- Убрать отдельный `<ArrivalGuideButton />` из `ConciergeContent`.
- Слайдер рендерить, если есть ≥1 видимая плитка (минимум arrival guide).

## UI-контракт (обновление Chat 1)

| Элемент | Правило |
|---------|---------|
| Форма | квадрат, горизонтальный snap-slider |
| Ширина | −30% от текущей (`42vw→30vw`, `140px→98–100px`) |
| Title | top-left, без subtitle |
| Read | **обводка карточки**, не dot |
| Иконка | bottom-left, ~28–36px |
| Chevron | нет |
| Tap | вся плитка |

## Out of scope

- Реальный контент sheets (Chat 2–5).
- Admin accent на плитках (Chat 6).
- Read state для arrival guide.
- Изменение ключей localStorage.

## Acceptance

- [ ] Плитки на ~30% уже текущих (визуально и по классам).
- [ ] Title и read-индикатор в одной верхней зоне (не dot в углу).
- [ ] Unread = контрастная обводка; read = серая; tap affordance сохранён.
- [ ] Open sheet → read border; persist после reload.
- [ ] «Как добраться» — первая плитка в слайдере; отдельной кнопки нет.
- [ ] !registered: слайдер с arrival guide; registered: arrival + bridges.
- [ ] Порядок: arrival → Wi‑Fi → Check-out → Night* → Reception.
- [ ] Нет регрессии navigation на welcome.

## Файлы (strict)

- `src/features/stay-essentials/model/types.ts` — добавить `arrivalGuide` в union tile ids (или отдельный тип tile)
- `src/features/stay-essentials/ui/StayEssentialsBridgeCard.tsx` — layout + border read
- `src/features/stay-essentials/ui/StayEssentialsBridges.tsx` — arrival tile + порядок
- `src/features/stay-essentials/ui/StayEssentialsArrivalTile.tsx` *(новый, опционально)*
- `src/features/stay-essentials/index.ts`
- `src/views/concierge/ui/ConciergeContent.tsx` — убрать `ArrivalGuideButton`, wire strip для всех

## Промпт для чата

```
ТЗ Chat 1b stay-essentials strip polish.
Плитки −30% ширины; title + read в верхней строке; read = border (контраст/серый), не dot.
Arrival guide — первая плитка в слайдере; убрать ArrivalGuideButton из ConciergeContent.
Strict file scope: docs/tz/concierge-stay-essentials-v1-chat1b-strip-polish.md
```
