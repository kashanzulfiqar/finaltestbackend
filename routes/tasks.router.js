const router = require("express").Router();
const tasksController = require("../controllers/tasks.controller");
const authPolicy = require("../utils/auth.policy");

let api = "/tasks";

router.post(`${api}`, authPolicy, tasksController.addTask);
router.get(`${api}`, authPolicy, tasksController.viewTasks);
router.put(`${api}`, authPolicy, tasksController.updateTask);
router.delete(`${api}`, authPolicy, tasksController.deleteTask);

module.exports = router;
