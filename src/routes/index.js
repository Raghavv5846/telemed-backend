const express = require('express');
// import playerRoutes from './playerRoutes';
const authRoutes = require('./authRoutes/index')
const docRoutes = require('./doctorRoutes/index')
const patientRoutes = require('./patientRoutes/index')


const router = express.Router();

router.use('/api', authRoutes);
router.use('/api/doctors', docRoutes);
router.use('/api/patients', patientRoutes);



module.exports = router;