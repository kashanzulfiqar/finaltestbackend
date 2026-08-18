const router = require("express").Router();
const leavePolicyController = require("../controllers/leavePolicy.controller");
const authPolicy = require("../utils/auth.policy");
const Validator = require("../middleware/validator");

let api = "/leave-policy";

router.post(
  `${api}`,
  authPolicy,
  Validator.addLeavePolicy,
  leavePolicyController.addLeavesPolicy
);
router.get(`${api}`, authPolicy, leavePolicyController.viewLeavesPolicy);
router.put(
  `${api}`,
  authPolicy,
  Validator.updateLeavePolicy,
  leavePolicyController.updateLeavesPolicy
);
router.delete(`${api}`, authPolicy, leavePolicyController.deleteLeavesPolicy);
module.exports = router;
