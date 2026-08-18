const router = require("express").Router();
const holidaysController = require("../controllers/holidays.controller");
const authPolicy = require("../utils/auth.policy");

let api = "/holidays";

router.post(`${api}`, authPolicy, holidaysController.addHoliday);
router.get(`${api}`, authPolicy, holidaysController.viewHolidays);
router.put(`${api}`, authPolicy, holidaysController.updateHoliday);
router.delete(`${api}`, authPolicy, holidaysController.deleteHoliday);

module.exports = router;
