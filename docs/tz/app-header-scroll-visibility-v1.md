# TZ: App header — show on scroll up

**Версия:** 1.0  
**Статус:** Implemented  
**Приоритет:** P1  
**Оценка:** M

## Summary

Auto-hide `BaseHeader` on scroll down, show on scroll up. Window scroll, fixed header + spacer. Exclude `preSession` routes.

## Файлы (strict)

- `src/shared/ui/BaseHeader/AppHeaderShell.tsx`
- `src/shared/ui/BaseHeader/useAppHeaderScrollVisibility.ts`
- `src/shared/ui/BaseHeader/useAppHeaderScrollVisibility.test.ts`
- `src/shared/ui/BaseHeader/resolveAppHeaderMode.ts`
- `src/app/app-site/[locale]/layout.tsx`
