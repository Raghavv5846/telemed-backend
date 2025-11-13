const express = require('express');
const routes = require('../routes');
const errorHandler = require('../middlewares/errorHandler');
const cors = require('cors');
const morganMiddleware = require('../middlewares/morgan');

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(morganMiddleware)
  app.use('/', routes);
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use(errorHandler);
  return app;
}

module.exports = createApp;