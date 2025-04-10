FROM node:23-slim AS base

WORKDIR /app

COPY ./server /app/server
COPY ./dist /app/dist

RUN cd server && npm i

EXPOSE 5173

CMD node server/server.js