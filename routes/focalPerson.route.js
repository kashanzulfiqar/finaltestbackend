const router = require("express").Router();
const focalPersonController = require("../controllers/focalPerson.controller");
const authPolicy = require('../utils/auth.policy');

let api = "/focal-person";

router.post(
  `${api}/add-focal-person`,
  authPolicy,
  focalPersonController.addFocalPerson
);
router.get(
  `${api}/view-focal-person`,
  authPolicy,
  focalPersonController.viewFocalPerson
);
router.put(
  `${api}/update-focal-person`,
  authPolicy,
  focalPersonController.updateFocalPerson
);
router.delete(
  `${api}/delete-focal-person`,
  authPolicy,
  focalPersonController.deleteFocalPerson
);
router.get(
  `${api}/get-focal-person-info`,
  authPolicy,
  focalPersonController.getFocalPersonInfo
);

module.exports = router;
