const PermissionsTemplate = require("../models/permissionsTemplate.model");

let methods = {
  addPermissionsTemplate: async (req, res) => {
    try {
      let data = req.body;
      const template = new PermissionsTemplate(data);
      const savedTemplate = await template.save();
      res.status(201).send(savedTemplate);
    } catch (error) {
      return res.status(500).json({
        msg: "Error ",
        success: false,
      });
    }
  },

  viewPermissionTemplate: async (req, res) => {
    try {
      let getPermissionTemplates = await PermissionsTemplate.find();
      if (!getPermissionTemplates) throw "Permissions not found";
      return res.status(200).json({
        PermissionsTemplate: getPermissionTemplates,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Error",
        success: false,
      });
    }
  },

  updatePermissionTemplate: async (req, res) => {
    try {
      let data = req.body;
      let id = data._id;
      if (!id) {
        return res.status(400).json({
          msg: "Provide the id of specific permission template to update the record",
          success: false,
        });
      }
      let updatePermissionTemplate = await PermissionsTemplate.updateOne({ _id: id }, data);
      res.status(200).json({
        Permissions: updatePermissionTemplate,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Error",
        success: false,
      });
    }
  },

  deletePermissionTemplate: async (req, res) => {
    try {
      let _id = req.body._id;
      if (!_id) {
        return res.status(400).json({
          msg: "Provide id to delete the permission template record",
          success: false,
        });
      }
      let deletePermissionTemplate = await PermissionsTemplate.findOneAndDelete({
        _id: _id,
      });
      if (!deletePermissionTemplate) {
        return res.status(404).json({
          msg: "Permission With this id not found",
          success: false,
        });
      }

      return res.status(200).json({
        msg: "Permission template with this id deleted",
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Error",
        success: false,
      });
    }
  },
};

module.exports = methods;
