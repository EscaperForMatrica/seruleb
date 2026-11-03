#!/usr/bin/env bash
# Публикация сайта на хостинг Lite Host (seruleb.com, cPanel, addon-домен).
#
#   ./deploy.sh
#
# Собирает dist/ и заливает его на сервер. Node на хостинге нет,
# поэтому сборка идёт локально, а наверх уезжает уже готовый результат.
# Флаг --delete убирает на сервере файлы, которых больше нет в сборке.

set -euo pipefail

HOST="mars.lite-host.in"   # пользователь и ключ — в ~/.ssh/config
REMOTE="~/seruleb.com/"
IP="46.8.141.128"

echo "==> Сборка"
node build.js

echo "==> Загрузка на $HOST"
# cgi-bin — служебный каталог хостинга, его не трогаем.
# --checksum: сборка каждый раз пересоздаёт dist/ с новыми датами файлов,
# поэтому сравниваем по содержимому — уходят только реально изменённые файлы.
# Если хостинг теряет временный файл rsync (код 23/24) — повторяем до 3 раз.
for attempt in 1 2 3; do
  set +e
  rsync -az --checksum --delete --exclude 'cgi-bin' --stats \
    -e 'ssh -o BatchMode=yes' \
    dist/ "$HOST:$REMOTE" | grep -E 'Number of regular files transferred|Number of files transferred|Total transferred file size'
  code=${PIPESTATUS[0]}
  set -e
  [ "$code" -eq 0 ] && break
  if [ "$code" -ne 23 ] && [ "$code" -ne 24 ] || [ "$attempt" -eq 3 ]; then
    echo "rsync завершился с кодом $code" >&2
    exit "$code"
  fi
  echo "  сбой загрузки (код $code), повтор $((attempt + 1))/3"
done

echo "==> Права доступа"
ssh -o BatchMode=yes "$HOST" \
  "find $REMOTE -type d -exec chmod 755 {} \; ; find $REMOTE -type f -exec chmod 644 {} \;"

echo "==> Проверка"
for p in / /obuchenie /video /madina/; do
  # --resolve: проверяем именно этот сервер, даже пока DNS ещё смотрит в другое место.
  printf '  %-12s %s\n' "$p" "$(curl -sk -o /dev/null -w '%{http_code}' --max-time 25 --resolve "seruleb.com:443:$IP" "https://seruleb.com$p")"
done

echo "==> Готово: https://seruleb.com"
