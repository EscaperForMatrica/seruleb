#!/usr/bin/env bash
# Публикация сайта на хостинг Beget (seruleb.com).
#
#   ./deploy.sh
#
# Собирает dist/ и заливает его на сервер. Node на хостинге нет,
# поэтому сборка идёт локально, а наверх уезжает уже готовый результат.
# Флаг --delete убирает на сервере файлы, которых больше нет в сборке.

set -euo pipefail

HOST="petranv6@petranv6.beget.tech"
REMOTE="~/seruleb.com/public_html/"

echo "==> Сборка"
node build.js

echo "==> Загрузка на $HOST"
# cgi-bin — служебный каталог хостинга, его не трогаем
rsync -az --delete --exclude 'cgi-bin' --stats \
  -e 'ssh -o BatchMode=yes' \
  dist/ "$HOST:$REMOTE" | grep -E 'Number of files transferred|Total transferred file size'

echo "==> Права доступа"
ssh -o BatchMode=yes "$HOST" \
  "find $REMOTE -type d -exec chmod 755 {} \; ; find $REMOTE -type f -exec chmod 644 {} \;"

echo "==> Проверка"
for p in / /obuchenie /video /madina/; do
  printf '  %-12s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 "https://seruleb.com$p")"
done

echo "==> Готово: https://seruleb.com"
