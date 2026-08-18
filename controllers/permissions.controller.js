const Permissions = require("../models/permissions.model");
const User = require("../models/user.model");
const permissionTemplate = require("../models/permissionsTemplate.model");

let methods = {
  addPermissions: async (req, res) => {
    try {
      let data = req.body;

      let roleId = data.roleId;

      let existingPermissions = await Permissions.findOne({
        roleId: roleId,
      });

      if (existingPermissions) {
        return res.status(400).json({
          msg: "Permissions already exist for this role",
          success: false,
        });
      }

      let permissions = new Permissions(data);

      let addPermissions = await permissions.save();

      if (!addPermissions) {
        return res.status(404).json({
          msg: "Empty record can't be saved",
          success: false,
        });
      }

      return res.status(200).json({
        Permissions: addPermissions,
        msg: "Permissons added",
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to add Permission",
        error: error.message,
        success: false,
      });
    }
  },

  viewPermissions: async (req, res) => {
    try {
      let roleId = req.query.roleId;
      let findPermissions = await Permissions.findOne({ roleId: roleId });
      if (!findPermissions) {
        let findpermissionTemplate = await permissionTemplate.find();
        return res.status(200).json({
          PermissionsTemplate: findpermissionTemplate,
          success: true,
        });
      }
      return res.status(200).json({
        permissions: findPermissions,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to view permission",
        error: error.message,
        success: false,
      });
    }
  },
  updatePermissions: async (req, res) => {
    try {
      let data = req.body;
      let _id = data._id;
      if (!_id) {
        return res.status(400).json({
          msg: "Permission Id required",
          success: false,
        });
      }

      if (_id === process.env.PERMISSION_ID) {
        return res.status(403).json({
          msg: "This permission cannot be edited",
          success: false,
        });
      }

      let updatePermissions = await Permissions.findOneAndUpdate({ _id: _id }, data, {
        new: true,
      });
      return res.status(200).json({
        updatePermissions,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to update permissions",
        error: error.message,
        success: false,
      });
    }
  },
  deletePermissions: async (req, res) => {
    try {
      let _id = req.body._id;
      if (!_id) {
        return res.status(400).json({
          msg: "Permission id required",
          success: false,
        });
      }
      let permission = await Permissions.findOne({ _id });
      if (!permission) {
        return res.status(404).json({
          msg: "Permissions with this id not found",
        });
      } else {
        await Permissions.updateOne({ _id }, { deleted: true });
        return res.status(200).json({
          msg: "Permission with this id deleted",
          success: true,
        });
      }
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to delete permission",
        error: error.message,
        success: false,
      });
    }
  },
};
module.exports = methods;
