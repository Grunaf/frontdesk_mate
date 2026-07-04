# TZ: Arrival timeline (4 legs) + route tips + Guided fill (AI)

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** P0 — S; P1 tips + Guided admin — M; P1 tenant Guided — S (last mile) / L (full hub)

## Summary

Guest: get off — отдельная нога timeline в модалке (4 ноги для transit); summary-карточка без строки get off. Optional route tips («Good to know») только если оператор дал контент. Admin + tenant: режим **Guided** (AI форматирует ввод и задаёт вопросы, **не** выдумывает маршрут), один hub за сессию, Preview → Apply.

## Проблема

- `publicGetOffAt` на summary-карточке и внутри блока «Board and ride» — слабая иерархия «когда выйти».
- В `publicText` смешаны императивные шаги и советы (оплата, ночь → такси).
- Оператор/AI могут смешать в одном hub **взаимоисключающие** сценарии (автобус + такси как один путь).

## Цель

Чёткий step-by-step в модалке; карточка выбора hub без get off; tips вне steps; Guided fill с checklist открытых вопросов.

---

## Scope P0 — Guest UI (без AI, без новых полей tips)

1. **`PublicRouteSummaryCard`:** убрать блок с `publicGetOffAt`. Остальное как сейчас (title, summary, chips/meta, CTA, alternative route).
2. **`PublicRouteItinerary` (transit):** 4 ноги timeline:
   - Walk to stop — `publicPreview`
   - Board and ride — `publicText` + `TransitLegMeta` (chips), **без** get off внутри
   - **Get off** — отдельная нога, только `publicGetOffAt` (i18n title, напр. `pages.arrivalJourney.directions.legs.getOff`)
   - Walk to hostel — tenant/pack walk copy
3. **Walk-only:** без ноги get off (как transport gate).
4. **Пустой get off (EN):** нога **не рендерится** (hide).

### Out of scope P0

- Tips block, schema `tips`, admin/tenant AI, миграция seed-текста.

### Acceptance P0

- [ ] Summary: нет get off.
- [ ] Модалка transit: 4 ноги, get off отдельно от «Ride».
- [ ] Walk-only: без get off-ноги.
- [ ] Seed pack (kotor/sarajevo) — smoke title/summary/steps без регресса.

### Файлы P0

- `src/features/direction-picker/ui/PublicRouteItinerary.tsx`
- `src/features/direction-picker/ui/PublicRouteSummaryCard.tsx`
- i18n keys `pages.arrivalJourney.directions.legs.*` (EN + RU по конвенции проекта)

---

## Scope P1 — Data: route tips

1. **`CityPackRouteContent`:** optional `tips?: LocalizedText[]` — max **5** элементов, один tip = один `LocalizedText` (короткий EN; RU optional).
2. **Normalize/save:** soft merge; legacy без `tips` — OK.
3. **Guest:** блок «Good to know» **под timeline** в модалке, только если ≥1 tip заполнен для locale.
4. **Publish gate:** tips **не** входят в gate (как сейчас 4 EN-поля + walk-only exception для get off).

### Миграция seed

- **Не блокер P1.** Советы в старом `publicText` остаются до ручного или Guided re-format.
- Отдельная задача «split tips from seed JSON» — out of scope, unless requested.

### Acceptance P1 (tips)

- [ ] Guest: tips block только при данных; пустой массив — нет блока.
- [ ] Save draft сохраняет `tips` as-is.

### Файлы P1 (tips)

- `src/entities/city-pack/model/types.ts`
- `src/entities/city-pack/lib/normalizeCityPackRoutes.ts`
- `src/entities/city-pack/lib/resolveCityPackForGuest.ts` (+ merge в guest route config)
- `PublicRouteItinerary.tsx` (или соседний guest component)
- Admin editor: optional tips UI (bullets) в Manual; Guided заполняет

---

## Scope P1 — Guided fill (Gemini / AI Gateway)

### Где

- Admin: `CityPackRouteEditor` (city pack wizard, Arrival step).
- Tenant: секция arrival override — **см. Tenant slice ниже**.
- Toggle **Manual | Guided**; **один hub за сессию**.

