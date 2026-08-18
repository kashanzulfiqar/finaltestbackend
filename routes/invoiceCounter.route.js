const router = require("express").Router();
const invoiceCounterController = require("../controllers/invoiceCounter.controller");
const authPolicy = require("../utils/auth.policy");

let api = "/invoice-counter";

router.post(`${api}`, authPolicy, invoiceCounterController.addInvoiceCounter);
router.get(`${api}`, authPolicy, invoiceCounterController.viewInvoiceCounter);
router.put(
  `${api}/`,
  authPolicy,
  invoiceCounterController.updateInvoiceCounter
);
router.delete(
  `${api}`,
  authPolicy,
  invoiceCounterController.deleteInvoiceCounter
);

module.exports = router;
