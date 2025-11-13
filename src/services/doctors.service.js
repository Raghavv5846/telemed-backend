const { DoctorRepository } = require('../repositories/doctor.repository');
const ApiError = require('../errors/ApiError');
const { Doctor }= require('../models/models');
class DoctorService {
  constructor(doctorRepo = new DoctorRepository()) {
    this.doctorRepo = doctorRepo;
  }

  async createDoctor(payload) {
    const existing = await this.doctorRepo.findByMobile(payload.mobile,payload.role);
    
    if (existing) throw new ApiError('Mobile already used', 409);

    let doctor = new Doctor(payload);
    return this.doctorRepo.create(doctor);
  }

  async getDoctorsFromMobile(mobile, isLogin = false){
    const user = await this.doctorRepo.findByMobile(mobile,"DOCTOR");
    
    if(!user && isLogin) return;
    if (!user) throw new ApiError('User not found', 404);
    return user;
  }

  async getDoctors(id) {
    const user = await this.doctorRepo.findById(id);
    if (!user) throw new ApiError('Doctor not found', 404);
    return user;
  }

  async listDoctors(limit, skip) {
    return this.doctorRepo.list(limit, skip);
  }
}

module.exports = DoctorService;
