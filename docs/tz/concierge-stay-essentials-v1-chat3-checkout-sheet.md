# TZ: Stay essentials — Chat 3 Check-out sheet

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** S  
**Мастер-TZ:** [concierge-stay-essentials-v1.md](./concierge-stay-essentials-v1.md)  
**Зависимости:** Chat 1

## Summary

Sheet «Check-out»: правила выезда хостела (policy), не персональная бронь.

## Job

«Как правильно выехать» — время по правилам хостела, подготовка, luggage.

## Контент sheet (v1)

| Блок | Источник |
|------|----------|
| Checkout time | `hostel.checkOutTime` — «Check-out until {time}» |
| Pack night before | статический i18n: собрать вещи вечером, утром не мешать спящим |
| Luggage after checkout | pre-trip `luggageAlert` если `shouldShowPreTripLuggage(settings)` |
| Late checkout | короткий текст «request at reception»; ссылка на guest extra `lateCheckout` если preset enabled |

### Не класть (конфликт с My stay)

- Stay ref, bed breadcrumb, copy-for-reception как primary.
- Персональные даты checkout — опционально **одна** вторичная строка мелким текстом из session (`checkOutAt`), не заголовок sheet.

## Поведение

- Мостик скрыт, если нет `checkOutTime` и нет luggage/late-checkout контента.
- Primary CTA extend stay — **не** здесь (My stay sheet).

## Out of scope

- House rules full list (FAQ).
- Новые admin fields.

## Acceptance

- [ ] Checkout time отображается когда задан.
- [ ] Есть i18n про сбор вещей накануне.
- [ ] Нет дублирования My stay primary actions.
- [ ] Мостик скрыт при полном отсутствии контента.

## Файлы (strict)

- `src/features/stay-essentials/ui/StayEssentialsCheckoutSheet.tsx`
- `src/features/stay-essentials/ui/StayEssentialsBridges.tsx` (visibility)
- i18n keys в `components.stayEssentials.checkout`

## Промпт для чата

```
ТЗ Chat 3 stay-essentials: Check-out sheet (policy time, pack-night-before tip, luggage, late checkout hint).
No My stay duplication. Strict file scope.
```
