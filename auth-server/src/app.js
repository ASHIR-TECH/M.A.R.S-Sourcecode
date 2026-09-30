import cors from 'cors';
import express from 'express';
import { configuredProviders } from './config.js';
import { createRateLimiter, errorHandler, notFound, securityHeaders } from './middleware.js';
import { createAuthRouter } from './routes.js';

export function createApp({ config, store }) {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxyHops);

  app.use(securityHeaders);

  // A native app sends no Origin header, so CORS is only here for the web
  // dashboard and any tooling. An empty list means "no browser origins".
  app.use(
    cors({
      origin: config.corsAllowedOrigins.length > 0 ? config.corsAllowedOrigins : false,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    })
  );

  app.use(express.json({ limit: '16kb', strict: true }));

  app.get(
    '/health',
    createRateLimiter({ windowMs: 60_000, max: 120, code: 'rate_limited' }),
    (_req, res) => {
      res.status(200).json({
        status: 'ok',
        issuer: config.issuer,
        providers: configuredProviders(config),
        redirectUriCount: config.allowedRedirectUris.length,
      });
    }
  );

  app.use(createAuthRouter({ config, store }));

  app.use(notFound);
  app.use(errorHandler());

  return app;
}
