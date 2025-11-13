const ApiError = require('../errors/ApiError');
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error(err);
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ status: false, message: err.message, data: [] });
  }
  res.status(500).json({ message: 'Internal Server Error' });
}

module.exports = errorHandler;