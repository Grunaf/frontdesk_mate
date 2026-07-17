# TZ: Staff knowledge bootstrap — questionnaire + Auto / Manual

**Версия:** 3.0  
**Статус:** Implemented  
**Приоритет:** P1  
**Оценка:** M  
**Маршрут:** owner `/knowledge` → Build structure  
**База:** v2 multi-step AI (readiness → roles → checklists)

## Summary

Build structure: **Auto generate | Manual (prompts)** + опросник с prefill из tenant settings / room map. Ответы пишутся обратно в `TenantSettings` (`checkIn`/`reception` + `staffKnowledgeIntake`).

## Поток

### Auto
Questionnaire (prefilled) → Check readiness → Generate structure (A→B→C) → Preview → Apply  
Copy/Paste — Advanced.

### Manual
Тот же questionnaire → Copy AI prompt → Paste → Preview → Apply (без native Generate).

## Prefill

- check-in/out, reception open/close/hint, laundry signal, quiet hours, property TZ  
- rooms/beds из `guestStay` (`deriveGuestStaySize`)  
- knowledge-only chips: labor, night, cleaning, laundry ops, payments, keys, peak, special constraints  

## Persist

`persistStaffKnowledgeQuestionnaireAction` + на readiness / generate / apply / copy prompt.

## Файлы

- `ui/BootstrapQuestionnaireForm.tsx`, `StaffKnowledgePanel.tsx`
- `lib/buildBootstrapQuestionnairePrefill.ts`, `deriveGuestStaySize.ts`, `applyQuestionnaireToTenantSettings.ts`
- `lib/buildBootstrapPrompt.ts` (`buildBootstrapIntakeSummary`)
- `api/staffKnowledgeActions.ts`, `staffKnowledgeGenerateActions.ts`
- `entities/tenant` — `staffKnowledgeIntake`
- i18n en/ru/sr
