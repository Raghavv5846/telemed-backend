const express = require('express');
const AuthController = require('../../controllers/auth.controller');
const PatientController = require('../../controllers/patient.controller');
const AuthMiddleware = require('../../middlewares/auth');

const router = express.Router();

router.get('/', AuthMiddleware , PatientController.list);


module.exports = router;