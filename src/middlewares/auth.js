// src/middlewares/auth-check-user.js
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');
const { PatientRepository } = require('../repositories/user.repository');
const { DoctorRepository } = require('../repositories/doctor.repository');
const ApiError = require('../errors/ApiError');
const patientRepo = new PatientRepository();
const docRepo = new DoctorRepository();

async function AuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) throw new ApiError('Token missing',401);

    const payload = jwt.verify(token, config.jwtSecret);
    let user;
    if(payload.role === 'PATIENT'){    
         user =  patientRepo.findById(payload.id);
        if (!user) throw new ApiError('User not found or deleted',402);
    }else{
         user =  docRepo.findById(payload.id).lean();
         if (!user) throw new ApiError('User not found or deleted',402);

    }

    req.user = user;
    next();
  } catch (err) {
    console.log(err);
    
    logger.error('auth failed', err.message);
    throw new ApiError('Invalid or expired token',400);
  }
}

module.exports = AuthMiddleware;