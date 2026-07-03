# TZ: Guest notifications — Chat 0 Product / GDPR

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** S  
**Мастер-TZ:** [guest-notifications-v1.md](./guest-notifications-v1.md)

## Summary

Зафиксировать продуктовые и юридические решения **до кода**: тексты согласий, список transactional событий, defaults полей БД, связь с tourism WhatsApp.

## Scope

### Решения (таблица в комментарии к мастер-TZ или appendix в этом файле)

- Default `sms_transactional_allowed`: `true` vs `false` и правовая формулировка (transactional door codes / safety).
- Список **NotificationKind** v1: минимум `access_issued`, `access_reissued`, `whatsapp_opt_out_confirm`; опционально `night_codes_reminder` (in/out v1).
- Можно ли **prefill** `sms_contact_e164` из `tourism_contact_whatsapp` в UI (read-only hint vs editable).
- Тексты **EN** (обязательно) и черновик **RU** для:
  - checkbox WA opt-in (unchecked default)
  - anti-ban disclaimer под checkbox
  - fallback copy («SMS / guest app»)
  - push permission rationale (коротко)
  - STOP confirmation message body

### Anti-ban WA (продукт)

- Один текстовый блок на сообщение, без цепочки коротких сообщений.
- Запрет promo в v1; только operational kinds из списка выше.

## Поведение

- Chat 1+ используют зафиксированные defaults и тексты без переизобретения.
- Если юрист недоступен — явно пометить «assumption» и default conservative (SMS opt-in required).

## Out of scope

- Код, миграции, env.

## Acceptance

- [ ] Таблица: event → разрешённые каналы → нужен ли WA opt-in.
- [ ] Final EN strings для UI (copy-paste ready).
- [ ] Решение по `sms_transactional_allowed` default записано.

## Файлы (strict)

- Только этот файл `docs/tz/guest-notifications-v1-chat0-product-gdpr.md` (обновить секции Summary/решения).
- Опционально: одна строка в мастер-TZ при изменении defaults.

## Промпт для чата

```
ТЗ Guest notifications Chat 0: продукт/GDPR без кода. Зафиксируй defaults sms_transactional_allowed, список transactional events, тексты opt-in/disclaimer EN+RU, prefill tourism WA. Обнови docs/tz/guest-notifications-v1-chat0-product-gdpr.md и при необходимости мастер-TZ.
```
