const router = require("express").Router();
const LeadController = require("../controllers/leads.controller");
const authPolicy = require("../utils/auth.policy");

let api = "/leads";

router.post(`${api}`, authPolicy, LeadController.addLead);
router.get(`${api}`, authPolicy, LeadController.viewLead);
router.put(`${api}`, authPolicy, LeadController.updateLead);
router.delete(`${api}`, authPolicy, LeadController.deleteLead);
router.post(`${api}/add-source`, authPolicy, LeadController.addSourceOption);
router.put(`${api}/addNote`, authPolicy, LeadController.addNote);
router.put(`${api}/editNote`, authPolicy, LeadController.updateNote);
router.delete(`${api}/deleteNote`, authPolicy, LeadController.deleteNote);
router.delete(`${api}/deleteFile`, authPolicy, LeadController.deleteFile);
router.post(`${api}/add-medium`, authPolicy, LeadController.addCommunication);
router.put(`${api}/addReachOut`, authPolicy, LeadController.addReachOut);
router.put(`${api}/editReachOut`, authPolicy, LeadController.updateReachOut);
router.delete(`${api}/deleteReachout`, authPolicy, LeadController.deleteReachOut);
router.put(`${api}/addFiles`, authPolicy, LeadController.addFiles);
router.get(`${api}/view-files`, authPolicy, LeadController.viewFiles);
router.get(`${api}/view-source`, authPolicy, LeadController.viewSourceOption);
router.get(`${api}/view-medium`, authPolicy, LeadController.viewCommunication);
router.delete(`${api}/delete-source`, authPolicy, LeadController.deleteSource);
router.delete(`${api}/delete-medium`, authPolicy, LeadController.deleteMedium);

module.exports = router;
