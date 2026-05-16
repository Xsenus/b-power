# B-POWER landing

## Production on TimeWeb

Live TimeWeb hosting uses the static Vite build plus the PHP API fallback:

- `public/.htaccess` routes `/api/*` to `public/api.php` and all frontend routes to `index.html`.
- `public/api.php` stores editable content and leads in `public/app-data/`.
- `public/app-data/content.json` is the live editable content file on TimeWeb.
- `public/app-data/leads.json` is the live leads file on TimeWeb.
- `public/app-data/config.php` stores the admin password hash/secret and must not be committed.

For a fresh PHP hosting deployment, upload the contents of `dist/` plus `public/api.php`, `public/.htaccess`, favicon files, and the `public/assets/` folder. Then create `public/app-data/content.json` from the current `src/data/content.json`, create `public/app-data/leads.json` as `[]`, and add `public/app-data/config.php` with the admin password settings. The `public/app-data/.htaccess` file denies direct browser access to these JSON/config files.

The Node/Express backend in `server/` remains available for local development or Node hosting. On the current TimeWeb deployment, the active backend is `public/api.php`.

Production-ready лендинг B-POWER на React + Vite + TypeScript с тёмной темой, адаптивной вёрсткой, интерактивным блоком продукта, формой заявки, JSON backend и минимальной React-админкой.

## Что внутри

- `src/` — frontend на React/Vite/TypeScript.
- `src/components/` — компоненты лендинга: Header, Hero, About, ProductSwitcher, Benefits, FormSection, Footer, Admin, Ui.
- `src/data/content.json` — статический fallback контента, если backend API недоступен.
- `src/assets/` — исходная структура ассетов проекта.
- `public/assets/images/` — изображения, доступные по URL и редактируемые через `content.json`.
- `server/` — backend на Node.js + Express.
- `server/data/content.json` — основной редактируемый контент для админки.
- `server/data/leads.json` — заявки формы.
- `public/robots.txt`, `public/sitemap.xml`, `public/favicon.ico` — базовое SEO.

## Быстрый старт

```bash
npm install
cp .env.example .env
npm run dev
npm run server
```

Frontend dev-сервер: `http://localhost:5173/`  
Backend API: `http://localhost:5174/`  
Админка: `http://localhost:5173/admin`

Для production-сборки:

```bash
npm run build
npm run preview
```

Backend умеет отдавать собранный frontend из `dist/`, поэтому после сборки можно запускать один процесс:

```bash
npm run build
npm run server
```

## Команды

```bash
npm run dev          # Vite frontend
npm run server       # Express backend
npm run dev:server   # Express backend в watch-режиме Node
npm run build        # typecheck + Vite production build
npm run preview      # preview production build
npm run typecheck    # TypeScript проверка
npm run lint         # ESLint проверка
```

## Админка

Маршрут: `/admin`.

Пароль берётся только из backend `.env`:

```env
ADMIN_PASSWORD=change-me-strong-password
JWT_SECRET=change-me-random-secret
```

Если `.env` не настроен, локальный временный пароль: `admin`. На реальном сервере обязательно задайте `ADMIN_PASSWORD` и `JWT_SECRET`.

Админка позволяет:

- редактировать SEO, заголовки, тексты, кнопки;
- редактировать блок продукта и варианты продукта;
- менять URL/пути изображений;
- редактировать карточки преимуществ, аудитории и факты;
- смотреть заявки;
- экспортировать заявки в CSV.

Upload изображений намеренно не усложнялся. Новые изображения кладите в `public/assets/images/`, затем указывайте путь вида:

```text
/assets/images/my-image.webp
```

## API backend

- `GET /api/content` — получить контент.
- `PUT /api/content` — сохранить контент, нужен Bearer token админки.
- `POST /api/leads` — сохранить заявку в JSON.
- `GET /api/leads` — получить заявки, нужен Bearer token.
- `GET /api/leads/export` — скачать заявки в CSV, нужен Bearer token.
- `POST /api/send-lead` — отправить заявку на email через SMTP.
- `POST /api/auth/login` — вход в админку.
- `GET /api/health` — health-check.

