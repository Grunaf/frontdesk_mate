# TZ: Multi-guest booking + private room (whole-room sell)

**Версия:** 1.0  
**Статус:** In progress (slice 1–2 + partial 3 in working tree)  
**Приоритет:** P1  
**Оценка:** L  
**UI copy:** EN (reception); landing copy отдельно  
**Поверхности:** Create booking (`IssueGuestAccessForm` / `ReceptionCheckInPanel`) → `ReceptionGuestStayDetail` / Plan / Cash / Landing stay offers

**Контекст чата:** обсуждение 2026-07-26…27 — party size, bed per guest, Balance due из offer, Plan private rooms, landing parity, без admin-флага для редкого dorm-override.

**Цена room unit (зафиксировано):** **(A)** `basePriceEur` = комната / ночь → `due = unit × nights` (guestCount только capacity).  
Bed unit: `unit × nights × guests`.

---

## Summary

Одна бронь может включать **N гостей** и **N кроватей**.  
**Private / whole-room** — продукт stay offer (landing + reception), не reception-only трюк.  
Редкая сдача private **по кроватям** — операторский override без записи в admin settings.

---

## Проблема

1. Сейчас **1 бронь = 1 `guest_reservations` = 1 `bed_id` = 1 имя**.  
2. `Balance due` в форме выдачи — ручной ввод; `offer.basePriceEur` не подставляется.  
3. В detail (`StayBookingBalanceBlock` в `ReceptionGuestStayDetail.tsx`) — balance одной записи.  
4. Plan показывает **каждую кровать** → в private double свободные beds выглядят как отдельные walk-in слоты.  
5. Whole-room нельзя завязать только на «добавить людей на ту же кровать» на reception — **landing** тоже должен продавать комнату целиком.

---

## Цель

1. Выбрать **кол-во гостей** в одной броне.  
2. Для **каждого** гостя — кровать (auto / advanced).  
3. **Balance due** префиллить из stay offer (редактируемо).  
4. **Whole-room offer** общий для landing + reception.  
5. Plan не рекламирует free beds рядом с whole-room / party occupancy.  
6. Редкий per-bed override private — без admin persistence.

---

## Продуктовые решения (зафиксировано)

### Whole-room vs per-bed

| | Whole room (норма для Private) | Per bed (редко) |
|--|--------------------------------|-----------------|
| Каналы | **Landing + reception** | Только reception override |
| Где живёт | На **stay offer** (уже admin-сущность) | Не в tenant settings |
| Plan | Комната / party как единица | Advanced + confirm |

- **Не хранить** в admin отдельный «режим редкого dorm» для private.  
- **Хранить** на stay offer минимальный признак whole-room (это продукт, не исключение).  
- Reception-only «докинуть на ту же кровать» — **недостаточный** единственный способ.

### Минимальное поле на stay offer (без новой секции UI)

На `StayOffer` (рядом с `basePriceEur`), тихо в Stay offers form:

- `bookingUnit: 'room' | 'bed'` (default `'bed'`)

Private offer → `bookingUnit: 'room'`.  
**Вместимость** — от физической комнаты (beds в room map), не от категории offer.  
Rooms с этим `offerId` наследуют whole-room поведение.  
Landing и Create booking читают одно и то же.

Отдельной секции «Private rooms» / sellUnit на room **не делать**.  
`maxGuests` на offer **не хранить** (отклонено 2026-07-27: capacity ≠ category).

### Разовый dorm override

Без записи в tenant: reception Advanced / confirm  
«Book another bed in this room anyway?».  
На landing такой режим **не открывать**.

### Plan

- При effective whole-room / существующей party-брони на комнату: не предлагать соседние free beds той же комнаты на те же ночи как обычный walk-in (схлопнуть / заблокировать).  
- Пустая private без брони: может показывать beds как сейчас, пока create/landing берут offer как room unit.  
- Не прятать free beds «навсегда» только по названию Private без `bookingUnit`.

---

## Модель данных (бронь)

**Рекомендация v1:** N строк `guest_reservations` + общий `booking_group_id` (новая колонка, UUID, nullable, indexed).

Не ломать «1 bed / 1 stay» для Plan / overlap / Cash.

| Поле | Lead stay | Sibling stays |
|------|-----------|-----------------|
| bed / dates / platform | свои | те же dates/platform; свой bed |
| guest_name / guest_id | lead | опционально «Guest 2»… до tourism |
| `booking_amount_*` | **полный group total** | `null` |
| access grant | да | да (отдельный PIN/link) |
| `booking_group_id` | UUID | тот же UUID |

**Альтернатива (out of v1):** одна reservation + multi-bed JSON.

### Открытый вопрос (revoke)

При revoke/checkout **одного** из party: balance на lead оставляем как есть, или пересчитываем `unit × nights × remaining`?  
**По умолчанию в draft:** не пересчитывать автоматом в v1.

---

## Scope (ориентир файлов)

