# TZ: Tenant admin — launch wizard, room preview, section nav progress (v1.4)

**Version:** 1.4  
**Status:** Implemented  
**Depends on:** tenant-admin-fields v1.2, v1.3  
**Goal:** launch wizard на новых секциях, live preview карточки комнаты в admin, прогресс must-полей в боковой навигации.

## Problem

- Launch wizard дублировал старые монолитные секции; arrival и policy были размазаны.
- Админ не видел, как карточка комнаты выглядит у гостя (особенно без description).
- В nav не было счётчика «сколько must-полей готово для гостей» по секции.

## Launch wizard

| Step | Panel | Scope |
|------|-------|-------|
| `identity` | Identity + subscription | unchanged |
| `contacts-landing` | `ContactsFields` launch-core + `LandingFields` launch-hero | reception phone, stay policy, hero |
| `booking` | fork engine / WA | WA: info + «Open Reception & hostel», rooms via `launch-rooms` |
| `arrival` | `ArrivalJourneyFields` launch-core | address, transport, access |
| `room-map` | `GuestStayFields` | preview bed minimum |
| `rules-wifi` | city pack status + `GuestAppFields` rules-only + WiFi | |
| `preview` | `LaunchPreviewStep` | go live |

- Панели шагов **не размонтируются** (`hidden` + `aria-hidden`) — draft не сбрасывается при переключении.
- Ссылки «Open full {section} →» ведут в advanced mode (`onJumpToAdvancedSection`).
- `launchSteps.ts` — `arrival-journey` вместо разрозненных arrival/contacts кусков.

## Landing room preview

- `LandingRoomCardPreview` — admin shell вокруг `LandingRoomCard` (`variant="preview"`).
- Показывается в `LandingFields` при наличии title или image.
- Hint при пустом description: guests видят photo, title, price, CTA only (TZ v1.2 guest empty).

## Section nav progress

- `resolveAdminSectionProgress.ts` — `getAdminSectionGuestProgress(sectionId, input)` из `resolveTenantReadiness` items с `sectionId`.
- Формат: `{complete}/{total} for guests` в sidebar nav и в заголовке accordion-секции.
- `null` если у секции нет tracked items (например booking при `provider: none`).

## Implementation files

| File | Purpose |
|------|---------|
| `src/app/admin/(protected)/tenants/ui/LandingRoomCardPreview.tsx` | admin room card shell |
| `src/app/admin/(protected)/tenants/launch/LaunchSetupWizard.tsx` | wizard panels + hidden mount |
| `src/app/admin/(protected)/tenants/launch/launchSteps.ts` | step definitions |
| `src/app/admin/(protected)/tenants/sections/ArrivalJourneyFields.tsx` | arrival composite |
| `src/app/admin/(protected)/tenants/lib/resolveAdminSectionProgress.ts` | progress helpers |
| `src/app/admin/(protected)/tenants/TenantFormAccordion.tsx` | nav progress labels |

## Acceptance criteria

**Launch:** все шаги рендерят поля без потери draft; WA path без отдельного booking phone; jump в advanced section работает.  
**Preview:** карточка совпадает с guest `LandingRoomCard`; empty description hint виден в admin.  
**Nav:** `N/M for guests` только для секций с readiness items; тесты `resolveAdminSectionProgress.test.ts` зелёные.

## Rollout

Реализовано вместе с v1.3 wiring (коммит `feat(tenant): admin field UX`); TZ v1.4 документирует scope Chat 5.
