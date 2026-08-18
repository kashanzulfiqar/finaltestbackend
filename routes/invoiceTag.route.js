const router = require("express").Router();
const invoiceTagController = require("../controllers/invoiceTag.controller");
const authPolicy = require("../utils/auth.policy");

let api = "/invoice-tag";

router.post(`${api}`, authPolicy, invoiceTagController.addInvoiceTag);
router.get(`${api}`, authPolicy, invoiceTagController.viewInvoiceTag);
router.put(`${api}/`, authPolicy, invoiceTagController.updateInvoiceTag);
router.delete(`${api}`, authPolicy, invoiceTagController.deleteInvoiceTag);

module.exports = router;
