const leavesPolicy = require("../models/leavePolicy.model");
const Permission = require("../models/permissions.model");
const services = require("../utils/services");
const User = require("../models/user.model");

let methods = {
  addLeavesPolicy: async (req, res) => {
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
      let companyId = req.token.companyId;
      let leavePolicyExist = await leavesPolicy.findOne({
        companyId: companyId,
      });
      if (leavePolicyExist) {
        return res.status(400).json({
          msg: "leave policy already exist update the existing one",
          success: true,
        });
      }
      data.companyId = companyId;
      let newLeavesPolicy = new leavesPolicy(data);
      let newPolicy = await newLeavesPolicy.save();
      if (!newPolicy) {
        return res.status(404).json({
          msg: "No leaves record is added! Record cant be saved empty",
          success: false,
        });
      }
      return res.status(200).json({
        leavesPolicy: newPolicy,
        msg: "Leave Policy added",
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Error",
        success: false,
      });
    }
  },

  viewLeavesPolicy: async (req, res) => {
    try {
      let companyId = req.token.companyId;
      let viewLeavesPolicies = await leavesPolicy.findOne({
        companyId: companyId,
      });

      res.status(200).json({
        leavePolicies: viewLeavesPolicies,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Error",
        success: false,
      });
    }
  },

  updateLeavesPolicy: async (req, res) => {
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
      let data = req.body;
      let _id = data._id;
      if (!_id) {
        return res.status(400).json({
          msg: "Provide the id of leave policy to update the record",
          success: false,
        });
      }
      let updateLeavePolicy = await leavesPolicy.findOneAndUpdate({ _id: _id }, data, {
        new: true,
      });
      if (!updateLeavePolicy) {
        return res.status(404).json({
          msg: "Leave policy with this id not found",
          success: false,
        });
      }
      return res.status(200).json({
        data: updateLeavePolicy,
        msg: "Leaves Policy updated",
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Error",
        success: false,
      });
    }
  },

  deleteLeavesPolicy: async (req, res) => {
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
          msg: "Provide the id of leave policy to delete the record",
          success: false,
        });
      }

      let deleteLeavePolicy = await leavesPolicy.findOneAndDelete({ _id });
      if (!deleteLeavePolicy) {
        return res.status(400).json({
          msg: "Leave policy with this id not found",
          success: false,
        });
      }
      return res.status(200).json({
        msg: "Leave policy with this id deleted",
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
