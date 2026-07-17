# TZ: Owner portal — Staff knowledge base

**Версия:** 1.0  
**Статус:** Implemented (v1)  
**Приоритет:** P1  
**Оценка:** M  
**Маршрут:** `dashboard…/{locale}/knowledge`  
**Миграция:** `048_staff_knowledge.sql`

## Summary

Модуль в **owner portal** для документирования операционной модели хостела: роли, статические чеклисты обязанностей, инструкции (текст + видео по URL). Не трекер задач. AI без native-интеграции: owner копирует готовый промпт во внешний AI, вставляет ответ обратно; система **разбирает JSON в сущности модуля**.

## Проблема

Нет места, где владелец фиксирует «как устроен хостел»: роли, сколько людей нужно, обязанности, инструкции по ситуациям, где лежат инструменты/химия. Контент живёт в головах и чатах. Список «кто чем занимается» нужно собрать **с нуля**.

## Цель

Дать owner инструмент авторства **базы знаний для сотрудников**:

1. С нуля получить каркас ролей + headcount + обязанности через AI paste→decompose.
2. Вести роли и статические чеклисты.
3. Вести инструкции с опциональным видео по внешней ссылке.
4. Помогать писать контент шаблонами промптов (без API AI в продукте).

## Аудитория

| Кто | Роль в v1 |
|-----|-----------|
| Owner (dashboard) | Создаёт и редактирует контент |
| Сотрудники | **Не** смотрят здесь. Просмотр — позже в их модулях. В owner portal ACL/настроек выдачи нет |

## Scope

### 1. Bootstrap структуры (с нуля)

- Owner описывает, как работает хостел.
- Система отдаёт **полный промпт**.
- Owner уносит во внешний AI, вставляет **весь ответ**.
- Preview разбора → Apply.
- Apply **заменяет** все роли и чеклисты; статьи (instructions) сохраняются.
- Результат промпта должен покрывать:
  - что делается в хостеле (summary);
  - **какие роли и сколько людей** (`headcount`);
  - статический checklist обязанностей по каждой роли.

### 2. Роли

- Каталог: название, описание, headcount, sort order.
- Удаление роли (каскадом чеклисты; у статей `role_id` → null).

### 3. Статические чеклисты

- Привязаны к роли.
- Список «что должен делать / за что отвечает».
- **Не** ежедневные задачи, **не** статусы «сделано», **не** канбан.

### 4. Инструкции (база знаний)

- Title + body.
- Опционально связь с ролью.
- CRUD (create/delete в v1 UI; update API есть в entity при необходимости).

### 5. Видео

- Хранение **только URL** (не Supabase Storage, не upload файла в продукт).
- UI: HTML5 `<video src={url} controls>` (прямая ссылка на медиа).

### 6. AI через промпты + paste → decompose

Паттерн v1 (вместо native AI):

1. Owner заполняет детали в форме.
2. Копирует **целый** собранный промпт.
3. Получает ответ во внешнем AI.
4. Вставляет ответ в поле модуля.
5. Система извлекает JSON (fence/`{…}`) и **декомпозирует** в сущности.
6. Preview → подтверждение → запись в БД.

Сценарии промптов v1:

| Сценарий | Декомпозиция в |
|----------|----------------|
| Bootstrap структуры | `roles[]` + `headcount` + `checklist[]` (+ optional `summary`) |
| Инструкция | `title`, `body`, optional `videoUrl`, optional `roleName` |

Ошибки разбора — явные, без тихой порчи данных.

## Out of scope (v1)

- Trello / статусы / дедлайны / «задачи на сегодня».
- Просмотр и ACL для сотрудников в owner portal.
- Доставка / sync контента в employee-модули.
- Хостинг видео и upload в storage.
- ~~Встроенный AI-чат, API-ключи, серверная генерация.~~ → **P1 native generate** (ниже); чат / per-tenant keys по-прежнему out of scope.
- Настройки «кто из сотрудников видит».

