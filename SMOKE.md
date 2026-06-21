# Manual smoke (after `npm run smoke` is green)

Automated smoke covers admin login, city packs, guest PIN, arrival routes, and Local Guide essentials.
These items still need a quick human pass:

- [ ] **Mobile width** — guest app readable on phone (375px)
- [ ] **RU locale** — switch to `/ru/welcome`, key labels not broken
- [ ] **Images** — door/facade/hero load (no broken placeholders)
- [ ] **Reception flow** — create new PIN, old PIN from `e2e/env.local` still works
- [ ] **Visual polish** — spacing, chips, bottom sheets feel OK

When something fails in automation, open the HTML report:

```bash
npx playwright show-report
```
