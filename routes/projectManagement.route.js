const router = require("express").Router();
const projectManagementController = require("../controllers/projectManagement.controller");
const authPolicy = require("../utils/auth.policy");

let api = "/project-management";

router.post(`${api}`, authPolicy, projectManagementController.addProject);
router.get(`${api}`, authPolicy, projectManagementController.viewProject);
router.get(
  `${api}/project-by-id`,
  authPolicy,
  projectManagementController.viewProjectByClientId
);
router.get(
  `${api}/projectInvoice`,
  authPolicy,
  projectManagementController.viewHourlyProjectInvoice
);
router.get(
  `${api}/monthlyProjectInvoice`,
  authPolicy,
  projectManagementController.viewMonthlyProjectInvoice
);
router.put(`${api}`, authPolicy, projectManagementController.updateProject);
router.delete(`${api}`, authPolicy, projectManagementController.deleteProject);

module.exports = router;
