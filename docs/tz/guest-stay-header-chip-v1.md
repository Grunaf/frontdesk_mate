# TZ: Guest stay chip в header (без Arrival guide)

**Версия:** 1.0  
**Статус:** Implemented  
**Приоритет:** P1

See implementation: `src/features/guest-stay-chip/`, `BaseHeader`, PR removes `FindYourBedCard` from Concierge.

## Visibility

| Route | Chip |
|-------|------|
| Concierge `/` | ✅ registered |
| `/welcome` | ❌ |
| `/check-in*` | ❌ |

## UI

- Header right: compact chip → `size="small"` sheet with bed, dates, Find your bed, WhatsApp reception.
