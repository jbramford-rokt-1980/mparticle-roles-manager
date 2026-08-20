import { buildApp } from './app';
import { config } from './config';

const app = buildApp();

app.listen({ host: config.host, port: config.port }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
