const router = require("express").Router();
const invoicesTaxSlabsController = require("../controllers/invoicesTaxSlabs.controller");
const authPolicy = require("../utils/auth.policy");

let api = "/invoices-tax-slab";

router.post(`${api}`, authPolicy, invoicesTaxSlabsController.addInvoiceTaxSlab);
router.get(
  `${api}`,
  authPolicy,
  invoicesTaxSlabsController.viewInvoicesTaxSlab
);
router.put(
  `${api}`,
  authPolicy,
  invoicesTaxSlabsController.updateInvoiceTaxSlab
);
router.delete(
  `${api}`,
  authPolicy,
  invoicesTaxSlabsController.deleteInvoiceTaxSlab
);

module.exports = router;
