const router = require("express").Router();
const bankDetailsController = require("../controllers/bankDetails.controller");
const authPolicy = require("../utils/auth.policy");

let api = "/bank-details";

router.post(`${api}`, authPolicy, bankDetailsController.addBankDetail);
router.get(`${api}`, authPolicy, bankDetailsController.viewBankDetails);
router.put(`${api}`, authPolicy, bankDetailsController.updateBankDetail);
router.delete(`${api}`, authPolicy, bankDetailsController.deleteBankDetail);

module.exports = router;
