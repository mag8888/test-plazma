# Инструкция по запуску на Railway.app

Этот репозиторий является монорепозиторием (Monorepo), содержащим и Frontend (Next.js), и Backend (Node.js/Express). Для корректной работы нужно создать **два сервиса** в одном проекте Railway.

## Шаг 1: Создание проекта
1. Зайдите на [Railway.app](https://railway.app/).
2. Нажмите **New Project** -> **Deploy from GitHub repo**.
3. Выберите репозиторий `moneo`.

## Шаг 2: Настройка Backend
4. При первой настройке Railway может попытаться определить проект. Нажмите **Add Variables** или **Settings**.
5. Перейдите в **Settings** сервиса.
6. Найдите раздел **Root Directory** и укажите: `/backend`
7. В **Variables** добавьте:
   - `PORT`: `3001` (или Railway выдаст свой)
   - `TELEGRAM_BOT_TOKEN`: Ваш токен бота
   - `WEB_APP_URL`: Ссылка на ваш Frontend (после деплоя фронтенда)
8. Команда запуска (Start Command) определится автоматически из `package.json` (`npm start`), или укажите: `npm run build && npm start`.

## Шаг 3: Настройка Frontend
9. Вернитесь в Graph View проекта.
10. Нажмите **New** -> **GitHub Repo** -> снова выберите `moneo`.
11. Перейдите в **Settings** нового сервиса.
12. **Root Directory**: `/frontend`
13. В **Variables** добавьте:
    - `NEXT_PUBLIC_API_URL`: Ссылка на ваш Backend сервис (например `https://backend-production.up.railway.app`)
14. Railway автоматически определит Next.js и настроит деплой.

## Шаг 4: Связка
15. После деплоя Frontend, скопируйте его домен (Custom Domain).
16. Вернитесь в переменные Backend и обновите `WEB_APP_URL`.
17. Откройте BotFather в Telegram и настройте кнопку Menu Button, указав ссылку на Frontend.

## Локальный запуск
1. `cd backend && npm install && npm run dev`
2. `cd frontend && npm install && npm run dev`
