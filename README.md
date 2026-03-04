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
- По умолчанию БД — SQLite (`backend/prisma/dev.db`). Для Postgres замените `DATABASE_URL` в `backend/.env`.