## Поведение (acceptance)

1. Owner с пустой структурой может: заметки → copy prompt → paste AI reply → preview → apply → видит роли с headcount и чеклистами.
2. Apply bootstrap заменяет роли/чеклисты; инструкции не стираются (с confirm).
3. Owner может создать инструкцию вручную или через AI import с preview.
4. У инструкции с `videoUrl` показывается плеер по URL.
5. В модуле нет экранов выдачи сотрудникам.
6. Запись доступна только при `canEditSettings` (как остальные owner writes).

## Информационная архитектура

```
Owner portal nav:
  Setup | Settings | Staff knowledge | Activity

/knowledge
  Tabs:
    Build structure  — notes + copy prompt + paste + preview + apply
    Roles            — список ролей + чеклисты + delete
    Instructions     — AI import + manual create + list + video + delete
```

## Данные (v1)

| Таблица | Суть |
|--------|------|
| `staff_knowledge_roles` | tenant-scoped роли (`name`, `description`, `headcount`, `sort_order`) |
| `staff_knowledge_checklist_items` | пункты чеклиста → `role_id` |
| `staff_knowledge_articles` | инструкции (`title`, `body`, `video_url`, optional `role_id`) |

Доступ к БД: service role из server repository после owner auth (паттерн reception users), не через `TenantSettings`.

## FSD / файлы реализации

| Слой | Путь |
|------|------|
| Migration | `supabase/migrations/048_staff_knowledge.sql` |
| Entity | `src/entities/staff-knowledge/` |
| Feature | `src/features/owner-staff-knowledge/` |
| Page | `src/app/owner-site/[locale]/(protected)/(ops)/knowledge/page.tsx` |
| Nav | `src/features/owner-shell/ui/OwnerPortalNav.tsx`, `OwnerPortalShell.tsx` |
| i18n | `pages.owner.knowledge.*`, `pages.owner.nav.knowledge` в `en` / `ru` / `sr` |

## Контракт JSON (bootstrap)

```json
{
  "summary": "1–3 sentences",
  "roles": [
    {
      "name": "Housekeeper",
      "description": "What this role owns",
      "headcount": 2,
      "checklist": ["Responsibility 1", "Responsibility 2"]
    }
  ]
}
```

## Контракт JSON (article)

```json
{
  "title": "Short title",
  "body": "Full instruction text",
  "videoUrl": null,
  "roleName": "Housekeeper"
}
```

## Следующие шаги (не v1)

### P1 — Native AI generate (Gemini Flash via OpenRouter or direct Gemini)

Второй путь рядом с copy/paste:

1. Owner пишет notes/topic → **Generate with AI** → server `generateText` → parse теми же schema → preview → apply.
2. Paste-путь остаётся fallback при `not_configured` / `rate_limited` / `provider_error`.
3. **Провайдер** выбирается в Admin → `/admin/ai` (`openrouter` | `gemini`), хранится в `platform_ai_settings` (миграция `049`).
4. Ключи только env: `OPENROUTER_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` (или `GEMINI_API_KEY`). Модели: `STAFF_KNOWLEDGE_MODEL_ID` / `STAFF_KNOWLEDGE_GEMINI_MODEL_ID`.
5. Нет UI picker моделей; смена модели через env.
6. Rate limit по owner session; кнопка Generate скрыта без ключа активного провайдера.

Файлы: `entities/platform-ai-settings`, `features/platform-ai-settings`, `api/staffKnowledgeGenerateActions.ts`, `lib/createStaffKnowledgeLanguageModel.ts`, UI + i18n.

### Позже

- Deliver контента в модули сотрудников (reception / staff apps).
- Редактирование роли/пунктов чеклиста по одному без полного bootstrap-replace.
- Поддержка youtube/embed URL, если понадобится сверх прямого media URL.
- Аудит-события по изменениям knowledge base.

См. также `owner-staff-knowledge-bootstrap-v2.md` (intake + multi-step generate).

