import { createApp } from './app.js';
import { configuredProviders, loadConfig } from './config.js';
import { openDatabase } from './db.js';

let config;
try {
  config = loadConfig();
} catch (error) {
  console.error(`[auth] configuration error\n${error.message}`);
  process.exit(1);
}

const store = openDatabase(config.databasePath);
store.pruneExpiredRefreshTokens();

const pruneTimer = setInterval(() => {
  try {
    store.pruneExpiredRefreshTokens();
  } catch (error) {
    console.error('[auth] token prune failed', error.message);
  }
}, 60 * 60 * 1000);
pruneTimer.unref();

const app = createApp({ config, store });
const server = app.listen(config.port, config.host, () => {
  const enabled = Object.entries(configuredProviders(config))
    .filter(([, ready]) => ready)
    .map(([name]) => name);

  console.log(`[auth] listening on http://${config.host}:${config.port}`);
  console.log(`[auth] issuer  ${config.issuer} (audience ${config.audience})`);
  console.log(`[auth] providers enabled: ${enabled.length > 0 ? enabled.join(', ') : 'none'}`);
  console.log(`[auth] database ${config.databasePath}`);
});

function shutdown(signal) {
  console.log(`[auth] ${signal} received, closing`);
  clearInterval(pruneTimer);
  server.close(() => {
    store.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
