const { MapRepo } =require('../utils/maps');
const Doctor= new MapRepo();

class DoctorRepository {
  async create(data) {
    return Doctor.create(data);
  }

  async findById(id) {
    return Doctor.findById(id);
  }

  async findByMobile(mobile,role) {
    return Doctor.findOne("mobile",mobile,role);
  }

  async list(limit = 20, skip = 0) {
    return Doctor.list({ role: "DOCTOR"});
  }

  async setStatus(id, status){
    return Doctor.setStatus(id,status);
  }
}

module.exports = { DoctorRepository , Doctor};