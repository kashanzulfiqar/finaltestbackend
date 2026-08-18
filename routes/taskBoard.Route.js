const router = require("express").Router();
const taskBoardController = require("../controllers/taskBoard.controller.js");
const Validator = require("../middleware/validator");
const authPolicy = require("../utils/auth.policy");

let api = "/taskBoard";

router.post(
  `${api}/add-taskBoard`,
  authPolicy,
  taskBoardController.addTaskBoard
);
router.get(
  `${api}/view-taskBoard`,
  authPolicy,
  taskBoardController.viewTaskBoard
);
router.put(
  `${api}/add-taskBoard`,
  authPolicy,
  taskBoardController.editTaskBoard
);
router.delete(
  `${api}/delete-taskBoard`,
  authPolicy,
  taskBoardController.deleteTaskBoard
);
router.delete(
  `${api}/delete-column`,
  authPolicy,
  taskBoardController.deleteColumn
);
router.delete(
  `${api}/remove-task`,
  authPolicy,
  taskBoardController.removeTask
);

module.exports = router;
