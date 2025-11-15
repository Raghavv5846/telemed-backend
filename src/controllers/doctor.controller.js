const PatientService = require('../services/patient.service');
const DoctorService = require('../services/doctors.service');

const doctorService = new DoctorService();


exports.get = async (req, res, next) => {
  try {
    const user = await doctorService.getDoctors(req.params.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
};


exports.setStatus = async (req, res, next) => {
  try {
    const user = await doctorService.changeStatus(req.body.doctorId, req.body.newAvailability);

    console.log("status doctor",user);
    
    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = parseInt(req.query.skip, 10) || 0;
    const users = await doctorService.listDoctors(limit, skip);
    res.json({status:true,message:"Doctors fetched successfully",...users});
  } catch (err) {
    next(err);
  }
};
