FROM node:23-slim AS base

WORKDIR /app

COPY ./server /app/server
COPY ./dist /app/dist

RUN cd server && npm i

ARG VITE_PORT=5173

ENV VITE_PORT=${VITE_PORT}

EXPOSE ${VITE_PORT}

CMD ["node", "server/server.js"]