# TZ: Product analytics v1

**Версия:** 1.0  
**Статус:** Draft  
**Приоритет:** P1

## Summary

Тонкий слой product analytics для multi-tenant хостелов: воронки landing → check-in → контакт с ресепшеном. Без PII, без автотрека каждого клика.

## Инструмент

**PostHog** (EU cloud или self-host при необходимости).

Почему не GA4: событийная product-модель, `tenant_slug` в properties, меньше маркетингового/cookie overhead для guest app.

## События v1

| Событие | Где | Заметка |
|---------|-----|---------|
| `landing_view` | landing-site | pageview / route |
| `booking_whatsapp_click` | landing hero / room cards | клик на WA бронирование |
| `check_in_success` | guest app check-in | успешная сессия |
| `reception_contact_click` | `ReceptionContactActions` и inline | WA или tel |

Другие события — отдельные версии TZ, не в v1.

## Properties (общие)

| Property | Значения | Обязательно |
|----------|----------|-------------|
| `tenant_slug` | slug tenant | да |
| `site` | `landing` \| `app` | да |
| `context` | `check_in` \| `taxi` \| `strip` \| `extend_stay` \| `issue` \| … | для `reception_contact_click` |

## Запрет (PII)

Не отправлять в аналитику:

- имя гостя, телефон, email
- `bedId`, PIN, stay ref в открытом виде
- содержимое issue report / WA message

## Cookie / consent

- **Guest app:** без cookie-баннера, если только product analytics + essential cookies (session, locale).
- **Landing:** consent / CMP — отдельная задача, если подключат non-essential трекеры сверх PostHog product mode.

## Реализация (фазы)

| Phase | Scope |
|-------|--------|
| 1 | `src/shared/lib/analytics` — wrapper, env, noop без ключа |
| 2 | `landing_view`, `booking_whatsapp_click` |
| 3 | `check_in_success`, `reception_contact_click` + `context` |
| 4 | consent на landing (если потребуется юридически) |

## Out of scope v1

- автотрек всех кликов
- analytics в admin / reception
- дашборд для хостелов
- session replay
