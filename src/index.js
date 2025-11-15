const http = require('http');
const app = require('./app');
const config = require('./config');
const { createWSServer } = require('./sockets/index');
const logger = require('./utils/logger');
const server = http.createServer(app);
const wss = createWSServer(server);

(async function startServer() {
  try {
    const port = Number(config.port);
    server.listen(port, () => logger.info(`Server listening on ${port}`));
  } catch (err) {
    logger.error('Failed to start', err);
    process.exit(1);
  }
})();