# Seruleb — сайт

Лендинг Seruleb: заработок на нейросетях, розыгрыши, продвижение бизнеса и услуги.
Тёмная тема + liquid-glass, шрифты Oswald / Montserrat Alternates.

## Структура

- index.dc.html — Главная: розыгрыши, услуги, меню, поп-апы
- obuchenie.dc.html — Страница «Обучение заработку на нейросетях»
- video.dc.html — Страница «Специалисты Seruleb» (видео)
- support.js — Рантайм рендеринга страниц (не редактировать)
- assets/logo.png — Логотип / favicon
- assets/video/ — Видео специалистов + постеры
- build.js — Сборка dist/ с чистыми URL
- _headers — Заголовки безопасности и кэширования
- robots.txt, sitemap.xml
- wrangler.jsonc — Конфиг хостинга Cloudflare
- madina/ — Отдельный статический сайт на /madina/, к Seruleb отношения не имеет

Страницы — самодостаточные HTML-файлы: каждая подключает support.js и содержит
свою разметку и логику. Между собой связаны обычными ссылками.

## Как редактировать

Открой нужный *.dc.html и правь разметку (шаблон между <x-dc>) или логику
(класс Component в <script data-dc-script>). Тексты, цены, списки услуг/розыгрышей
лежат в методе renderVals() — это самое частое место для правок.

## Как добавить страницу

1. Скопируй, напр., video.dc.html в new-page.dc.html.
2. Поменяй <title>/мета, контент и логику.
3. Добавь ссылку в меню в index.dc.html и URL в sitemap.xml.
Файл автоматически попадёт в сборку как /new-page.

## Сборка и публикация

node build.js — соберёт dist/ с чистыми URL (/, /obuchenie, /video).

Хостинг — Cloudflare Workers, подключённый к этому GitHub-репозиторию
(проект заводился под Pages, но фактически подключены Workers Builds):
- Build command: node build.js
- Deploy command: npx wrangler deploy
- Каталог раздачи задан в wrangler.jsonc: dist
- Каждый git push в main -> автоматический деплой.

Локальная проверка: node build.js && python3 -m http.server 8000 --directory dist

Чистые URL (/obuchenie вместо /obuchenie.html) обеспечивает сам Cloudflare —
локальный python-сервер так не умеет, там открывайте /obuchenie.html.

## Работа через Claude Code

Открой проект, попроси изменения — правки вносятся в *.dc.html, затем
git commit + git push, и Cloudflare публикует обновление сам.

## TODO: изображения страницы «Обучение»

Часть картинок на obuchenie.dc.html пока грузится по абсолютным ссылкам
https://seruleb.com/wp-content/uploads/... (наследие WordPress). Перед отключением
WordPress положи их в assets/img/ и замени ссылки, иначе после переключения
домена они пропадут.
