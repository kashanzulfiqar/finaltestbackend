const router = require("express").Router();
const attendanceController = require("../controllers/attendance.controller");
const authPolicy = require("../utils/auth.policy");
// const Validator = require("../middleware/validator");

let api = "/attendance";

router.post(
  `${api}`,
  authPolicy,
  // Validator.addAttendance,
  attendanceController.addAttendance
);
router.get(`${api}`, authPolicy, attendanceController.myAttendance);
router.get(
  `${api}/employeesattendance`,
  authPolicy,
  attendanceController.employeesAttendance
);

router.get(
  `${api}/mobileattendance`,
  authPolicy,
  attendanceController.MobileAttendance
);
router.get(
  `${api}/graphattendance`,
  authPolicy,
  attendanceController.graphAttendance
);
router.put(`${api}`, authPolicy, attendanceController.updateAttendance);
router.put(
  `${api}/update-attendance`,
  authPolicy,
  attendanceController.updateEmployeeAttendance
);
router.delete(`${api}`, authPolicy, attendanceController.deleteAttendance);

module.exports = router;
