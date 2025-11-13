const express = require('express');
const validate =require('../../middlewares/validateRequest');
const { registerUser,loginUser, sendOtp } = require('../../validators/auth.validators');
const AuthController = require('../../controllers/auth.controller')
const router = express.Router();

router.post('/register', validate(registerUser), AuthController.create);
router.post('/login', validate(loginUser), AuthController.login);
router.post('/send_otp', validate(sendOtp), AuthController.send_otp);




module.exports = router;