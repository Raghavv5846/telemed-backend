const Joi = require('joi');

const sendOtp = Joi.object({
  mobile: Joi.string().length(10).required(),
  role: Joi.string().valid('PATIENT','DOCTOR').required()
});

const loginUser = Joi.object({
    mobile: Joi.string().length(10).required(),
    role: Joi.string().valid('PATIENT','DOCTOR').required(),
    otp: Joi.string().length(6).required(),
  });

const registerUser = Joi.object({
    name: Joi.string().min(1).max(100).required(),
    mobile: Joi.string().length(10).required(),
    role: Joi.string().valid('PATIENT','DOCTOR').required(),
    otp: Joi.string().length(6).required(),
  });


module.exports = {
    sendOtp, registerUser, loginUser
};