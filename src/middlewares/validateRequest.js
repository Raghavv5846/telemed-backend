const ApiError = require('../errors/ApiError');

function validate(schema) {
  return (req, res, next) => {
    const payload = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (payload.error) {
      const message = payload.error.details.map(d => d.message).join(', ');
      return next(new ApiError(message, 400));
    }
    req.body = payload.value;
    next();
  };
}

module.exports = validate;