// Server-side error tracking (Sentry). A no-op until SENTRY_DSN is set —
// safe for the zero-config demo, active the moment the env var exists.
// Client-side capture is deliberately deferred (see runbooks/deploy.md).
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (!process.env.SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}

// Reports errors from nested React Server Components / route handlers.
export const onRequestError = Sentry.captureRequestError;
