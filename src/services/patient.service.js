const { PatientRepository } = require('../repositories/user.repository');
const ApiError = require('../errors/ApiError');
const { Patient }= require('../models/models');
class PatientService {
  constructor(patientRepo = new PatientRepository()) {
    this.patientRepo = patientRepo;
  }

  async createPatient(payload) {
    const existing = await this.patientRepo.findByMobile(payload.mobile,payload.role);
    
    if (existing) throw new ApiError('Mobile already used', 409);

    if(payload.otp!='123456' ){
      throw new ApiError('Otp does not match', 400);
    }

    let patient = new Patient(payload);
    return this.patientRepo.create(patient);
  }
  async getPatientsFromMobile(mobile, isLogin = false){
    const user = await this.patientRepo.findByMobile(mobile,"PATIENT");
    
    if(!user && isLogin) return;
    if (!user) throw new ApiError('User not found', 404);
    return user;
  }

  async getPatients(id) {
    const user = await this.patientRepo.findById(id);
    if (!user) throw new ApiError('User not found', 404);
    return user;
  }

  async listPatients(limit, skip) {
    return this.patientRepo.list(limit, skip);
  }
}

module.exports = PatientService;
