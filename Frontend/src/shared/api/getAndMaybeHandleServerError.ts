import type { ServerError } from "./types";

export const getAndMaybeHandleServerError = (status: number): ServerError => {
  if (status === 500) {
    return {
      key: "INTERNAL",
      userMessage: "Непредвиденная ошибка для сервера.",
    };
  }

  if (status === 403) {
    return {
      key: "FORBIDDEN",
      userMessage: "Доступ запрещен.",
    };
  }

  if (status === 401) {
    return {
      key: "UNAUTHORIZED",
      userMessage: "Не авторизован.",
    };
  }

  if (status === 400) {
    return {
      key: "PREDICTABLE",
      userMessage: "Неккоректный запрос к серверу.",
    };
  }

  return {
    key: "UNPREDICTABLE",
    userMessage: "Непредвиденный код ошибки сервера.",
  };
};
