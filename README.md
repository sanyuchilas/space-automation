Всего 3 сервиса: Frontend, CloudSegmentation, Correction.

Изображения хранятся напрямую в файловой системе.

У бекенда всего 5 ручек.

CloudSegmentation:
POST /segment-clouds
POST /load_image
GET /server_images

Correction:
POST /correct
GET /last-image

Каждый сервис поднимается из его папки командой `docker compose --env-file=./../.env up -d --build`

Примеры переменных есть в .env.example. В некоторых местах кода переменные захардкожены, поэтому во время деплоя их понадобится напрямую изменить или заменить на переменные среды.
