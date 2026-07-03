# TZ: Guest tourism registration compliance — Chat A Legal / GDPR

**Версия:** 1.1  
**Статус:** Filled  
**Оценка:** S–M  
**Мастер-TZ:** [guest-tourism-registration-compliance-v2.md](./guest-tourism-registration-compliance-v2.md)

## Summary

Зафиксированы продуктовые и юридические решения **до кода**: контролёр данных, правовое основание, тексты для guest UI, сроки хранения, связь с tourism WhatsApp и guest notifications.

---

## Решения

### 1. Контролёр данных

| Роль | Кто | Обоснование |
|------|-----|-------------|
| **Data Controller** | Хостел (tenant) | Хостел определяет цели и средства обработки: решает собирать данные, взаимодействует с гостем, передаёт в гос. органы. |
| **Data Processor** | SaaS-оператор (Frontdesk Mate) | Обрабатывает данные по поручению tenant: хранение в Supabase, UI для сбора. Не принимает решений о целях обработки. |

> **⚠ Assumption** (нет юриста): классификация controller/processor стандартная для SaaS hospitality. Tenant обязан иметь собственную privacy policy. При подключении DPA между tenant и SaaS подтвердить формально.

### 2. Правовое основание

| Юрисдикция | Основание | Ссылка |
|------------|-----------|--------|
| Черногория (ME) | **Legal obligation** — Закон о туристическом и угоститељском дјелатности (ZZPL), обязанность размещения регистрировать иностранных гостей | ZZPL čl. 43–45 |
| GDPR (общий) | Art. 6(1)(c) — processing necessary for compliance with a legal obligation to which the controller is subject | GDPR Art. 6(1)(c) |

> Это **не** consent-based collection. Гость не может отказаться от предоставления данных для tourism registration — это условие размещения. Consent используется **только** для WhatsApp notifications (отдельный эпик, см. [guest-notifications-v1-chat0](./guest-notifications-v1-chat0-product-gdpr.md)).

### 3. Категории данных

| Поле (DB) | Категория | Описание |
|-----------|-----------|----------|
| `first_name` | Идентификация | Имя гостя (латиница) |
| `last_name` | Идентификация | Фамилия гостя (латиница) |
| `passport_storage_path` | Документ (изображение) | Фото страницы паспорта с данными |
| `entry_stamp_storage_path` | Документ (изображение) | Фото штампа въезда в страну |
| `tourism_contact_whatsapp` | Контакт (stay-level) | WhatsApp номер для связи по размещению |
| `tourism_registration_completed_at` | Метаданные | Время завершения регистрации |
| `tourism_exported_at` | Метаданные | Время экспорта данных в гос. орган |

### 4. Получатели данных

| Получатель | Доступ | Основание |
|------------|--------|-----------|
| Reception staff (tenant) | Полный доступ через reception UI | Исполнение обязанности размещения |
| Государственный туристический орган (ME) | Ручной экспорт reception → гос. портал (v1) | Legal obligation (ZZPL) |
| SaaS-оператор (техническая поддержка) | Через service_role при инциденте | Processor agreement (DPA) |

> В v1 **нет** автоматической передачи в гос. API. Reception вручную переносит данные из интерфейса на портал eTurist.

### 5. Субпроцессоры

