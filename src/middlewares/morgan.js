const morgan= require('morgan');
const logger = require('../utils/logger');


morgan.token('body', (req) => {
  const body = {...req.body};
  if (body.password) body.password = '******';
  if (body.otp) body.otp = '******';
  return JSON.stringify(body);
});

const stream = {
  write: (message) => logger.http(message.trim()),
};

const morganMiddleware = morgan(
  ':method :url :status :res[content-length] - :response-time ms :body',
  { stream }
);

module.exports = morganMiddleware; 