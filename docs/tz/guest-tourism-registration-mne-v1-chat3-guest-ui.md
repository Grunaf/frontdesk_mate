# TZ: Guest tourism registration — Chat 3 Guest UI

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** M–L  
**Мастер-TZ:** [guest-tourism-registration-mne-v1.md](./guest-tourism-registration-mne-v1.md)

## Summary

UI шага регистрации: multi-guest, один WhatsApp, завершение с чекбоксом «все зарегистрированы».

## Scope

### Компонент `TourismRegistrationPanel`

Props: `onComplete: () => void` (переход на settlement после успешного complete).

**Секции:**

1. **Intro** — Montenegro requirement; каждый проживающий отдельно; у каждого свои фото паспорта и штампа.
2. **Reservation name** (read-only) — если `session.guestName` / `guest_name` есть: label «Name on reservation»; не редактируется.
3. **Added guests** — список карточек (first + last name, статус «Photos uploaded»).
4. **Add guest form** — first name, last name, file passport, file entry stamp; кнопка Add → compress on client → `submitTourismGuestAction` → refresh list.
5. **Contact** — одно поле WhatsApp (контактное лицо для всего stay); валидация до submit complete.
6. **Finish** — checkbox: «Everyone staying at this accommodation is listed above»; primary CTA → `completeTourismRegistrationAction` → `onComplete()`.

### UX

- Primary disabled: guests.length < 1 OR !checkbox OR invalid whatsapp OR pending upload.
- Loading / error toasts; inline errors на полях.
- После complete в рамках сессии — panel может показать read-only summary (optional) или сразу callback.

### i18n

- Keys под `pages.arrivalJourney.register.*` (en + существующие локали проекта для app-site).

## Поведение

- Сжатие вызывать перед каждым submit guest.
- Не показывать add-guest form если registration already complete (fetch flag from list action or prop from parent).

## Out of scope

- Chip bar / `ArrivalJourneyCoordinator` (чат 4)
- Reception, admin

## Acceptance

- [ ] 2+ гостя с разными ФИО и отдельными upload.
- [ ] Один WhatsApp на stay при complete.
- [ ] Имя с брони видно, но не в форме редактирования.

## Файлы (strict)

- `src/features/guest-tourism-registration/ui/TourismRegistrationPanel.tsx`
- `src/features/guest-tourism-registration/ui/AddTourismGuestForm.tsx` — optional split
- `src/features/guest-tourism-registration/ui/TourismGuestList.tsx` — optional split
- `src/features/guest-tourism-registration/index.ts` — export panel
- `src/shared/i18n/messages/en.json` (+ другие locale files проекта для app)

## Промпт для чата

```
ТЗ Guest tourism registration Chat 3: TourismRegistrationPanel multi-guest + one WhatsApp.
Зависит от Chat 2 actions. Strict scope: features/guest-tourism-registration/ui + i18n.
```
