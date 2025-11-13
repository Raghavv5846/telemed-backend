const { MapRepo } =require('../utils/maps');
const Patient= new MapRepo();

class PatientRepository {
  async create(data) {
    return Patient.create(data);
  }

  async findById(id) {
    return Patient.findById(id);
  }

  async findByMobile(mobile,role) {
    return Patient.findOne("mobile",mobile,role);
  }

  async list(limit = 20, skip = 0) {
    return Patient.list({ role: "PATIENT"});
  }
}

module.exports = { PatientRepository , Patient};