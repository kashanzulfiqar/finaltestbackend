let Team = require("../models/team.model");
let Permission = require("../models/permissions.model");
let User = require("../models/user.model");
let services = require("../utils/services");

let methods = {
  addTeam: async (req, res) => {
    try {
      let { _id } = req.token;
      let findUser = await User.findOne({ _id });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "companyManagement", "companyManagement");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }
      let companyId = req.token.companyId;

      let data = req.body;
      if (!data) {
        return res.status(404).json({
          msg: "Please Input team name to add team",
          success: false,
        });
      }
      data.companyId = companyId;
      let findTeamIfExists = await Team.findOne({
        companyId: data.companyId,
        teamName: data.teamName,
      });
      console.log(findTeamIfExists);
      if (findTeamIfExists) {
        return res.status(400).json({
          msg: "Team with this name already exist",
          success: false,
        });
      }
      let team = new Team(data);
      let addTeam = await team.save();
      if (!addTeam) {
        return res.status(404).json({
          msg: "Team is not added",
          success: false,
        });
      }
      res.status(200).json({
        Team: addTeam,
        msg: "Team added",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to add team",
        error: error,
        success: false,
      });
    }
  },

  addTeamExcel: async (teamName, isTech, companyId) => {
    try {
      console.log("in team function")
      let data = {};

      data.companyId = companyId;
      data.teamName = isTech ? `${teamName}-Technical` : `${teamName}-NonTechnical`;
      data.isTech = isTech;

      let team = new Team(data);

      let addTeam = await team.save();
      console.log("in team creation")
      if (!addTeam) {
        throw new Error("Failed to create team record");
      }
  
      return addTeam._id;
    } catch (error) {
      console.error("Failed to add team:", error.message);
      //return done();
    }
  },

  viewTeam: async (req, res) => {
    try {
      let _id = req.token._id;
      let check =
        (await User.findOne({ _id: _id, deleted: false })) || (await Admin.findOne({ _id: _id, deleted: false }));

      let companyId = check.companyId;

      let findTeam = await Team.find({ companyId: companyId });

      if (!findTeam.length) {
        findTeam = [];
      }
      return res.status(200).json({
        Team: findTeam,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to view teams",
        error: error,
        success: false,
      });
    }
  },

  updateTeam: async (req, res) => {
    try {
      let { _id } = req.token;
      let findUser = await User.findOne({ _id });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "companyManagement", "companyManagement");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }
      let data = req.body;
      let id = data._id;
      if (!id) {
        return res.status(400).json({
          msg: "Team id is required",
          success: false,
        });
      }

      // Retrieve the existing team
      let existingTeam = await Team.findOne({ _id: id });
      if (!existingTeam) {
        return res.status(404).json({
          msg: "Team not found",
          success: false,
        });
      }

      // If the team name is being updated and it's different from the existing team name
      if (data.teamName && data.teamName !== existingTeam.teamName) {
        // Check if the new team name already exists for another team
        let teamWithSameName = await Team.findOne({
          teamName: data.teamName,
          companyId: existingTeam.companyId,
        });

        if (teamWithSameName) {
          return res.status(400).json({
            msg: "Team name already exists for the same company",
            success: false,
          });
        }
      }

      let updateTeam = await Team.updateOne({ _id: id }, data);
      res.status(200).json({
        data: updateTeam,
        msg: "Team updated",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to update team",
        error: error,
        success: false,
      });
    }
  },

  deleteTeam: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = await User.findOne({ _id: userId });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "companyManagement", "companyManagement");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }
      let _id = req.body._id;
      if (!_id) {
        return res.status(400).json({
          msg: "Team id is required",
          success: false,
        });
      }
      let deleteTeam = await Team.findOneAndDelete({ _id });
      if (!deleteTeam) {
        return res.status(404).json({
          msg: "No team with this id found",
          success: false,
        });
      }
      return res.status(200).json({
        msg: "Team deleted successfully",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to delete team",
        error: error.message || "Something went wrong.",
        success: false,
      });
    }
  },
};

module.exports = methods;
