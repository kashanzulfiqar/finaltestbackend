const router = require("express").Router();
const report = require("../controllers/report.controller");
const employeeReport = require("../controllers/employeeReport.controller");

const authPolicy = require("../utils/auth.policy");

let api = "/report";

router.get(`${api}/attendance`, authPolicy, report.employeesAttendance);
router.get(`${api}/employee`, authPolicy, report.viewReport);

module.exports = router;
