# Seruleb — сайт

Лендинг Seruleb: заработок на нейросетях, розыгрыши, продвижение бизнеса и услуги.
Тёмная тема + liquid-glass, шрифты Oswald / Montserrat Alternates.

## Структура

- index.dc.html — Главная: розыгрыши, услуги, лучшее (Best), меню, поп-апы
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

### Боевой сайт — seruleb.com (хостинг Beget)

Node на хостинге нет, поэтому сборка идёт локально, а наверх уезжает
готовый dist/. Публикация одной командой:

    ./deploy.sh

Скрипт собирает проект, заливает по rsync в ~/seruleb.com/public_html/,
выставляет права и проверяет ответы страниц. Нужен SSH-доступ по ключу
(ключ добавлен в ~/.ssh/authorized_keys на сервере).

Чистые URL, заголовки безопасности и кэширование на Beget задаёт .htaccess
(Apache). Файл _headers там не читается — это формат Cloudflare.

### Запасная площадка — Cloudflare Workers

seruleb.petrandreevich4.workers.dev пересобирается сам при git push в main
(Build command: node build.js, конфиг в wrangler.jsonc). Держится как
резервная копия; на боевой домен не влияет.

### Локальная проверка

    node build.js && python3 -m http.server 8000 --directory dist

Чистые URL локальный python-сервер не умеет — открывайте /obuchenie.html.

## Работа через Claude Code

Открой проект, попроси изменения — правки вносятся в *.dc.html.
Затем ./deploy.sh (боевой сайт) и git commit + git push (репозиторий).

## Изображения

Все картинки страниц лежат локально в assets/img/ и assets/video/ — внешних
ссылок на WordPress (seruleb.com/wp-content/...) больше нет. Сайт полностью
автономен и не зависит от старого WordPress.
