# Connexy

Приватные связи: контакты, приглашения по ссылке, чаты.

**Стек:** Backend — NestJS, Prisma (Postgres), JWT. Frontend — Next.js 14, TailwindCSS, Zustand.

**Возможности:** регистрация/логин, личный кабинет, приглашения по ссылке (без email), чаты и комнаты.

---

## Локальный запуск

```bash
npm install
cd backend && npx prisma generate && cd ..
npm run dev
```

Фронт: http://localhost:3000, бэкенд: http://localhost:3001.

- В корне `.env` или в `backend/.env` нужен `DATABASE_URL` (Postgres). Для миграций из папки `backend`: `npx prisma migrate deploy`.

---

## Деплой

### 1. Бэкенд на Render

1. Зайди на [render.com](https://render.com) → Dashboard.
2. **PostgreSQL** (если ещё нет): New → PostgreSQL → создай БД, скопируй **Internal Database URL**.
3. **Web Service**: New → Web Service → подключи репозиторий GitHub.
4. Настройки:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Start Command:** `npx prisma migrate deploy && node dist/main.js`
   - **Environment** (обязательно):
     - `NODE_ENV` = `production`
     - `PORT` = `10000` (или оставь дефолт Render)
     - `DATABASE_URL` = строка подключения Postgres (Internal Database URL)
     - `JWT_SECRET` = длинная случайная строка (сгенерируй сам)
     - `JWT_EXPIRES_IN` = `7d`
     - `CORS_ORIGIN` = URL фронтенда (см. ниже), например `https://connexy-frontend.vercel.app`
     - `FRONTEND_URL` = тот же URL фронтенда (для ссылок приглашений)
   - По желанию SMTP для писем: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
5. Deploy. После деплоя скопируй URL сервиса (например `https://connexy-backend.onrender.com`).

Либо используй **Blueprint**: New → Blueprint → подключи репо и выбери `render.yaml`, затем в Environment добавь `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `FRONTEND_URL`.

### 2. Фронтенд на Vercel

1. Зайди на [vercel.com](https://vercel.com) → Add New → Project → импортируй тот же GitHub-репо.
2. Настройки:
   - **Root Directory:** `frontend` (или оставь корень и укажи в Build Settings Root Directory `frontend`)
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build` (или по умолчанию)
   - **Environment:**
     - `NEXT_PUBLIC_API_URL` = URL бэкенда с Render, например `https://connexy-backend.onrender.com` (без слэша в конце)
3. Deploy. Скопируй URL фронта (например `https://connexy-frontend.vercel.app`).

### 3. Связать фронт и бэкенд

- В **Render** у бэкенда в Environment задай:
  - `CORS_ORIGIN` = URL фронта с Vercel
  - `FRONTEND_URL` = тот же URL фронта
- Перезапусти сервис (Manual Deploy или последний деплой подтянет переменные при следующем деплое).

После этого логин, регистрация и приглашения по ссылке будут работать на проде.
