const router = require("express").Router();
const timesheetController = require("../controllers/timesheet.controller");
const authPolicy = require("../utils/auth.policy");

let api = "/timesheet";

router.post(`${api}/`, authPolicy, timesheetController.addTimesheet);
router.get(`${api}/`, authPolicy, timesheetController.viewTimesheet);
router.put(`${api}/`, authPolicy, timesheetController.updateTimesheet);
router.delete(`${api}/`, authPolicy, timesheetController.deleteTimesheet);

module.exports = router;
