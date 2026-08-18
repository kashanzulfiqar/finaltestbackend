const router = require("express").Router();
const permissionTemplate = require("../controllers/permissionTemplate.controller");
const authPolicy = require("../utils/auth.policy");

let api = "/permissions-template";

router.post(`${api}`, authPolicy, permissionTemplate.addPermissionsTemplate);

router.get(`${api}`, authPolicy, permissionTemplate.viewPermissionTemplate);

router.put(`${api}`, authPolicy, permissionTemplate.updatePermissionTemplate);

router.delete(
  `${api}`,
  authPolicy,
  permissionTemplate.deletePermissionTemplate
);
module.exports = router;
