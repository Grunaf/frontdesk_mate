# TZ: Reception reference в My stay

**Версия:** 1.0  
**Статус:** Implemented  
**Приоритет:** P1

## Summary

Блок **For reception** в My stay sheet: bed breadcrumb, dates, Ref `#XXXXXX` (последние 6 символов `stayId`), optional имя, copy для стойки. WA extend включает ref.

## Ref

- Не показываем полный UUID.
- `formatStayReference(stayId)` → 6 символов uppercase.

## Session

`ResolvedGuestSession.guestName` из `guest_stays.guest_name`.

## Files

- `src/features/guest-stay-chip/lib/formatStayReference.ts`
- `src/features/guest-stay-chip/lib/buildReceptionCopyText.ts`
- `src/features/guest-stay-chip/ui/GuestStaySheet.tsx`
- `src/entities/guest-stay/model/types.ts`

## Out of scope (P2)

Поиск по ref на reception desk — см. `IssuedAccessList` (implemented).
