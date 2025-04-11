export type ErrorKey =
  | "INTERNAL"
  | "PREDICTABLE"
  | "UNAUTHORIZED"
  | "UNPREDICTABLE"
  | "FORBIDDEN";

export interface ServerError {
  key: ErrorKey;
  userMessage: string;
}

export type FunctionalError = null;

export interface HttpResponse<Data> extends Response {
  data: Data;
  systemError: ServerError | null;
  functionalError: FunctionalError | null;
}
