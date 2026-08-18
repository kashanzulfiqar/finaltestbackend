const router = require("express").Router();
const queryController = require("../controllers/query.controller");
const authPolicy = require("../utils/auth.policy");

let api = "/queries";

router.post(
  `${api}/send-query`,
  authPolicy,
  queryController.sendEmail
);

router.post(
  `${api}/contact-form`,
  queryController.sendContactEmail
);

router.post(
  `${api}/subscribe-letter`,
  queryController.sendSubscribeEmail
);

module.exports = router;
