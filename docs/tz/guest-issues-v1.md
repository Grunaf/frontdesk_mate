# TZ: Guest issues (report a problem) + reception Issues tab

**Version:** 1.0  
**Status:** Implemented (P1)  
**Dependencies:** My stay, stay ref, reception desk, registered session

## Privacy (v1)

- Form shows `privacyNotice`: only reception sees the report; not shared publicly.
- Guest preview emphasizes **bed + ref**, not guest name.
- Desk list: **category · bed · ref** primary; guest name secondary (muted).

## P1 scope

- Concierge card + My stay link → same bottom sheet form
- Categories: shower, toilet, door_lock, bed, wifi, other
- Optional note (max 500 chars)
- Max 3 open reports per stay
- Reception **Issues** tab: Open / Done, mark done, 30s polling
- Bed/ref click → focus stay on Access tab

## P2 backlog

Guest: photo, status in app, in progress, first-visit hint, `/?report=1`, Access fallback.  
Desk: in progress, notify, search, analytics, close comment.  
Ops: email digest, tenant toggle, auto-close after checkout.
