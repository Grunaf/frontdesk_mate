# TZ: Stay essentials — Chat 5 About reception sheet

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** S  
**Мастер-TZ:** [concierge-stay-essentials-v1.md](./concierge-stay-essentials-v1.md)  
**Зависимости:** Chat 1

## Summary

Sheet «About reception»: когда ресепшен работает и с чем помогает. **Информация**, не звонок.

## Job

«Когда и с чем идти к людям» — до использования reception strip.

## Контент sheet (v1)

| Блок | Источник | Приоритет |
|------|----------|-----------|
| Reception hours | `hostel.reception.time.open/close` | P0 |
| Team / custom note | `reception.availabilityHint` | P0 — лучший канал для «про сотрудников» |
| What we help with | статический i18n bullets: check-in, luggage, laundry, tours, late checkout *requests* | P0 |
| Taxi via reception | строка если `canHelpWithTaxi` | P1 |
| Luggage storage | pre-trip copy если relevant | P1 |
| Self check-in after | `selfCheckInTimeAfter` | P1 |

### Не класть (конфликт)

- Primary WA / Call buttons — **reception strip**.
- Extend stay — **My stay sheet**.
- Bed, stay ref.

### Footer hint

Мягкий текст: «Use the button below to message reception» — без второй крупной CTA (strip внизу экрана).

## Поведение

- Мостик скрыт, если нет ни hours, ни hint, ни taxi flag, ни luggage/self-check-in контента.
- Отдельного admin-поля «about team» в v1 нет — `availabilityHint`.

## Out of scope

- Новое bio-поле в admin.
- City tax (welcome / pre-trip).

## Acceptance

- [ ] Hours показываются при open+close.
- [ ] availabilityHint рендерится если задан.
- [ ] Нет primary contact buttons в sheet.
- [ ] Мостик скрыт при пустом контенте.

## Файлы (strict)

- `src/features/stay-essentials/ui/StayEssentialsReceptionSheet.tsx`
- `src/features/stay-essentials/ui/StayEssentialsBridges.tsx`
- i18n `components.stayEssentials.reception`

## Промпт для чата

```
ТЗ Chat 5 stay-essentials: About reception sheet (hours, availabilityHint, help bullets, taxi flag).
No WA/call primary actions — strip handles contact. Strict file scope.
```
