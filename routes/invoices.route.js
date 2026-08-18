const router = require("express").Router();
const invoicesController = require("../controllers/invoices.controller");
const authPolicy = require("../utils/auth.policy");

let api = "/invoices";

router.post(`${api}`, authPolicy, invoicesController.addInvoice);
router.get(`${api}`, authPolicy, invoicesController.viewInvoice);
router.get(
  `${api}/client-invoices`,
  authPolicy,
  invoicesController.viewInvoiceByClient
);
router.put(`${api}`, authPolicy, invoicesController.updateInvoice);
router.delete(`${api}`, authPolicy, invoicesController.deleteInvoice);

module.exports = router;