## Форма заявки

Форма валидирует имя и телефон, применяет простую телефонную маску, показывает ошибки, loading/success/error состояния и блокирует повторную отправку после успеха.

Основной сценарий — сохранение заявки в `server/data/leads.json` через `POST /api/leads`.

Каждая заявка содержит:

- `id`;
- `name`;
- `phone`;
- `email`, если передан;
- `message`, если передан;
- `source`;
- `createdAt`.

## Email через SMTP

Email-эндпоинт дополнительный. Заполните в `.env`:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=login
SMTP_PASS=password
MAIL_FROM=B-POWER <no-reply@buffalo-protein.ru>
MAIL_TO=info@buffalo-protein.ru
```

Если SMTP не настроен, `/api/send-lead` возвращает понятную ошибку и backend не падает.

## SEO

Добавлены:

- `lang="ru"`;
- title/description/canonical;
- Open Graph и Twitter Card;
- favicon;
- robots.txt;
- sitemap.xml;
- семантические `header`, `main`, `section`, `footer`, `nav`;
- один `h1`;
- `alt` для смысловых изображений;
- focus-состояния для интерактивных элементов.

## Ассеты

Из PDF-макетов извлечены и подготовлены:

- логотип B-POWER;
- hero background с банкой;
- изображение основного продукта;
- изображения вариантов продукта;
- мужчина с напитком;
- буйволица;
- фото для блока фактов;
- фон формы;
- фото для карточки спортсменов;
- product set для OG/формы.

Файлы лежат в:

```text
public/assets/images/
src/assets/images/
```

Шрифт из Figma/PDF как отдельный лицензируемый файл не был доступен. В проекте используется стек безопасных/системных замен с акцентом на `PT Sans Narrow`, если он есть у пользователя. Для максимального pixel-perfect результата замените heading font на оригинальный лицензированный шрифт макета и подключите его самостоятельно через `@font-face`.

## Адаптив

Поддержаны основные breakpoints:

- 360px;
- 480px;
- 768px;
- 1024px;
- 1280px;
- 1440px;
- 1920px.

Mobile — отдельная компоновка: бургер-меню, вертикальные карточки, горизонтальные scroll-ленты для фич и аудитории, перестроенный footer и форма.

## Проверки, выполненные в среде разработки

Выполнены:

```bash
npm install
npm run dev
npm run server
npm run build
npm run preview
npm run typecheck
npm run lint
```

Проверены API и форма:

- пустая заявка через API возвращает ошибку;
- валидная заявка сохраняется в `server/data/leads.json`;
- вход в админку работает;
- список заявок доступен в админке;
- export CSV работает;
- `PUT /api/content` сохраняет контент;
- `/api/health` отвечает.

Проверены размеры через headless browser:

- 1920px;
- 1440px;
- 1366px;
- 1024px;
- 768px;
- 480px;
- 390px;
- 360px.

Результаты browser-проверки: нет горизонтального scroll (`scrollWidth === clientWidth`), один `h1`, нет смысловых изображений без `alt`, интерактивный ProductSwitcher переключается, форма отправляется, админка открывает заявки.

## Что проверить на реальном сервере

- При переносе с тестового домена обновить `SITE_URL`, canonical, sitemap URL и OG image absolute URL.
- Проверить HTTPS и routing на целевом домене.
- Задать сильные `ADMIN_PASSWORD` и `JWT_SECRET`.
- Настроить SMTP, если нужна отправка на email.
- Заменить временные/извлечённые из PDF ассеты на оригинальные export-файлы из Figma, если они будут доступны.
- Подключить оригинальный лицензированный шрифт макета.
- Проверить политики обработки персональных данных и реальные ссылки footer.
