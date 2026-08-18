const invoicesTaxSlab = require("../models/invoiceTaxSlab.model");
const Permission = require("../models/permissions.model");
const user = require("../models/user.model");
const services = require("../utils/services");

let methods = {
  addInvoiceTaxSlab: async (req, res) => {
    try {
      let { _id } = req.token;
      let findUser = await user.findOne({ _id: _id });
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

      let findTaxSlab = await invoicesTaxSlab.findOne({
        companyId: companyId,
        title: data.title,
      });

      if (findTaxSlab) {
        return res.status(400).json({
          msg: "Slab with this name already exist",
          success: false,
        });
      }

      data.companyId = companyId;

      let taxSlab = new invoicesTaxSlab(data);

      let addTaxSlab = await taxSlab.save();

      if (!addTaxSlab) {
        return res.status(404).json({
          msg: "Cannot be Added",
          success: false,
        });
      }

      res.status(200).json({
        taxSlab: addTaxSlab,
        msg: "Invoices Tax Slab added",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to add invoices tax slab",
        error: error.message,
        success: false,
      });
    }
  },
  viewInvoicesTaxSlab: async (req, res) => {
    try {
      let _id = req.token._id;
      let check = await user.findOne({ _id, deleted: false });

      let companyId = check.companyId;

      let status = req.query.status;

      let query = { companyId: companyId, deleted: false };

      if (status) {
        query.status = status;
      }

      let findInvoicesTaxSlab = await invoicesTaxSlab.find(query);

      return res.status(200).json({
        invoicesTaxSlab: findInvoicesTaxSlab,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to view invoices tax slabs",
        error: error.message,
        success: false,
      });
    }
  },
  updateInvoiceTaxSlab: async (req, res) => {
    try {
      let { _id, companyId } = req.token;
      let findUser = await user.findOne({ _id });
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
          msg: "Invoice tax slab id is required",
          success: false,
        });
      }

      if (!data.title) {
        return res.status(400).json({
          msg: "Title is required",
          success: false,
        });
      }

      // Check if the title already exists for another tax slab
      let existingSlab = await invoicesTaxSlab.findOne({
        title: data.title,
        _id: { $ne: id },
        companyId: companyId,
      });

      if (existingSlab) {
        return res.status(400).json({
          msg: "Title already exists for another invoice tax slab",
          success: false,
        });
      }

      let updateTaxSlab = await invoicesTaxSlab.updateOne({ _id: id }, data);

      res.status(200).json({
        taxSlab: updateTaxSlab,
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to update invoices tax slab",
        error: error.message,
        success: false,
      });
    }
  },

  deleteInvoiceTaxSlab: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = await user.findOne({ _id: userId });
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
          msg: "tax slab id is required",
          success: false,
        });
      }

      let taxSlab = await invoicesTaxSlab.findOneAndDelete({ _id });

      if (!taxSlab) {
        return res.status(404).json({
          msg: "no record found",
        });
      }

      return res.status(200).json({
        msg: "Tax Slab deleted Successfully",
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to delete tax slab",
        error: error.message,
        success: false,
      });
    }
  },
};
module.exports = methods;
