const router = require("express").Router();
const shiftController = require("../controllers/shift.controller");
const Validator = require("../middleware/validator.js");
const authPolicy = require("../utils/auth.policy.js");

let api = "/shift";

router.post(`${api}`, authPolicy, Validator.addShift, shiftController.addShift);
router.get(`${api}`, authPolicy, shiftController.viewShift);
router.put(
  `${api}`,
  authPolicy,
  Validator.updateShift,
  shiftController.updateShift
);
router.delete(`${api}`, authPolicy, shiftController.deleteShift);

module.exports = router;
