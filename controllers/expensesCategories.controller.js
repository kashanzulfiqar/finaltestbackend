let expensesCategories = require("../models/expensesCategories.model");
let Permission = require("../models/permissions.model");
let User = require("../models/user.model");
let services = require("../utils/services");

let methods = {
  addExpenseCategory: async (req, res) => {
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
          msg: "Please Input expense category name to add",
          success: false,
        });
      }
      data.companyId = companyId;
      let findCategoryIfExists = await expensesCategories.findOne({
        companyId: data.companyId,
        expenseCategoryName: data.expenseCategoryName,
      });
      if (findCategoryIfExists) {
        return res.status(400).json({
          msg: "Category with this name already exist",
          success: false,
        });
      }
      let category = new expensesCategories(data);
      let addCategory = await category.save();
      if (!addCategory) {
        return res.status(404).json({
          msg: "Category is not added",
          success: false,
        });
      }
      res.status(200).json({
        Category: addCategory,
        msg: "Category added",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to add category",
        error: error,
        success: false,
      });
    }
  },

  viewExpenseCategories: async (req, res) => {
    try {
      let _id = req.token._id;
      let check = await User.findOne({ _id: _id, deleted: false });

      let companyId = check.companyId;

      const paginateOptions =
        req.query.page && req.query.limit
          ? { page: req.query.page, limit: req.query.limit }
          : {
              page: 1,
              limit: 10,
            };

      var options = {
        ...paginateOptions, // Sort by status and createdAt
      };

      let findCategory = await expensesCategories.paginate(
        {
          companyId: companyId,
        },
        { ...options }
      );

      if (!findCategory) {
        findCategory = "";
      }

      return res.status(200).json({
        Categories: findCategory,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to view expenses categories",
        error: error,
        success: false,
      });
    }
  },

  updateExpenseCategory: async (req, res) => {
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
          msg: "Expense category id is required",
          success: false,
        });
      }

      // Retrieve the existing team
      let existingCategory = await expensesCategories.findOne({ _id: id });
      if (!existingCategory) {
        return res.status(404).json({
          msg: "Expense category not found",
          success: false,
        });
      }

      // If the team name is being updated and it's different from the existing team name
      if (data.expenseCategoryName && data.expenseCategoryName !== existingCategory.expenseCategoryName) {
        // Check if the new team name already exists for another team
        let categoryWithSameName = await expensesCategories.findOne({
          expenseCategoryName: data.expenseCategoryName,
          companyId: existingCategory.companyId,
        });

        if (categoryWithSameName) {
          return res.status(400).json({
            msg: "Expense category name already exists for the same company",
            success: false,
          });
        }
      }

      let updateCategory = await expensesCategories.updateOne({ _id: id }, { ...data });
      res.status(200).json({
        data: updateCategory,
        msg: "Expense Category updated",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to update expense category",
        error: error,
        success: false,
      });
    }
  },

  deleteExpensesCategory: async (req, res) => {
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
          msg: "Expense category id is required",
          success: false,
        });
      }
      let deleteCategory = await expensesCategories.findOneAndDelete({ _id });
      if (!deleteCategory) {
        return res.status(404).json({
          msg: "No category with this id found",
          success: false,
        });
      }
      return res.status(200).json({
        msg: "Expense category deleted successfully",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to delete expense category",
        error: error.message || "Something went wrong.",
        success: false,
      });
    }
  },
};

module.exports = methods;
