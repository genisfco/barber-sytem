import * as Sentry from "@sentry/react";

export function logError(error: any, context?: any) {
  if (process.env.NODE_ENV === "production") {
    Sentry.captureException(error, { extra: context });
  }
  // Sempre mostra no console para facilitar debug
  if (context) {
    console.error(context, error);
  } else {
    console.error(error);
  }
} 