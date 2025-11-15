const express = require('express');
const validate =require('../../middlewares/validateRequest');
const AuthController = require('../../controllers/auth.controller');
const DocController = require('../../controllers/doctor.controller');
const { DocMiddleWare } = require('../../middlewares/auth');
const router = express.Router();

router.get('/', DocController.list);
router.post('/status', DocMiddleWare, DocController.setStatus);



module.exports = router;