# TZ: Stay essentials — Chat 2 Wi‑Fi sheet

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** S  
**Мастер-TZ:** [concierge-stay-essentials-v1.md](./concierge-stay-essentials-v1.md)  
**Зависимости:** Chat 1

## Summary

Sheet «Wi‑Fi»: network name, password, copy. Reuse существующего Wi‑Fi UI.

## Scope

- `StayEssentialsWifiSheet` — `BottomSheet` normal.
- Reuse `WifiCard` или развёрнутый контент из `WifiCompactRow`.
- Мостик `wifi` скрыт, если нет `wifi.name` + `wifi.password`.

## Поведение

- Sheet title: i18n «Wi‑Fi».
- Copy password — как в `WifiCompactRow`.
- Job полностью закрывается в sheet; drill-down не нужен.

## Out of scope

- Wi‑Fi QR.
- Изменение admin Wi‑Fi fields.

## Acceptance

- [ ] Мостик скрыт без credentials.
- [ ] Sheet показывает network + password + copy.
- [ ] Read state на мостике после открытия (из Chat 1).

## Файлы (strict)

- `src/features/stay-essentials/ui/StayEssentialsWifiSheet.tsx`
- `src/features/stay-essentials/ui/StayEssentialsBridges.tsx` (wire + visibility)
- `src/features/wifi-connect/` — только public API reuse

## Промпт для чата

```
ТЗ Chat 2 stay-essentials: Wi-Fi sheet, reuse WifiCard/WifiCompactRow logic.
Hide wifi bridge when no credentials. Strict file scope.
```
