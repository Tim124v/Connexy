# Connexy

Приватные связи: контакты, приглашения по ссылке, чаты.

**Стек:** Backend — NestJS, Prisma (SQLite/Postgres), JWT. Frontend — Next.js 14, TailwindCSS, Zustand.

**Возможности:** регистрация/логин, личный кабинет, приглашения по email (ссылка `/invite/:token`), чаты и комнаты.

---

### Быстрый старт (локально)

1. **Переменные окружения** (скопировать примеры, подставить свои секреты):
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```

2. **Зависимости и БД:**
   ```bash
   npm install
   cd backend && npx prisma generate && npx prisma db push && cd ..
   ```

3. **Запуск** (из корня проекта):
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:3000  
   - Backend API: http://localhost:3001  

4. В браузере: регистрация → вход → дашборд → отправить приглашение по email, скопировать ссылку. Ссылку можно открыть в другом браузере/инкогнито и принять приглашение.

**Отдельный запуск:** `npm run dev:backend` (только API), `npm run dev:frontend` (только фронт).

---

### Сборка

```bash
npm run build
```

---

### Примечания

- CORS в dev разрешает localhost. В проде задайте `CORS_ORIGIN` и `FRONTEND_URL` в `.env` бэкенда.
- БД — PostgreSQL (Prisma). Локально: подними Postgres (Docker: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=connexy postgres`) и укажи `DATABASE_URL` в `backend/.env`.

---

### Деплой на Render (бэкенд)

1. **Web Service** → подключи репозиторий, укажи:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Start Command:** `npx prisma db push && node dist/main.js`
   - **Runtime:** Node

2. **Environment** в Render задай переменные (без секретов в репо):

   | Переменная      | Значение |
   |-----------------|----------|
   | `NODE_ENV`      | `production` |
   | `PORT`          | `10000` (или тот, что даёт Render) |
   | `DATABASE_URL`  | строка подключения Postgres (внутренний URL Render или свой) |
   | `JWT_SECRET`    | длинная случайная строка |
   | `JWT_EXPIRES_IN`| `7d` |
   | `CORS_ORIGIN`   | `https://connexy-frontend.vercel.app` (твой фронт на Vercel) |
   | `FRONTEND_URL`  | `https://connexy-frontend.vercel.app` (для ссылок приглашений) |
   | `SMTP_HOST`     | `smtp.gmail.com` |
   | `SMTP_PORT`     | `587` |
   | `SMTP_USER`     | твой email |
   | `SMTP_PASS`     | пароль приложения Gmail |
   | `SMTP_FROM`     | `"Connexy <твой-email@gmail.com>"` |

3. На Vercel у фронта в **Environment** задай:
   - `NEXT_PUBLIC_API_URL` = URL бэкенда на Render (например `https://connexy-backend.onrender.com`).