| Субпроцессор | Сервис | Регион | DPA |
|-------------|--------|--------|-----|
| Supabase Inc. | Database (Postgres), Storage (S3-compatible) | EU (AWS eu-central-1) | [supabase.com/legal/dpa](https://supabase.com/legal/dpa) |

> **⚠ Assumption**: проект на Supabase EU region. Подтвердить в ops-документации при production deploy.

### 6. Retention policy

| Триггер | Срок | Что удаляется |
|---------|------|---------------|
| `check_out_at` + **90 дней** | 90 дней | Изображения из `guest-documents` storage bucket + строки `guest_stay_tourism_guests` |

**Правило**: retention отсчитывается от `check_out_at` (не от `tourism_exported_at`).

**Обоснование**:
- ZZPL не устанавливает явный минимальный срок хранения копий документов для размещения.
- 90 дней — conservative default: достаточно для проверки со стороны инспекции (обычно в сезон), но не избыточно.
- `tourism_exported_at` фиксирует факт передачи, но **не** продлевает retention — данные нужны размещению, а не SaaS.

> **⚠ Assumption**: 90 дней — рабочий default. Tenant может нуждаться в другом сроке по локальному законодательству. В Chat E предусмотреть настройку в tenant settings.

### 7. Права субъекта данных

| Право | Как реализовано (v2) |
|-------|---------------------|
| Доступ (Art. 15 GDPR) | Гость обращается на reception email tenant. Reception предоставляет копию данных вручную. |
| Удаление (Art. 17 GDPR) | Гость обращается на reception email. Если legal obligation завершена (export + retention), reception запрашивает удаление через admin. Автоматическое удаление — по retention policy (Chat E). |
| Ограничение обработки | Не применимо в v2 — данные либо хранятся, либо удалены. |

> Полный self-service GDPR portal — out of scope v2. Достаточно указать контакт reception в privacy notice.

---

## Таблица: поле → цель → срок хранения → доступ

| Поле | Цель обработки | Срок хранения | Кто имеет доступ |
|------|---------------|---------------|------------------|
| `first_name` | Идентификация гостя для tourism registration | `check_out_at` + 90 дней | Reception staff, гос. орган (ручной export) |
| `last_name` | Идентификация гостя для tourism registration | `check_out_at` + 90 дней | Reception staff, гос. орган (ручной export) |
| `passport_storage_path` (image) | Копия документа для гос. регистрации | `check_out_at` + 90 дней | Reception staff, гос. орган (ручной export) |
| `entry_stamp_storage_path` (image) | Подтверждение легального въезда | `check_out_at` + 90 дней | Reception staff, гос. орган (ручной export) |
| `tourism_contact_whatsapp` | Оперативная связь с гостем по stay | До `check_out_at` + 90 дней (вместе со stay) | Reception staff |
| `tourism_registration_completed_at` | Аудит: факт завершения регистрации | Вместе со stay record | Reception staff, SaaS (ops) |
| `tourism_exported_at` | Аудит: факт передачи данных в гос. орган | Вместе со stay record | Reception staff, SaaS (ops) |

---

## Тексты (copy-paste ready)

### 1. Privacy notice — Register step (EN)

> **Why we collect this data**
>
> Your accommodation is required by law to register foreign guests with the local tourism authority. We collect your name, a photo of your passport, and entry stamp solely for this purpose. Your data is accessible only to the reception staff and the government tourism office. Document images are automatically deleted within 90 days after checkout. For access or deletion requests, contact reception.

### 1a. Privacy notice — Register step (RU draft)

> **Зачем мы собираем эти данные**
>
> Размещение обязано по закону зарегистрировать иностранных гостей в местном туристическом органе. Мы собираем ваше имя, фото паспорта и штампа въезда исключительно для этой цели. Данные доступны только сотрудникам ресепшн и государственному туристическому органу. Изображения документов автоматически удаляются в течение 90 дней после выезда. По вопросам доступа или удаления данных обращайтесь на ресепшн.

### 2. Settlement gate sheet (Chat C) — EN

| Элемент | Текст |
|---------|-------|
| **Title** | Complete guest registration |
| **Description** | Your accommodation needs to register all guests before issuing settlement details. This is a legal requirement. |
| **Steps** | 1. Tap "Register" below · 2. Add each guest's name and document photos · 3. Return here to view your settlement |
| **Primary CTA** | Register now |

### 2a. Settlement gate sheet — RU draft

| Элемент | Текст |
|---------|-------|
| **Title** | Завершите регистрацию гостей |
| **Description** | Размещение обязано зарегистрировать всех гостей до выдачи данных для расчёта. Это требование закона. |
| **Steps** | 1. Нажмите «Зарегистрировать» · 2. Добавьте имя и фото документов каждого гостя · 3. Вернитесь сюда для просмотра расчёта |
| **Primary CTA** | Зарегистрировать |

### 3. Admin help — Tourism registration toggle

| Элемент | Текст |
|---------|-------|
| **Label** | Guest registration |
| **Help text** | When enabled, guests must register their identity documents before accessing settlement details. Required documents depend on the selected jurisdiction. |

---

## Профили юрисдикций (вход для Chat B)

| profile id | country display name (EN) | required document kinds | legal reference |
|------------|----------------------------|-------------------------|-----------------|
| `me` | Montenegro | `passport`, `entry_stamp` | ZZPL čl. 43–45 |
| (v2.1) | TBD | TBD | TBD |

---

## Связь с другими фичами

- `tourism_contact_whatsapp` — контакт по stay / регистрация; **отдельно** от WA opt-in для notifications ([guest-notifications-v1-chat0-product-gdpr.md](./guest-notifications-v1-chat0-product-gdpr.md)).
- Prefill notifications из tourism WA — **не делаем** в v1 notifications без явного согласования в notifications Chat 0.
- Privacy notice текст используется в Chat D (UI), retention rule — в Chat E (cron/job).

---

## Out of scope

- Код, миграции, cron.
- Privacy policy landing site (только требование ссылки/URL если уже есть в tenant settings).
- Полный self-service GDPR portal.
- Автоматическая интеграция с eTurist / гос. API.

## Acceptance

- [x] Таблица: поле → цель → срок хранения → кто имеет доступ.
- [x] Final EN strings для Register privacy + Settlement sheet + admin help.
- [x] Retention rule однозначно записана (триггер + duration): `check_out_at` + 90 дней.
- [x] Решение по controller / legal basis записано (assumption с пометкой).
