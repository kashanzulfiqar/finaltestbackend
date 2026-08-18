const router = require("express").Router();
const expensesCategoriesController = require("../controllers/expensesCategories.controller");
// const Validator = require("../middleware/validator");
const authPolicy = require("../utils/auth.policy");

let api = "/expenses-category";

router.post(
  `${api}`,
  authPolicy,
  expensesCategoriesController.addExpenseCategory
);
router.get(
  `${api}`,
  authPolicy,
  expensesCategoriesController.viewExpenseCategories
);
router.put(
  `${api}`,
  authPolicy,
  expensesCategoriesController.updateExpenseCategory
);
router.delete(
  `${api}`,
  authPolicy,
  expensesCategoriesController.deleteExpensesCategory
);

module.exports = router;
