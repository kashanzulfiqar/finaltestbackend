const router = require("express").Router();
const employeeReport = require("../controllers/employeeReport.controller");
const authPolicy = require("../utils/auth.policy");

let api = "/report";

router.get(`${api}/employee`, authPolicy, employeeReport.viewReport);
router.get(`${api}/team`, authPolicy, employeeReport.viewReportTeamWise);

module.exports = router;
