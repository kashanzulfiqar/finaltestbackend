const router = require('express').Router();
const UserController = require('../controllers/user.controller');
const AdminController = require('../controllers/superadmin.controller');
const Validator = require('../middleware/validator');
const authPolicy = require('../utils/auth.policy');
const utils = require('../utils/index');

let api = '/user';

router.post(`${api}/add-user`, Validator.addUser, authPolicy, UserController.addUser);
router.post(`${api}/admin-signup`, UserController.addAdmin);
router.post(
  `${api}/login-user`,
  // Validator.AddUser,
  // authPolicy,
  UserController.loginUser
);
router.get(
  `${api}/view-user`,
  // Validator.AddUser,
  authPolicy,
  UserController.viewUser
);

router.get(`${api}/all-employees`, authPolicy, UserController.viewAllEmployees);

router.put(
  `${api}/update-user`,
  // Validator.AddUser,
  authPolicy,
  UserController.updateUser
);
router.delete(
  `${api}/delete-user`,
  // Validator.AddUser,
  authPolicy,
  UserController.deleteUser
);
router.post(`${api}/forgot-password`, UserController.forgotPassword);
router.put(`${api}/reset-password`, UserController.resetPassword);
router.put(`${api}/resend-verification-mail`, UserController.resendVerificationMail);
router.put(`${api}/enable-user`, authPolicy, UserController.enableUser);
router.put(`${api}/language`, authPolicy, UserController.updateLanguagePreference);
router.post(`${api}/uploadfile`, utils.attachBodyAndMultipleFiles, UserController.UploadFile);
router.post(`${api}/importExcel`, utils.attachBodyAndMultipleFiles, UserController.ImportExcel);
router.delete(`${api}/deletefile`, authPolicy, UserController.DeleteFile);
router.get(`${api}/view-team-lead`, authPolicy, UserController.viewTeamLeads);
router.get(`${api}/employee-overview`, authPolicy, UserController.employeeOverview);
router.put(`${api}/change-password`, authPolicy, UserController.changePassword);
router.get(`${api}/admin-dashboard`, authPolicy, UserController.adminOverview);
router.get(`${api}/resource-allocation`, authPolicy, UserController.viewAllocation);

router.get(`${api}/employee-overview-dashboard`, authPolicy, UserController.employeeOverviewDashboard);
router.get(`${api}/getSevenDays`, authPolicy, UserController.getSevenDays);

module.exports = router;
