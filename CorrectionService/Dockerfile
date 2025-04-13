# Используем официальный образ Go
FROM golang:1.24 AS base

# Создаем рабочую директорию
WORKDIR /app

# Копируем исходный код
COPY . .

ARG NORMAL_IMAGES_DIR
ARG CORRECTED_IMAGES_DIR

ENV NORMAL_IMAGES_DIR=${NORMAL_IMAGES_DIR}
ENV CORRECTED_IMAGES_DIR=${CORRECTED_IMAGES_DIR}

RUN go mod download

# Собираем приложение
RUN go build -o main .

# Открываем порт, который будет слушать сервис
EXPOSE 8080

# Запускаем приложение
CMD ["./main"]