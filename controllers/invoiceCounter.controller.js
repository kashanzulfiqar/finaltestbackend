let invoiceCounter = require("../models/invoiceCounter.model");
let Permission = require("../models/permissions.model");
let User = require("../models/user.model");
let services = require("../utils/services");

let methods = {
  addInvoiceCounter: async (req, res) => {
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
          msg: "Please Input invoice counter to add",
          success: false,
        });
      }

      data.companyId = companyId;

      data.invoiceCount = data.invoiceCount.toString().padStart(5, "0");

      let findCounterIfExists = await invoiceCounter.findOne({
        companyId: data.companyId,
      });
      if (findCounterIfExists) {
        return res.status(400).json({
          msg: "Invoice counter already exists for company",
          success: false,
        });
      }
      let counter = new invoiceCounter(data);
      let addCounter = await counter.save();
      if (!addCounter) {
        return res.status(404).json({
          msg: "Counter is not added",
          success: false,
        });
      }
      res.status(200).json({
        InvoiceCounter: addCounter,
        msg: "Counter added",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to add counter",
        error: error,
        success: false,
      });
    }
  },

  viewInvoiceCounter: async (req, res) => {
    try {
      let _id = req.token._id;
      let check = await User.findOne({ _id: _id, deleted: false });

      let companyId = check.companyId;

      let findInvoiceCounter = await invoiceCounter.find({
        companyId: companyId,
      });

      if (!findInvoiceCounter.length) {
        findInvoiceTags = [];
      }
      return res.status(200).json({
        InvoiceCounter: findInvoiceCounter,
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

  updateInvoiceCounter: async (req, res) => {
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
          msg: "Invoice counter id is required",
          success: false,
        });
      }

      data.invoiceCount = data.invoiceCount.toString().padStart(5, "0");

      // Retrieve the existing team
      let existingCounter = await invoiceCounter.findOne({ _id: id });
      if (!existingCounter) {
        return res.status(404).json({
          msg: "Invoice counter not found",
          success: false,
        });
      }

      let updateInvoiceCounter = await invoiceCounter.updateOne({ _id: id }, { ...data });
      res.status(200).json({
        data: updateInvoiceCounter,
        msg: "Invoice counter updated",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to update invoice counter",
        error: error,
        success: false,
      });
    }
  },

  deleteInvoiceCounter: async (req, res) => {
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
          msg: "Invoice counter id is required",
          success: false,
        });
      }
      let deleteInvoiceCounter = await invoiceCounter.findOneAndDelete({ _id });
      if (!deleteInvoiceCounter) {
        return res.status(404).json({
          msg: "No invoice counter with this id found",
          success: false,
        });
      }
      return res.status(200).json({
        msg: "Invoice counter deleted successfully",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to delete invoice counter",
        error: error.message || "Something went wrong.",
        success: false,
      });
    }
  },
};

module.exports = methods;
