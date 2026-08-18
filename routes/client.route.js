const router = require("express").Router();
const clientController = require("../controllers/client.controller");
const authPolicy = require('../utils/auth.policy');

let api = "/client";

router.post(`${api}/add-client`, authPolicy, clientController.addClient);
router.post(`${api}/login-client`, clientController.loginClient);
router.get(`${api}/view-client`, authPolicy, clientController.viewClient);
router.get(`${api}/all-client`, authPolicy, clientController.allClients);
router.put(`${api}/update-client`, authPolicy, clientController.updateClient);
router.get(
  `${api}/get-client-info`,
  authPolicy,
  clientController.getClientInfo
);
router.delete(
  `${api}/delete-client`,
  authPolicy,
  clientController.deleteClient
);

module.exports = router;