| Слой | Зона |
|------|------|
| UI create | `IssueGuestAccessForm.tsx`, `ReceptionCheckInPanel.tsx` |
| Detail | `ReceptionGuestStayDetail.tsx` — party list + shared balance |
| Plan | `BedAccessCalendar.tsx`, `resolveBedDayCalendar` / filters |
| Price helper | `entities/tenant` или `guest-registration/lib` — `resolveReceptionOfferBalance(...)` |
| Offer model | `entities/tenant/model/stayOffers.ts`, normalize, StayOffersFields (тихое поле) |
| Landing | resolve / booking flow по `bookingUnit` offer |
| API | `createGuestStayAction` / repository — batch create + `booking_group_id` |
| Schema | migration: `guest_reservations.booking_group_id` |

### Out of scope (v1)

- Разный check-in/out на гостя внутри party.  
- Site discount (`siteBookingDiscountPercent`) в reception Balance due (web-only; reception = raw `basePriceEur`).  
- Split payment per bed в Cash.  
- Полный tourism N профилей за один клик.  
- Admin toggle «эта комната сейчас dorm».  
- Group edit (move/extend всей party) — P2.

---

## Поведение

### A. Create booking form

1. **Guests:** `1…min(availableCapacity, cap)` (cap например 8). Capacity = free beds (для room-unit — beds выбранной физической комнаты / same-room auto-assign).  
2. N слотов кроватей:
   - default: auto-assign N free beds из offer pool;  
   - Advanced: picker на слот; beds не дублируются.  
3. Lead guest name обязателен; слоты 2…N — «Guest 2»… или пусто до tourism.  
4. Submit → N reservations + N grants, один `booking_group_id`.

### B. Balance due

```
nights = checkOut − checkIn
unit   = offer.basePriceEur   // нет → не автозаполнять
due    = unit × nights × guestCount   // уточнить: для room unit цена за комнату × nights (не × guests)?
```

**Цена room unit (зафиксировано 2026-07-27):**  
- **(A)** `basePriceEur` = цена **комнаты** / ночь → `due = unit × nights` (guestCount только capacity).  
- Bed (default): `due = unit × nights × guestCount`.

~~Открытый вопрос по цене room unit~~ — закрыт (A).

- Prefill при смене offer / dates / N.  
- Ручной override остаётся.  
- Currency — primary tenant.  
- Volunteer / без offer — без авто.

### C. ReceptionGuestStayDetail

1. При `booking_group_id` — блок **Party**: sibling beds + имя/ref, клик → sibling.  
2. Stay balance: group total на lead; siblings — «Included in party balance» / без Mark paid.  
3. Paid toggle на lead.

### D. Plan / Cash

- Plan: N bed cells для party **или** room-collapsed row для whole-room (см. выше).  
- Cash: одна unpaid строка на group (lead с amount), не N дублей.

### E. Landing

- Offer с `bookingUnit: 'room'` бронируется как единица (capacity = beds комнаты).  
- Нельзя создать вторую независимую web-бронь в ту же room на пересекающиеся ночи.  
- Цена согласована с формулой Balance due (после решения A/B выше).

---

## Acceptance

- [ ] Create: Guests=2 → 2 bed slots; нельзя одну кровать дважды.  
- [ ] Offer с ценой + даты + N → Balance due префилл (override ок).  
- [ ] Save → N reservations, один `booking_group_id`, amount только на lead.  
- [ ] Detail lead: party + balance; sibling без второго Mark paid.  
- [ ] Cash не дублирует unpaid total.  
- [ ] Guests=1 — как сегодня (`booking_group_id` null или singleton).  
- [ ] Stay offer `bookingUnit: 'room'` работает на **landing и reception**.  
- [x] Plan не предлагает walk-in на free bed в комнате, уже занятой whole-room/party на эти ночи.  
- [x] Разовый per-bed в private room — reception confirm (Create → Advanced **или** Plan blocked cell → modal → Create), без admin flag.  
- [ ] Нет новой admin-секции «Private rooms».

---

## Риски

1. Edit / move / extend сейчас на 1 stay — group = P2.  
2. Revoke одного из party vs balance.  
3. Auto-assign N beds vs full offer / overlap.  
4. Путаница цены room vs per-person на offer (решить A/B).  
5. Housekeeping per-bed vs Plan room-first.

---

## Предлагаемая нарезка чатов

1. **Schema + create batch + Balance prefill** (reception).  
2. **Stay offer `bookingUnit` + landing**.  
3. **Detail party UI + Cash dedupe**.  
4. **Plan collapse / block free beds under party/whole-room**.  
5. **Rare dorm override confirm** (Create → Advanced; Plan blocked → modal → Create overlay).

---

## Tracked paths

```
src/features/guest-registration/ui/IssueGuestAccessForm.tsx
src/features/guest-registration/ui/ReceptionCheckInPanel.tsx
src/features/guest-registration/ui/ReceptionGuestStayDetail.tsx
src/features/guest-registration/ui/BedAccessCalendar.tsx
src/entities/guest-stay/
src/entities/tenant/model/stayOffers.ts
src/entities/tenant/lib/normalizeStayOffers.ts
src/app/admin/(protected)/tenants/sections/StayOffersFields.tsx
src/entities/tenant/lib/resolveSiteBookingPrice.ts
```
