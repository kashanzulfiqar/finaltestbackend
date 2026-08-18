const router = require("express").Router();
const taxSlabsController = require("../controllers/taxSlabs.controller");
const Validator = require("../middleware/validator");
const authPolicy = require("../utils/auth.policy");

let api = "/tax-slab";

router.post(
  `${api}`,
  authPolicy,
  Validator.addTaxSlab,
  taxSlabsController.addTaxSlab
);
router.get(`${api}`, authPolicy, taxSlabsController.viewTaxSlabs);
router.put(
  `${api}`,
  authPolicy,
  Validator.updateTaxSlab,
  taxSlabsController.updateTaxSlab
);
router.delete(`${api}`, authPolicy, taxSlabsController.deleteTaxSlab);

module.exports = router;
