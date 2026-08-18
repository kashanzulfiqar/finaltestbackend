const router = require("express").Router();
const RequestsController = require("../controllers/requests.controller");
//eslint-disable-next-line
// const Validator = require("../middleware/validator");
const authPolicy = require("../utils/auth.policy");

let api = "/requests";

router.post(
  `${api}`,
  authPolicy,
  // Validator.addRequest,
  RequestsController.addRequest
);
router.get(
  `${api}/view-self-request`,
  authPolicy,
  RequestsController.viewSelfRequest
);
router.get(
  `${api}/view-all-request`,
  authPolicy,
  RequestsController.viewAllRequest
);
router.put(
  `${api}/update-request`,
  authPolicy,
  RequestsController.updateRequest
);
router.delete(`${api}`, authPolicy, RequestsController.deleteRequest);

router.get(
  `${api}/view-self-request-dashboard`,
  authPolicy,
  RequestsController.viewSelfRequestDashboard
);

module.exports = router;
