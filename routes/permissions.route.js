const router = require("express").Router();
const permissionController = require("../controllers/permissions.controller.js");
const authPolicy = require("../utils/auth.policy.js");
const adminPolicy = require("../utils/adminPolicy");

let api = "/permissions";

router.post(`${api}`, authPolicy, permissionController.addPermissions);
router.get(`${api}`, adminPolicy, permissionController.viewPermissions);
router.put(`${api}`, authPolicy, permissionController.updatePermissions);
router.delete(`${api}`, authPolicy, permissionController.deletePermissions);

module.exports = router;
