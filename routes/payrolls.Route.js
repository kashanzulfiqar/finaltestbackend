const router = require("express").Router();
const payrollsController = require("../controllers/payrolls.controllers.js");
const Validator = require("../middleware/validator");
const authPolicy = require("../utils/auth.policy");

let api = "/payrolls";

router.post(
  `${api}/generate-payrolls`,
  authPolicy,
  payrollsController.generatePayrolls
);
router.get(
  `${api}/view-payrolls`,
  authPolicy,
  payrollsController.viewEmployeesPayrolls
);
router.put(
  `${api}/process-payroll`,
  authPolicy,
  payrollsController.processPayroll
);
router.delete(
  `${api}/delete-payroll`,
  authPolicy,
  payrollsController.deletePayroll
);

router.get(
  `${api}/employee-payroll`,
  authPolicy,
  payrollsController.employeePayrolls
);
router.get(`${api}/view-payroll`, authPolicy, payrollsController.viewPayroll);

module.exports = router;
