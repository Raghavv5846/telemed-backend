const http = require('http');
const app = require('./app');
const config = require('./config');
const { createWSServer } = require('./loaders/websocket');
// const connectDB = require('./loaders/database');
const logger = require('./utils/logger');
const server = http.createServer(app);
const wss = createWSServer(server,null);

server.on('listening', () => {
  logger.info('HTTP server listening', { port: config.port });
});
server.on('error', (err) => {
  logger.error('server error', err);
});

(async function bootstrap() {
  try {
    // await connectDB();
    const port = Number(config.port);
    server.listen(port, () => logger.info(`Server listening on ${port}`));
  } catch (err) {
    logger.error('Failed to start', err);
    process.exit(1);
  }
})();