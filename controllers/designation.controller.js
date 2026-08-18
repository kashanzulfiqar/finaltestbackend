let Designation = require("../models/designation.model");
let User = require("../models/user.model");
const Permission = require("../models/permissions.model");
const services = require("../utils/services");

let methods = {
  addDesignation: async (req, res) => {
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
          msg: "Please Input designation name to add designation",
          success: false,
        });
      }
      data.companyId = companyId;
      let findDesignationIfExists = await Designation.findOne({
        companyId: data.companyId,
        designationName: data.designationName,
      });
      if (findDesignationIfExists) {
        return res.status(400).json({
          msg: "Designation with this name already exist",
          success: false,
        });
      }
      let designation = new Designation(data);
      let addDesignation = await designation.save();
      if (!addDesignation) {
        return res.status(404).json({
          msg: "Designation is not added",
          success: false,
        });
      }
      res.status(200).json({
        Designation: addDesignation,
        msg: "Designation added",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to add designation",
        error: error,
        success: false,
      });
    }
  },

  addDesignationExcel: async (designationName, companyId) => {
    try {
      console.log("in desig function")
      let data = {};

      data.companyId = companyId;
      data.designationName = designationName;

      let designation = new Designation(data);

      let addDesig = await designation.save();
      console.log("in desig creation")
      if (!addDesig) {
        throw new Error("Failed to create desig record");
      }
  
      return addDesig._id;
    } catch (error) {
      console.error("Failed to add desig:", error.message);
      //return done();
    }
  },

  viewDesignation: async (req, res) => {
    try {
      let _id = req.token._id;
      let check = await User.findOne({ _id: _id, deleted: false });

      let companyId = check.companyId;

      let findDesignation = await Designation.find({ companyId: companyId });

      return res.status(200).json({
        Designation: findDesignation,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to view designations",
        error: error,
        success: false,
      });
    }
  },

  updateDesignaton: async (req, res) => {
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
          msg: "Designation id is required",
          success: false,
        });
      }

      // Retrieve the existing designation
      let existingDesignation = await Designation.findOne({ _id: id });
      if (!existingDesignation) {
        return res.status(404).json({
          msg: "Designation not found",
          success: false,
        });
      }

      // If the designation name is being updated and it's different from the existing team name
      if (data.designationName && data.designationName !== existingDesignation.designationName) {
        // Check if the new team name already exists for another team
        let designationWithSameName = await Designation.findOne({
          designationName: data.designationName,
          companyID: existingDesignation.companyID, // Use existingDesignation instead of existingTeam
        });

        if (designationWithSameName) {
          return res.status(400).json({
            msg: "Designation name already exists for the same company",
            success: false,
          });
        }
      }
      let updateDesignation = await Designation.updateOne({ _id: id }, data);
      res.status(200).json({
        data: updateDesignation,
        msg: "Designation updated",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to update designation",
        error: error,
        success: false,
      });
    }
  },

  deleteDesignation: async (req, res) => {
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
          msg: "Designation id is required",
          success: false,
        });
      }
      let deleteDesignation = await Designation.findOneAndDelete({ _id });
      if (!deleteDesignation) {
        return res.status(404).json({
          msg: "No designation with this id found",
          success: false,
        });
      }
      return res.status(200).json({
        msg: "Designation deleted successfully",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to delete designation",
        error: error.message || "Something went wrong.",
        success: false,
      });
    }
  },
};

module.exports = methods;
