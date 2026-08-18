const router = require("express").Router();
const TeamController = require("../controllers/team.controller");
const Validator = require("../middleware/validator");
const authPolicy = require("../utils/auth.policy");

let api = "/team";

router.post(
  `${api}/add-team`,
  authPolicy,
  Validator.addTeam,
  TeamController.addTeam
);
router.get(`${api}/view-team`, authPolicy, TeamController.viewTeam);
router.put(
  `${api}/update-team`,
  authPolicy,
  Validator.updateTeam,
  TeamController.updateTeam
);
router.delete(`${api}/delete-team`, authPolicy, TeamController.deleteTeam);

module.exports = router;
