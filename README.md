## Contacts/Invites (Simplified)

Стек:
- **Backend:** NestJS + TypeScript, Prisma (SQLite), JWT, bcrypt
- **Frontend:** Next.js 14 + TypeScript, TailwindCSS, Zustand

Возможности:
- Регистрация/логин по email+пароль
- Личный кабинет: просмотр контактов
- Приглашение по email: выдаётся ссылка вида `/invite/:token`, принимается на странице приглашения

### Быстрый старт (локально, без Docker)
1. Подготовьте переменные окружения (секреты не коммитим):
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   # опционально: frontend/.env.local с NEXT_PUBLIC_API_URL=http://localhost:3001
   ```
2. Установка зависимостей (npm workspaces):
   ```bash
   npm install
   ```
3. Prisma (SQLite по умолчанию):
   ```bash
   cd backend
   npx prisma generate
   npx prisma db push
   ```
4. Запуск:
   ```bash
   npm run dev          # в папке backend
   cd ../frontend && npm run dev -- -p 3002   # можно выбрать свой порт
   ```
5. Открыть фронт в браузере на нужном порту:
   - Зарегистрироваться → зайти → на главной отправить приглашение по email.
   - Скопировать выданную ссылку, открыть её в другом браузере/инкогнито, принять приглашение.

Примечания:
- CORS в dev разрешает все origin на localhost.
- Если меняете порт фронтенда, ссылка на приглашение автоматически подставляет текущий origin.

### Docker (опционально)
- Скопируйте `.env.example` в `.env` и при необходимости замените `DATABASE_URL` на Postgres (`postgresql://postgres:postgres@postgres:5432/chatdb?schema=public`).
- Запуск: `docker-compose up --build`
- Бэкенд поднимется на `3001`, фронтенд запускайте отдельно (или добавьте сервис в compose).
