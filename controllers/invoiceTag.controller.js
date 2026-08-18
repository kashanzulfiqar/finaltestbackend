let invoiceTag = require("../models/invoiceTag.model");
let Permission = require("../models/permissions.model");
let User = require("../models/user.model");
let services = require("../utils/services");

let methods = {
  addInvoiceTag: async (req, res) => {
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
          msg: "Please Input invoice tag to add",
          success: false,
        });
      }
      data.companyId = companyId;
      let findTagIfExists = await invoiceTag.findOne({
        companyId: data.companyId,
      });
      if (findTagIfExists) {
        return res.status(400).json({
          msg: "Invoice Tag already exists for company",
          success: false,
        });
      }
      let tag = new invoiceTag(data);
      let addTag = await tag.save();
      if (!addTag) {
        return res.status(404).json({
          msg: "Tag is not added",
          success: false,
        });
      }
      res.status(200).json({
        InvoiceTag: addTag,
        msg: "Tag added",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to add tag",
        error: error,
        success: false,
      });
    }
  },

  viewInvoiceTag: async (req, res) => {
    try {
      let _id = req.token._id;
      let check = await User.findOne({ _id: _id, deleted: false });

      let companyId = check.companyId;

      let findInvoiceTags = await invoiceTag.find({ companyId: companyId });

      if (!findInvoiceTags.length) {
        findInvoiceTags = [];
      }
      return res.status(200).json({
        InvoiceTag: findInvoiceTags,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to view Invoice Tags",
        error: error,
        success: false,
      });
    }
  },

  updateInvoiceTag: async (req, res) => {
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
          msg: "Invoice Tag id is required",
          success: false,
        });
      }

      // Retrieve the existing team
      let existingTag = await invoiceTag.findOne({ _id: id });
      if (!existingTag) {
        return res.status(404).json({
          msg: "Invoice Tag not found",
          success: false,
        });
      }

      let updateInvoiceTag = await invoiceTag.updateOne({ _id: id }, { ...data });
      res.status(200).json({
        data: updateInvoiceTag,
        msg: "Invoice Tag updated",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to update invoice tag",
        error: error,
        success: false,
      });
    }
  },

  deleteInvoiceTag: async (req, res) => {
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
          msg: "Invoice tag id is required",
          success: false,
        });
      }
      let deleteInvoiceTag = await invoiceTag.findOneAndDelete({ _id });
      if (!deleteInvoiceTag) {
        return res.status(404).json({
          msg: "No invoice tag with this id found",
          success: false,
        });
      }
      return res.status(200).json({
        msg: "Invoice Tag deleted successfully",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to delete invoice tag",
        error: error.message || "Something went wrong.",
        success: false,
      });
    }
  },
};

module.exports = methods;
