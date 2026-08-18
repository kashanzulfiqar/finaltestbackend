const router = require("express").Router();
const roleController = require("../controllers/role.controller");
const Validator = require("../middleware/validator");
const authPolicy = require("../utils/auth.policy");

let api = "/role";

router.post(
  `${api}/add-role`,
  authPolicy,
  Validator.addRole,
  roleController.addRole
);
router.get(`${api}/view-role`, authPolicy, roleController.viewRole);
router.put(
  `${api}/update-role`,
  authPolicy,
  Validator.updateRole,
  roleController.updateRole
);
router.delete(`${api}/delete-role`, authPolicy, roleController.deleteRole);

module.exports = router;
