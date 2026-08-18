let Role = require("../models/role.model");
let User = require("../models/user.model");
let Permission = require("../models/permissions.model");
let services = require("../utils/services");

let methods = {
  addRole: async (req, res) => {
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
      let { companyId } = req.token;

      let data = req.body;
      if (!data) {
        return res.status(404).json({
          msg: "Please Input role name to add role",
          success: false,
        });
      }
      data.companyId = companyId;
      let findRoleIfExists = await Role.findOne({
        companyId: data.companyId,
        roleName: data.roleName,
      });
      if (findRoleIfExists) {
        return res.status(400).json({
          msg: "Role with this name already exist",
          success: false,
        });
      }
      let role = new Role(data);
      let addRole = await role.save();
      if (!addRole) {
        return res.status(404).json({
          msg: "Role is not added",
          success: false,
        });
      }
      res.status(200).json({
        Role: addRole,
        msg: "Role added",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to add role",
        error: error,
        success: false,
      });
    }
  },

  viewRole: async (req, res) => {
    try {
      let _id = req.token._id;
      let check = await User.findOne({ _id: _id, deleted: false });

      let companyId = check.companyId;

      let findRole = await Role.find({ 
        //companyId: companyId 
        $or: [
          { companyId: companyId },
          { companyId: { $exists: false } }
        ]
      });

      return res.status(200).json({
        Role: findRole,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to view roles",
        error: error,
        success: false,
      });
    }
  },

  updateRole: async (req, res) => {
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
          msg: "Role id is required",
          success: false,
        });
      }

      if (id === process.env.ROLE_ID) {
        return res.status(403).json({
          msg: "This role cannot be edited",
          success: false,
        });
      }

      // Retrieve the existing team
      let existingRole = await Role.findOne({ _id: id });
      if (!existingRole) {
        return res.status(404).json({
          msg: "Role not found",
          success: false,
        });
      }

      // If the team name is being updated and it's different from the existing team name
      if (data.roleName && data.roleName !== existingRole.roleName) {
        // Check if the new team name already exists for another team
        let roleWithSameName = await Role.findOne({
          roleName: data.roleName,
          //   companyID: existingTeam.companyID,
        });

        if (roleWithSameName) {
          return res.status(400).json({
            msg: "Role name already exists for the same company",
            success: false,
          });
        }
      }

      let updateRole = await Role.updateOne({ _id: id }, data);
      res.status(200).json({
        data: updateRole,
        msg: "Role updated",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to update role",
        error: error,
        success: false,
      });
    }
  },

  deleteRole: async (req, res) => {
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
          msg: "Role id is required",
          success: false,
        });
      }

      if (_id == '66c5b020d9bfa5dfdbb07d0b') {
        return res.status(403).json({
          msg: "This role cannot be deleted",
          success: false,
        });
      }

      let deleteRole = await Role.findOneAndDelete({ _id });
      if (!deleteRole) {
        return res.status(404).json({
          msg: "No role with this id found",
          success: false,
        });
      }
      return res.status(200).json({
        msg: "Role deleted successfully",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to delete role",
        error: error.message || "Something went wrong.",
        success: false,
      });
    }
  },
};

module.exports = methods;
