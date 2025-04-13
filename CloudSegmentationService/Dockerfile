FROM python:3.12 AS base

WORKDIR /app

COPY ./src /app/src
COPY ./poetry.lock ./pyproject.toml ./

RUN pip install poetry

RUN poetry install --no-root

# Создаем папки и назначаем правильные права
RUN mkdir -p /app/normal-images && mkdir -p /app/corrected-images && mkdir -p /app/processed-images

ARG SEGMENTATION_SERVICE_PORT

ENV SEGMENTATION_SERVICE_PORT=${SEGMENTATION_SERVICE_PORT}

EXPOSE ${SEGMENTATION_SERVICE_PORT}

CMD ["poetry", "run", "gunicorn", "-k", "uvicorn.workers.UvicornWorker", "-w", "4", "-b", "0.0.0.0:8000", "src.api.service:app"]