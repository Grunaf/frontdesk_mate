# TZ: Stay essentials — Chat 6 Admin accent colors

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** S  
**Мастер-TZ:** [concierge-stay-essentials-v1.md](./concierge-stay-essentials-v1.md)  
**Зависимости:** Chat 1

## Summary

Per-bridge `accentColor` в tenant settings + поля в admin Guest app. Карточки-мостики используют tint фона.

## Scope

### Settings (ориентир)

```ts
// settings.stayEssentialsBridges?: {
//   wifi?: { accentColor?: string };
//   checkout?: { accentColor?: string };
//   nightAccess?: { accentColor?: string };
//   reception?: { accentColor?: string };
// }
```

### Admin

- Секция в **Guest app** (или Stay essentials): color picker / preset swatches на каждый bridge.
- Валидация hex или preset id; пусто = default theme.

### Guest app render

- Фон карточки: tint от `accentColor` (~8–15% opacity) + border того же hue.
- Title и icon: theme `foreground` — контраст обязателен.
- Read dot: не теряется на цветном фоне.

## Out of scope

- Per-tenant иконки (только Lucide).
- Gradient / image backgrounds.

## Acceptance

- [ ] Admin сохраняет цвета в settings.
- [ ] Guest app применяет tint; без цвета — fallback как Chat 1.
- [ ] Текст читаем на всех preset colors.

## Файлы (strict)

- `src/entities/tenant/model/settings.ts` (тип)
- `src/app/admin/actions.ts` (parse form)
- `src/app/admin/(protected)/tenants/sections/GuestAppFields.tsx` (или новый `StayEssentialsFields.tsx`)
- `src/features/stay-essentials/ui/StayEssentialsBridgeCard.tsx` (apply color)
- lib resolve/normalize если нужен

## Промпт для чата

```
ТЗ Chat 6 stay-essentials: admin accentColor per bridge, settings + GuestAppFields, tint on StayEssentialsBridgeCard.
Strict file scope.
```
