import { AIDungeonAPIError } from "./AIDungeonAPIError.ts";
import { Context } from "@oak/oak";

interface Formatters<T> {
  // deno-lint-ignore no-explicit-any
  matches: (arg: any) => arg is T;
  format: (arg: T) => string;
}

class FormatterRegistry {
  // deno-lint-ignore no-explicit-any
  private formatters: Formatters<any>[] = [];
  add<T>(entry: Formatters<T>) {
    this.formatters.push(entry);
    return this;
  }
  format = <T>(arg: T) => {
    for (const formatter of this.formatters) {
      if (formatter.matches(arg)) {
        return (formatter as Formatters<T>).format(arg);
      }
    }
    return typeof arg === "string" ? arg as string : JSON.stringify(arg);
  };
}

export const formatters = new FormatterRegistry()
  .add({
    matches: AIDungeonAPIError.isInstance,
    format: (error) => {
      let message = error.message;
      const gqlErrors = error.response?.errors;
      if (gqlErrors?.length) {
        gqlErrors.forEach((e) =>
          message += `\n\tfrom GraphQL: ${e.message} ${JSON.stringify(e.extensions)}`
        );
      }
      if (error.cause) {
        message += `\n\tcaused by:${error.cause.name}: ${error.cause.message}`;
      }
      return message;
    },
  })
  .add({
    matches: (arg) => arg instanceof Context,
    format: (ctx) => {
      return `${ctx.response.status} ${ctx.request.method} ${ctx.request.url.pathname}${ctx.request.url.search} ${ctx.request.userAgent.ua}`;
    },
  });
