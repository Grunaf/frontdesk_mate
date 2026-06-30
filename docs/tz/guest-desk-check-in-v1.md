# TZ: Guest desk check-in (reception)

**Версия:** 1.0  
**Статус:** Draft  
**Приоритет:** P1  
**Ветка:** `feat/guest-desk-check-in` (или stacked на `feat/concierge-stay-essentials`)

## Summary

Лёгкий ритуал на **reception desk**, когда гость **физически** у стойки. Не PMS, не scan паспорта, не POS. Чеклист + timestamps на `guest_stays`; главный сигнал — **`key_issued_at`** для скрытия night access codes в guest app.

## Проблема

Reception сейчас = **Issue guest access** (PIN + link), часто **до** прихода гостя. `activated_at` = гость открыл app, не «был на стойке». Нет поля «ключ выдан» → night codes видны всем ночью.

## Цель

- Одно действие на stay: **Complete desk check-in**.
- Опциональный чеклист (passport / tax / key) — галочки, без OCR и платежей.
- **`key_issued_at`** → guest app скрывает night access bridge.

## Не делаем в v1

- Скан паспорта, OCR, хранение документов
- Приём оплаты, касса, city tax transaction
- Привязка к **Issue access** (выдача ссылки ≠ приход на стойку)
- Полный front-desk PMS

## Модель данных

Добавить в `guest_stays` (миграция):

| Поле | Тип | Назначение |
|------|-----|------------|
| `desk_checked_in_at` | timestamptz nullable | Гость обработан на стойке |
| `key_issued_at` | timestamptz nullable | Физический ключ выдан |
| `passport_checked_at` | timestamptz nullable | optional v1 |
| `tax_collected_at` | timestamptz nullable | optional v1, если city tax в settings |

Guest session / API должен отдавать `keyIssuedAt` (и при необходимости `deskCheckedInAt`) в `ResolvedGuestSession`.

## UX reception

**Где:** Access tab → stay row, особенно **Arriving today**.

**Действие:** кнопка **Complete desk check-in** (если `desk_checked_in_at` пуст).

**Sheet / dialog:**

```
☐ ID / passport checked     (optional, tenant flag)
☐ City tax collected        (optional, if cityTax configured)
☑ Room key issued           (prompt; default ask)

[Complete]
```

После submit: timestamps, badge на строке «Checked in», read-only summary в expand.

**Не** блокировать Issue access форму — desk check-in отдельный шаг **после** или **когда гость пришёл**.

## Связь с night access

`resolveShowNightAccessBridge` в guest app:

- если `key_issued_at` set → мостик **не рендерится**
- иначе — эвристики из [stay essentials Chat 4](./concierge-stay-essentials-v1-chat4-night-access-sheet.md)

## Подзадачи (чаты)

| Chat | Файл | Оценка |
|------|------|--------|
| 1 | [chat1-schema.md](./guest-desk-check-in-v1-chat1-schema.md) | S |
| 2 | [chat2-reception-ui.md](./guest-desk-check-in-v1-chat2-reception-ui.md) | S–M |
| 3 | [chat3-guest-session.md](./guest-desk-check-in-v1-chat3-guest-session.md) | S |

## Критерий готовности

1. Reception может отметить desk check-in на stay.
2. `key_issued_at` сохраняется в БД.
3. Guest app получает флаг и скрывает night access bridge.
4. Issue access flow без регрессий.
