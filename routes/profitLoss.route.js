const router = require("express").Router();
const profitLossController = require("../controllers/profitLoss.controller");
const authPolicy = require("../utils/auth.policy");

let api = "/profit-loss";

//router.post(`${api}`, authPolicy, profitLossController.addProfitLoss);
router.get(`${api}`, authPolicy, profitLossController.viewProfitLoss);
router.get(`${api}/graph`, authPolicy, profitLossController.profitLossGraph);
router.put(`${api}`, authPolicy, profitLossController.updateProfitLoss);
router.delete(`${api}`, authPolicy, profitLossController.deleteProfitLoss);

module.exports = router;
