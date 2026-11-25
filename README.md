# CITY: сайт агентства недвижимости

Сайт https://city05.ru. Статический сайт на Cloudflare Pages (проект `city`, собирается из ветки `main`) плюс функции Pages в папке `functions/`.

## Структура
- `index.html`, `object.html`, `privacy.html`, `404.html`: страницы сайта. Разделы `pokupka/`, `prodazha/`, `arenda/`, `uslugi/`, `o-kompanii/`: информационные страницы.
- `listings.json`: каталог объектов. Порядок в файле = порядок на сайте (сверху вниз).
- `assets/`: фото объектов и логотип.
- `admin.html`: панель управления объектами (`https://city05.ru/admin.html`).
- `functions/`: страницы объектов `/o/<id>`, `sitemap.xml`, `robots.txt`, редирект с `*.pages.dev` и `www` на основной домен, публикация в Telegram (`functions/api/publish.js`).
- `worker/`: Cloudflare Worker `city-leads`, который пересылает заявки из формы в Telegram.

## Заявки в Telegram
Токен бота нельзя хранить в коде сайта. Форма отправляет заявку в Worker `city-leads`, а токен лежит в секретах Cloudflare.
1. Узнайте chat id: напишите боту, откройте `https://api.telegram.org/bot<ТОКЕН>/getUpdates` и найдите `"chat":{"id":...}`.
2. В Cloudflare: Workers & Pages → Create → Worker `city-leads`, код из `worker/worker.js`.
3. Settings → Variables and Secrets: Secret `BOT_TOKEN`, Secret `CHAT_ID`, Text `ALLOWED_ORIGINS` (`https://city05.ru,https://www.city05.ru`), привязка Rate Limiting `LEAD_RATE_LIMITER` (описана в `worker/wrangler.toml`).
4. Адрес Worker вписан в `LEAD_URL` в `index.html` и `object.html`.

Если токен бота когда-либо попадал в чат или переписку, перевыпустите его в @BotFather и обновите секрет.

## Номер телефона
Один номер для звонка и WhatsApp задан в начале скрипта в `index.html` (`PHONE_DIGITS`, `PHONE_TEXT`) и в `object.html`.

## Панель управления объектами
Адрес: `https://city05.ru/admin.html` (ссылок на неё на сайте нет, поисковики её не индексируют). Через неё добавляют, меняют, скрывают, удаляют и переставляют объекты, загружают фото (они уменьшаются, на них ставится логотип CITY), готовят обложку, архив фото и текст поста для соцсетей. Панель правит `listings.json` и папку `assets` прямо в репозитории, сайт обновляется через 1–2 минуты.

Вход: ключ GitHub (fine-grained token) с правом Contents: Read and write только на репозиторий `city`. Ключ хранится в браузере и отправляется только в GitHub и в функцию публикации в Telegram.

## Публикация в Telegram-канал
Кнопка «Опубликовать в Telegram» в окне «Для соцсетей» отправляет в канал обложку и фото объекта с подписью через `functions/api/publish.js`. В Cloudflare Pages (проект `city` → Settings → Variables and secrets) нужны переменные `TG_BOT_TOKEN` (Secret, токен бота канала) и `TG_CHANNEL` (Text, например `@AGENTSTVOCITY`). Бот должен быть администратором канала с правом публикации. После изменения переменных нужен новый деплой. Публиковать может только владелец репозитория (проверяется ключ GitHub).

## Как добавить объект вручную
Откройте `listings.json`, скопируйте любую запись, вставьте в начало списка и поправьте поля. Укажите новый `id` (больше всех существующих).
- `category`: `kvartiry`, `doma`, `uchastki` или `kommerciya`; `deal`: `prodazha`, `arenda` или `posutochno`.
- `city` должен быть `Буйнакск`, иначе объект не показывается.
- `extra`: короткая подпись в карточке, например `"Этаж 1 из 4"`; `description`: описание; `floor` и `floors`: этаж и этажность.
- `image` и `images`: пути к фото (`assets/...`).
- `details`: подробные характеристики. `hidden: true` прячет объект, `verified: true` показывает отметку «Проверено CITY», `updated` (ГГГГ-ММ-ДД) показывается на странице и попадает в sitemap.

## Статистика по объектам

Страница объекта отправляет события в `/api/stat` (просмотр — раз в день с одного браузера; звонок, WhatsApp, заявка — раз за визит). Счётчики лежат в KV `PUSH` (ключи `st:<id>`), в админке видны в списке объектов. Не считаются: боты, браузер, где открывали админку (`localStorage.city_owner`), автоматизированные браузеры.

Скрытые объекты при скрытии автоматически уходят в конец списка.
