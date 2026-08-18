const taxSlabs = require("../models/taxSlabs.model");
const Permission = require("../models/permissions.model");
const user = require("../models/user.model");
const services = require("../utils/services");

let methods = {
  addTaxSlab: async (req, res) => {
    try {
      let { _id } = req.token;
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
      let companyId = req.token.companyId;

      let data = req.body;
      data.companyId = companyId;

      let findTaxSlab = await taxSlabs.findOne({
        companyId: data.companyId,
        title: data.title,
      });
      if (findTaxSlab) {
        return res.status(400).json({
          msg: "Slab with this name already exist",
          success: false,
        });
      }

      let findTaxSlabWithSameLowerLimit = await taxSlabs.findOne({
        companyId: data.companyId,
        yearlyPayLowerLimit: data.yearlyPayLowerLimit,
      });
      if (findTaxSlabWithSameLowerLimit) {
        return res.status(400).json({
          msg: "Slab with this lower limit exist",
          success: false,
        });
      }
      let findTaxSlabWithSameUpperLimit = await taxSlabs.findOne({
        companyId: data.companyId,
        yearlyPayUpperLimit: data.yearlyPayUpperLimit,
      });
      if (findTaxSlabWithSameUpperLimit) {
        return res.status(400).json({
          msg: "Slab with this upper limit exist",
          success: false,
        });
      }

      if (parseInt(data.yearlyPayLowerLimit) > parseInt(data.yearlyPayUpperLimit)) {
        return res.status(400).json({
          msg: "Slab lower limit cannot be greater then upper limit",
          success: false,
        });
      }

      let existingTaxSlab = await taxSlabs.findOne({
        companyId: data.companyId,
        title: data.title,
      });
      if (existingTaxSlab) {
        return res.status(400).json({
          msg: "Tax slab with this name already exist",
          success: false,
        });
      }

      let taxSlab = new taxSlabs(data);

      let addTaxSlab = await taxSlab.save();

      if (!addTaxSlab) {
        return res.status(404).json({
          msg: "Cannot be Added",
          success: false,
        });
      }

      res.status(200).json({
        taxSlab: addTaxSlab,
        msg: "Tax Slab added",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to add tax slab",
        error: error.message,
        success: false,
      });
    }
  },
  viewTaxSlabs: async (req, res) => {
    try {
      let _id = req.token._id;
      let check = await user.findOne({ _id, deleted: false });

      let companyId = check.companyId;

      console.log(companyId);

      let findTaxSlabs = await taxSlabs.find({
        companyId: companyId,
        deleted: false,
      });

      return res.status(200).json({
        taxSlabs: findTaxSlabs,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to view tax slabs",
        error: error.message,
        success: false,
      });
    }
  },
  // updateTaxSlab: async (req, res) => {
  //   try {
  //     let data = req.body;
  //     let id = data._id;
  //     if (!id) {
  //       return res.status(400).json({
  //         msg: "tax slab id is required",
  //         success: false,
  //       });
  //     }

  //     if (
  //       parseInt(data.yearlyPayLowerLimit) > parseInt(data.yearlyPayUpperLimit)
  //     ) {
  //       return res.status(400).json({
  //         msg: "Slab lower limit cannot be greater then upper limit",
  //         success: false,
  //       });
  //     }

  //     let updateTaxSlab = await taxSlabs.updateOne({ _id: id }, data);

  //     res.status(200).json({
  //       taxSlab: updateTaxSlab,
  //       success: true,
  //     });
  //   } catch (error) {
  //     res.status(500).json({
  //       msg: "Failed to update tax slab",
  //       error: error.message,
  //       success: false,
  //     });
  //   }
  // },
  updateTaxSlab: async (req, res) => {
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
          msg: "Tax slab id is required",
          success: false,
        });
      }

      if (parseInt(data.yearlyPayLowerLimit) > parseInt(data.yearlyPayUpperLimit)) {
        return res.status(400).json({
          msg: "Slab lower limit cannot be greater than upper limit",
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
      let existingSlab = await taxSlabs.findOne({
        title: data.title,
        _id: { $ne: id },
        companyId: companyId,
      });
      if (existingSlab) {
        return res.status(400).json({
          msg: "Title already exists for another tax slab",
          success: false,
        });
      }
      let existingYearlyPayLowerLimit = await taxSlabs.findOne({
        yearlyPayLowerLimit: data.yearlyPayLowerLimit,
        _id: { $ne: id },
        companyId: companyId,
      });
      if (existingYearlyPayLowerLimit) {
        return res.status(400).json({
          msg: "Yearly pay lower limit already exists for another tax slab",
          success: false,
        });
      }

      // Check if the yearly pay upper limit already exists for another tax slab, excluding the current tax slab being updated
      let existingYearlyPayUpperLimit = await taxSlabs.findOne({
        yearlyPayUpperLimit: data.yearlyPayUpperLimit,
        _id: { $ne: id },
        companyId: companyId,
      });
      if (existingYearlyPayUpperLimit) {
        return res.status(400).json({
          msg: "Yearly pay upper limit already exists for another tax slab",
          success: false,
        });
      }
      let updateTaxSlab = await taxSlabs.updateOne({ _id: id }, data);

      res.status(200).json({
        taxSlab: updateTaxSlab,
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to update tax slab",
        error: error.message,
        success: false,
      });
    }
  },

  deleteTaxSlab: async (req, res) => {
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

      let taxSlab = await taxSlabs.findOneAndDelete({ _id });

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