### Поведение

1. Textarea: сырой текст «как объясняете гостю».
2. Server structured output → поля hub:
   - Gate: `publicTitle`, `publicSummary`, `publicText`, `publicGetOffAt` (если не walk-only)
   - Optional: `publicPreview`, `publicWalkToHostel`, `tips[]`, `routeMode` если явно walk-only
   - `locationLabel` — autofill как сейчас, не gate
3. **Не invent:** не добавлять номера линий/остановки/цены, которых нет во вводе или в ответах на follow-up.
4. **Single scenario:** один primary path в steps/summary (transit **или** walk-only). **Запрещено** смешивать «садитесь в автобус» и «возьмите такси» в одном `publicText` / `publicSummary`.
   - Такси как альтернатива → `tips[]` (напр. ночь/выходные) **или** существующая вторая карточка `alternativeRoute` на guest — **не** в том же body primary hub.
5. **Follow-up:** `openQuestions[]` если данных не хватает; поле **не заполнять**; «не знаю» → поле пустое, вопрос остаётся в **checklist** до ответа или явного dismiss (product: checklist предупреждает, Apply разрешён только если gate EN OK — открытые вопросы не блокируют gate, но видны в UI).
6. **Preview → Apply** в draft state hub; **regenerate one field** без перезаписи остальных.
7. **Translate:** отдельная кнопка **Translate EN → RU** (не шаг Guided wizard).

### API / infra

- Server action; ключ `GEMINI_API_KEY` и/или Vercel AI Gateway.
- Auth: admin session / tenant save path.
- Rate limit; не логировать PII/полный сырой текст в production logs.

### Acceptance P1 (Guided)

- [ ] Preview/Apply; per-field regen.
- [ ] Fixture-тест промпта/парсера: вход bus+taxi → steps только bus; taxi только tips или openQuestion.
- [ ] openQuestions + пустые поля при «не знаю».
- [ ] Translate отдельно от Guided.

### Файлы P1 (Guided) — ориентир

- Новый lib в `entities/city-pack` или `features/city-pack-guided-fill` (FSD: UI / model / api раздельно)
- `CityPackRouteEditor.tsx`, server action под admin
- Tenant: путь после inventory override (см. ниже)

---

## Tenant slice (обязательно)

**По умолчанию для P1:**

- **Tenant Guided** меняет только override, разрешённый tenant: минимум **`publicWalkToHostel`**, опционально **`tips[]`** для last mile.
- **Не** перезаписывает city pack `publicTitle`, `publicSummary`, `publicText`, `publicGetOffAt` без отдельного product decision.

Перед реализацией tenant UI — **inventory** существующих tenant route overrides в коде; если уже есть broader override — согласовать с product.

---

## Alternative taxi vs bus (guest)

| Слой | Правило |
|------|--------|
| Primary card | Один сценарий (transit path или walk-only) |
| `alternativeRoute` | Вторая карточка на DirectionPicker — не объединять с primary в Guided output |
| Tips | Контекст («оплата», «ночью такси»), не дублировать второй маршрут в steps |

---

## City-wide (без изменений логики P0/P1)

Taxi name/phone, `warnings.*`, pre-trip Sunday — остаются city-wide в pack wizard; **не** дублировать hub tips, если тот же смысл уже в city-wide (Guided спрашивает hub-specific tips при заполнении hub).

---

## Out of scope (весь эпик)

- Auto-publish после AI.
- Генерация transit numbers без источника в UI (slim admin).
- Слияние Summary + Step-by-step в одно поле.
- SQL-миграция старых packs (autofill/save достаточно).
- Hard-drop полей из `CityPackRouteContent`.

---

## Порядок реализации (Agent)

1. **P0** guest timeline + summary (Strict File Scope — только файлы P0).
2. **P1** schema tips + guest block + admin Manual tips.
3. **P1** Guided admin + tests.
4. **P1** tenant Guided (last mile) после inventory.

---

## Связанные решения (чат)

- Gate EN: 4 поля; walk-only без get off; `locationLabel` autofill — см. slim arrival form (уже в коде).
- Tips: спросили при fill — показали; иначе блока нет.
