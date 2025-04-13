import { z } from "zod";

import { isDevelopment, logger } from "@/shared";

import { getAndMaybeHandleFunctionalError } from "./getAndMaybeHandleFunctionalError";
import { getAndMaybeHandleServerError } from "./getAndMaybeHandleServerError";
import { mockedFetch } from "./mockedFetch";

import type { HttpResponse } from "./types";

export const makeRequest = async <Data extends object>(
  url: string,
  params?: Partial<{
    method: "GET" | "POST" | "DELETE";
    headers: Headers;
    body: BodyInit;
    schema: z.ZodTypeAny;
    contentType: "json" | "formatdata";
  }>,
): Promise<HttpResponse<Data>> => {
  const {
    method,
    headers = new Headers(),
    body,
    schema,
    contentType = "json",
  } = params ?? {
    method: "GET",
    body: null,
  };

  if (contentType === "json") {
    headers.append("Content-Type", "application/json");
  }

  const requestOptions: RequestInit = {
    method,
    headers,
  };

  if (body) {
    requestOptions.body = body;
  }

  try {
    logger.log("Url: ", url);
    logger.log("RequestOptions: ", requestOptions);

    let res: HttpResponse<Data>;

    if (isDevelopment()) {
      res = (await mockedFetch(url)) as HttpResponse<Data>;
    } else {
      res = (await fetch(url, requestOptions)) as HttpResponse<Data>;
    }

    res.functionalError = null;
    res.systemError = null;

    try {
      const data = await res.json();

      res.data = data;
    } catch (error) {
      if (![200, 204, 401].includes(res.status)) {
        logger.log(
          "Response parsing error. Ask your backend team to send correct JSON.",
          error,
        );

        throw error;
      }
    }

    logger.log(String(res.status));

    res.functionalError = getAndMaybeHandleFunctionalError();

    if (!res.ok) {
      res.systemError = getAndMaybeHandleServerError(res.status);
    }

    logger.log("Response:", res);

    try {
      schema?.parse(res.data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error(
          "invalid json schema: ",
          error,
          new Error("invalid json schema"),
        );

        throw error;
      }
    }

    return res;
  } catch (error) {
    if (!(error instanceof z.ZodError)) {
      logger.log("Network or parsing error: ", error);
    }

    throw error;
  }
};
