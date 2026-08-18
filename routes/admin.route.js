const router = require("express").Router();
const UserController = require("../controllers/user.controller");
const AdminController = require("../controllers/superadmin.controller");
const Validator = require("../middleware/validator");
const authPolicy = require("../utils/adminPolicy");
const utils = require("../utils/index");

let api = "/newApi";

router.post(
  `${api}/newRoute`,
  // Validator.AddUser,
  // authPolicy,
  UserController.loginAdmin
);
router.post(
    `${api}/resend-otp`,
    // Validator.AddUser,
    // authPolicy,
    UserController.resendOTP
  );

router.put(`${api}/change`, authPolicy, AdminController.changePassword);

router.put(`${api}/reset`, AdminController.resetPassword);
router.post(`${api}/forgot`, AdminController.forgotPassword);

router.get(`${api}/overview`, authPolicy, AdminController.superAdminOverview);

router.delete(
  `${api}/disable`,
  // Validator.AddUser,
  authPolicy,
  AdminController.disableCompany
);

router.put(`${api}/enable`, authPolicy, AdminController.enableCompany);

module.exports = router;