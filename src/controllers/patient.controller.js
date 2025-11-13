const PatientService = require('../services/patient.service');
const DoctorService = require('../services/doctors.service');

const userService = new PatientService();
const doctorService = new DoctorService();


exports.create = async (req, res, next) => {
  try {
    const user = await userService.createPatient(req.body);
    res.status(201).json({status: true, message:"Patient registered successfully",data: user});
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const user = await userService.getPatients(req.params.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = parseInt(req.query.skip, 10) || 0;
    const users = await userService.listPatients(limit, skip);
    res.json(users);
  } catch (err) {
    next(err);
  }
};