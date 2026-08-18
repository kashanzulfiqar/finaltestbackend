const router = require("express").Router();
const Validator = require("../middleware/validator");
const CompanyController = require("../controllers/company.controller");
const authPolicy = require("../utils/auth.policy");

let api = "/company";

router.post(
  `${api}/addcompany`,
  Validator.addCompany,
  CompanyController.addCompany
);

router.get(
  `${api}/viewmycompanyinfo`,
  authPolicy,
  CompanyController.viewMyCompanyInfo
);
router.get(`${api}/viewcompany`, authPolicy, CompanyController.viewCompany);

router.put(
  `${api}/updatecompany`,
  Validator.updateCompany,
  authPolicy,
  CompanyController.updateCompany
);

router.delete(`${api}/deletecompany`, CompanyController.deleteCompany);

module.exports = router;
