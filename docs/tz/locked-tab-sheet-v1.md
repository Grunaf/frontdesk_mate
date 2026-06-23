# TZ: Locked tabs → sheet вместо redirect (вариант A)

**Версия:** 1.0  
**Статус:** Implemented  
**Ветка:** `fix/locked-tab-check-in-sheet`

---

## 1. Проблема

Без сессии попытка открыть **Access & Doors** / **Settlement** или deep link `?step=arrival|settlement` мгновенно редиректит на `/check-in`. Гость теряет контекст arrival guide.

## 2. Цель

**Locked = объяснение на месте.** Переход на check-in только по **Sign in** в sheet.

## 3. Поведение

| Триггер | Результат |
|---------|-----------|
| Тап locked chip | Sheet, tab не меняется |
| `?step=arrival` / `settlement` без сессии | Tab = route, sheet открыт |
| Primary CTA на Route без сессии | Sheet |
| Sign in в sheet | `/check-in` |
| Закрытие sheet | Остаётся на welcome |

## 4. Файлы

- `ArrivalJourneyCoordinator.tsx` — sheet state, убрать `navigateToCheckIn` для locked
- `CheckInRequiredSheet.tsx` — без изменений
- `docs/qa/arrival-guide-pass.md` — сценарии 5, 7

## 5. Acceptance

| ID | Критерий |
|----|----------|
| A1 | Тап locked chip → sheet, URL `/welcome` |
| A2 | `?step=arrival` без PIN → sheet, не `/check-in` |
| A3 | Sign in → `/check-in` |
| A4 | После check-in tabs без sheet |
| A5 | Закрытие sheet без navigation |

## 6. Out of scope

- Вариант B (баннер для URL)
- Magic links / intent screen
