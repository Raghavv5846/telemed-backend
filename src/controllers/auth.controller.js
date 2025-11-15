const PatientService = require('../services/patient.service');
const DoctorService = require('../services/doctors.service');
const jwt = require('jsonwebtoken');
const config = require('../config');
const userService = new PatientService();
const doctorService = new DoctorService();


exports.create = async (req, res, next) => {
  try {
    let user;
    if(req.body.role === 'PATIENT'){
        user = await userService.createPatient(req.body);

        
        const token = jwt.sign(
            {
              id: user.id,
              role:"PATIENT",
              name: user.name
            },
            config.jwtSecret,
            { expiresIn: '1y' },
          );
          
        res.status(201).json({status: true, message:"logged in successfully",data: {token ,...user}});

    }else{
        user = await doctorService.createDoctor(req.body);
        const token = jwt.sign(
            {
              id: user.id,
              role:"DOCTOR",
              name: user.name
            },
            config.jwtSecret,
            { expiresIn: '1y' },
          );
        res.status(201).json({status: true, message:"Doctor registered successfully",data: {token ,...user}});
    }
  } catch (err) {
    next(err);
  }
};

exports.send_otp = async (req,res,next) => {
    try {
        let user;
        if(req.body.role === 'PATIENT'){
            user = await userService.getPatientsFromMobile(req.body.mobile, true);
            if(!user){
              return res.status(200).json({
                  status: true,
                  user_registered: false,
                  message:"Otp Successfully Send to your registered mobile number."
              })
            }
  
            
            res.status(201).json({ status: true,
                user_registered: true,
                message:"Otp Successfully Send to your registered mobile number"});
    
        }else{
            user = await doctorService.getDoctorsFromMobile(req.body.mobile, true);
            if(!user){
              return res.status(200).json({
                  status: true,
                  user_registered: false,
                  message:"Otp Successfully Send to your registered mobile number."
              })
            }
  
            
            res.status(201).json({ status: true,
                user_registered: true,
                message:"Otp Successfully Send to your registered mobile number"});
            res.status(201).json({status: true, message:"Doctor registered successfully",data: user});
        }
      } catch (err) {
        next(err);
      }
}
exports.login = async (req, res, next) => {
    try {
      let user;
      if(req.body.role === 'PATIENT'){
          user = await userService.getPatientsFromMobile(req.body.mobile, true);
          if(!user){
            return res.status(200).json({
                status: false,
                user_registered: false,
                message:"No user found with this mobile number"
            })
          }

          if(req.body.otp!='123456' ){
            return res.status(400).json({
                status: true,
                user_registered: true,
                message:"Otp does not match"
            })
          }


          const token = jwt.sign(
            {
              id: user.id,
              role:"PATIENT",
              name: user.name
            },
            config.jwtSecret,
            { expiresIn: '1y' },
          );
          res.status(201).json({status: true, message:"Patient logged in successfully",data: {token,...user}});
  
      }else{
        user = await doctorService.getDoctorsFromMobile(req.body.mobile, true);
        if(!user){
            return res.status(200).json({
                status: false,
                user_registered: false,
                message:"No doctor found with this mobile number"
            })
          }

          if(req.body.otp!='123456' ){
            return res.status(400).json({
                status: true,
                user_registered: true,
                message:"Otp does not match"
            })
          }


          const token = jwt.sign(
            {
              id: user.id,
              role:"DOCTOR",
              name: user.name

            },
            config.jwtSecret,
            { expiresIn: '1y' },
          );
          res.status(201).json({status: true, message:"doctor logged in successfully",data: {token,...user}});
      }
    } catch (err) {
      next(err);
    }
  };

