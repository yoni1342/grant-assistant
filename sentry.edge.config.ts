import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: 1.0, // Lower this in production (e.g. 0.1 for 10%)

  // Set to false to disable in development
  enabled: process.env.NODE_ENV === "production",
});
