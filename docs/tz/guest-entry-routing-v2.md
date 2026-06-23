# TZ v2: Guest entry routing, intent и arrival guide flow

**Версия:** 2.0  
**Статус:** In progress (PR2)  
**Ветка:** `feat/guest-intent-screen`

---

## 1. Проблема

1. После PIN/token → **Settlement** («Welcome Inside»), хотя регистрация в системе ≠ гость в хостеле.
2. Один URL `/check-in?t=TOKEN` для WA (дома) и QR (на стойке).
3. Незареганный гость → sheet с **звонком** как primary вместо **Sign in**.
4. Повторный scan token при активной сессии → форма PIN.
5. Разные точки входа (дверь, стойка, concierge) не разведены в UX.

---

## 2. Модель

### Auth + Intent

| Слой | Вопрос |
|------|--------|
| **Auth** | PIN / token → session |
| **Intent** | Где гость сейчас? (`planning` \| `at_door` \| `at_desk`) |

### Intent → landing

| Intent | Welcome step |
|--------|----------------|
| `planning` | `route` (default) |
| `at_door` | `arrival` |
| `at_desk` | `settlement` |

### URL `entry=` (опционально, пропуск intent screen)

| `entry` | После auth |
|---------|------------|
| `remote` | `step=route` |
| `door` | `step=arrival` |
| `desk` | `step=settlement` |

`?mode=onsite` → `step=arrival` (legacy).

### Физические QR (гибрид v1)

- **Один** guest QR на дверь/стойку → `/check-in` или personal `?t=`
- **Отдельный** Concierge → `/concierge`
- Подпись на стикере задаёт ожидание; intent screen в PR2

---

## 3. Entry points

| Вход | Нет сессии | Есть сессия |
|------|------------|-------------|
| `/check-in?t=TOKEN` | activate → landing по `entry` | redirect по `entry`, не PIN form |
| `/check-in` + PIN | activate → `route` default | — |
| Locked welcome tab | → `/check-in` | — |
| `/concierge` | concierge + soft gate | full |

---

## 4. PR plan

| PR | Scope |
|----|--------|
| **PR1** | Redirect route, Sign in primary, registered+token, locked→check-in, `resolveGuestWelcomePath` |
| **PR2** | Intent screen, `entry=` в magic link, sessionStorage intent |
| **PR3** | Preparation sections, Settlement copy by intent |
| **PR4** | Reception Send vs Desk QR, e2e, ops doc |

---

## 5. PR1 tasks

- [x] `resolveGuestWelcomePath` helper
- [x] PIN/token → `welcome?step=route` (default)
- [x] `entry=door|desk` + `mode=onsite` support
- [x] Registered + `?t=` → redirect, not PIN form
- [x] `CheckInRequiredSheet` primary Sign in
- [x] Locked chips / URL → `/check-in`
- [x] QA doc + unit tests

---

## 6. Out of scope

- Геолокация, 4 разных физических URL
- Intent screen (PR2) — done in `feat/guest-intent-screen`
- Preparation / Settlement copy split (PR3)

---

## 7. Acceptance (PR1)

| # | Критерий |
|---|----------|
| A1 | PIN → `welcome?step=route` |
| A2 | Token default → `step=route` |
| A3 | Registered + `?t=` → не PIN form |
| A4 | Locked arrival/settlement → `/check-in` |
| A5 | Sheet primary = Sign in |
