const express = require('express');
const validate =require('../../middlewares/validateRequest');
const AuthController = require('../../controllers/auth.controller');
const DocController = require('../../controllers/doctor.controller');
const router = express.Router();

router.get('/', DocController.list);


module.exports = router;