import * as Sentry from "@sentry/react";

export function logError(error: any, context?: any) {
  if (process.env.NODE_ENV === "production") {
    Sentry.captureException(error, { extra: context });
  }
} 