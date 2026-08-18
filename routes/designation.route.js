const router = require("express").Router();
const designationController = require("../controllers/designation.controller");
const authPolicy = require("../utils/auth.policy");
const Validator = require("../middleware/validator");

let api = "/designation";

router.post(
  `${api}`,
  authPolicy,
  Validator.addDesignation,
  designationController.addDesignation
);
router.get(`${api}`, authPolicy, designationController.viewDesignation);
router.put(
  `${api}`,
  authPolicy,
  Validator.updateDesignation,
  designationController.updateDesignaton
);
router.delete(`${api}`, authPolicy, designationController.deleteDesignation);

module.exports = router;
