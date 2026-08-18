const router = require("express").Router();
const expensesController = require("../controllers/expenses.controller");
const authPolicy = require("../utils/auth.policy");

let api = "/expenses";

router.post(`${api}`, authPolicy, expensesController.addExpense);
router.get(`${api}`, authPolicy, expensesController.viewExpense);
router.put(`${api}`, authPolicy, expensesController.updateExpense);
router.delete(`${api}`, authPolicy, expensesController.deleteExpense);

module.exports = router;
