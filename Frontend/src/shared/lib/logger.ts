import { isProduction } from "./isProduction";

import { isServer } from "./isServer";

class Logger {
  /**
   * NOTE(dralexey7): Метод используется для отображения в консоли какой-либо вспомогательной информации,
   * помогающей определить контекст происходящего при отладке ошибок. Вызов метода не свидетельствует о наличии
   * каких-либо ошибок в приложении, вызывается в штатных ситуациях. При штатной работе приложения в консоли
   * могут быть только логи этого типа.
   * Например: лог об успешном выполнении какого-либо запроса к бэку
   */
  public log(message: string, data?: unknown): void {
    if (isServer() || !isProduction()) {
      console.log(message, data);
    }
  }

  /**
   * NOTE(dralexey7): Метод используется для отражения каких-либо внештатных ситуаций, не влияющих критически
   * на функционал приложения. Например, может использоваться в обработке нештатных promise rejection (где мы
   * ожидаем что промис будет всегда успешно выполняться).
   */
  public warn(message: string, data: unknown): void {
    if (isServer() || !isProduction()) {
      console.warn(message, data);
    }
  }

  /**
   * NOTE(dralexey7): Метод используется для отражения каких-либо внештатных ситуаций, критически ломающих работу
   * всего приложения и приводящих к невозможности с ним работать. Например: непредвиденное отсутствие каких-то данных,
   * необходимых для отправки ключевого запроса к бэку.
   */
  public error(message: string, data: unknown, error: Error): void {
    if (isServer() || !isProduction()) {
      console.error(message, data, error);
    }
  }
}

export const logger = new Logger();
