FROM node:23-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY . .

RUN pnpm i && pnpm run build
RUN cd server && npm i

ARG VITE_PORT

ENV VITE_PORT=${VITE_PORT}

EXPOSE ${VITE_PORT}

CMD ["node", "./server/server.js"]