# TZ: Guest notifications — Chat 2 PWA (app-site)

**Версия:** 1.0  
**Статус:** Draft  
**Оценка:** M  
**Мастер-TZ:** [guest-notifications-v1.md](./guest-notifications-v1.md)

## Summary

Installable PWA для guest app: manifest, icons, service worker с обработкой Web Push (`push`, `notificationclick`).

## Scope

- Выбор интеграции: `@ducanh2912/next-pwa` **или** ручной SW — совместимость с **Next 16** проверить в чате.
- Manifest: `name`, `short_name`, `display: standalone`, `theme_color`, `background_color`, icons 192/512.
- Подключение в `src/app/app-site/[locale]/layout.tsx` (metadata `manifest`, apple web app).
- SW: показ notification, click → открыть guest app path (`/{locale}/welcome` или concierge — зафиксировать один).
- `VAPID_PUBLIC_KEY` — только public на клиенте (env `NEXT_PUBLIC_VAPID_PUBLIC_KEY` или аналог проекта).

## Поведение

- Dev: не ломать `npm run dev` (отключение SW в development — по доке плагина).
- Multi-tenant: один manifest на origin `{slug}.app.*` (tenant-agnostic icons v1).

## Out of scope

- Сохранение `PushSubscription` в БД (Chat 3).
- Отправка push с сервера (Chat 4).

## Acceptance

- [ ] Production build регистрирует SW.
- [ ] Manifest отдаётся с app-site origin.
- [ ] Private VAPID key не в client bundle.

## Файлы (strict)

- `next.config.ts` (или `next.config.mjs`)
- `package.json` / `package-lock.json` — если новая зависимость
- `public/icons/icon-192.png`, `public/icons/icon-512.png` (или существующие assets)
- `public/manifest.webmanifest` — если не генерируется кодом
- `src/app/app-site/[locale]/layout.tsx`

## Промпт для чата

```
ТЗ Guest notifications Chat 2: PWA только app-site, Next 16. Manifest + SW для Web Push events. Без DB subscription. Strict scope: docs/tz/guest-notifications-v1-chat2-pwa-app-site.md
```
