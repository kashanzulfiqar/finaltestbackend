let expenses = require("../models/expenses.model");
let Permission = require("../models/permissions.model");
let User = require("../models/user.model");
let services = require("../utils/services");
const mongoose = require("mongoose");
const CC = require("currency-converter-lt");
const profitLossModel = require("../models/profitLoss.model");

let methods = {
  addExpense: async (req, res) => {
    try {
      let { _id } = req.token;
      let findUser = await User.findOne({ _id }).populate("companyId");
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "expenseManagement", "expenseManagement");
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
          msg: "Please Input required details to add",
          success: false,
        });
      }
      data.companyId = companyId;

      //let amountToConvert = +data.amount;

      let currencyConverter = new CC();
      await currencyConverter
        .from(data.currency)
        .to(findUser.companyId.preferredCurrency)
        .amount(+data.amount)
        .convert()
        .then((response) => {
          data.convertedAmount = response; 
        });

      let expense = new expenses(data);
      let addExpense = await expense.save();
      if (!addExpense) {
        return res.status(404).json({
          msg: "Expense record not added",
          success: false,
        });
      }

      let existingExpenseDate = new Date(data.purchaseDate);
      let existingYear = existingExpenseDate.getUTCFullYear();
      let existingMonth = existingExpenseDate.getUTCMonth() + 1; // Months are zero-based, so add 1

      let profitLossDoc = await profitLossModel.findOne({ companyId: companyId, year: existingYear, month: existingMonth });
      if (profitLossDoc) {
        await profitLossModel.findByIdAndUpdate(profitLossDoc._id, { isValueChanged: true });
      }

      res.status(200).json({
        Expense: addExpense,
        msg: "Expense record added",
        success: true,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        msg: "Failed to add expense record",
        error: error,
        success: false,
      });
    }
  },

  viewExpense: async (req, res) => {
    try {
      let _id = req.token._id;
      let findUser = await User.findOne({ _id });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "expenseManagement", "expenseManagement");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }

      const paginateOptions =
        req.query.page && req.query.limit
          ? { page: req.query.page, limit: req.query.limit }
          : {
              page: 1,
              limit: 10,
            };

      var options = {
        ...paginateOptions,
        populate: [
          { path: "purchasedBy", select: "fullName imageUrl" },
          { path: "category", select: "expenseCategoryName" },
        ], // Add the fields you want to populate
        sort: { createdAt: -1 },
      };

      let companyId = findUser.companyId;

      const filter = {}; // Create an empty filter object

      if (req.query.itemName) {
        filter.itemName = { $regex: req.query.itemName, $options: "i" };
      }

      if (req.query.paidBy) {
        filter.paidBy = { $regex: req.query.paidBy, $options: "i" };
      }

      if (req.query.purchasedBy) {
        try {
          // Convert designationId to ObjectId
          filter.purchasedBy = new mongoose.Types.ObjectId(`${req.query.purchasedBy}`);
        } catch (error) {
          console.error(error);
        }
      }

      if (req.query.purchaseFrom && req.query.purchaseTo) {
        filter.purchaseDate = {
          $gte: new Date(req.query.purchaseFrom), // Greater than or equal to purchaseFrom date
          $lte: new Date(req.query.purchaseTo), // Less than or equal to purchaseTo date
        };
      }

      let findExpenses = await expenses.paginate(
        {
          companyId: companyId,
          ...filter, // Add the filter to the query
        },
        { ...options }
      );

      if (!findExpenses) {
        findExpenses = "";
      }
      return res.status(200).json({
        Expenses: findExpenses,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to view expenses",
        error: error,
        success: false,
      });
    }
  },

  updateExpense: async (req, res) => {
    try {
      let { _id } = req.token;
      let findUser = await User.findOne({ _id }).populate("companyId");
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "expenseManagement", "expenseManagement");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }
      let data = req.body;
      let companyId = req.token.companyId;
      let id = data._id;
      if (!id) {
        return res.status(400).json({
          msg: "Expense id is required",
          success: false,
        });
      }

      let currencyConverter = new CC();
      await currencyConverter
        .from(data.currency)
        .to(findUser.companyId.preferredCurrency)
        .amount(+data.amount)
        .convert()
        .then((response) => {
          data.convertedAmount = response;
        });

      let prevExpense = await expenses.findOne({ _id: id });

      let prevExpenseDate = new Date(prevExpense?.purchaseDate);
      let prevYear = prevExpenseDate.getUTCFullYear();
      let prevMonth = prevExpenseDate.getUTCMonth() + 1; // Months are zero-based, so add 1

      let updateExpense = await expenses.findOneAndUpdate({ _id: id }, { ...data }, { new: true });

      let existingExpenseDate = new Date(data.purchaseDate);
      let existingYear = existingExpenseDate.getUTCFullYear();
      let existingMonth = existingExpenseDate.getUTCMonth() + 1; 

      let profitLossDoc = await profitLossModel.findOne({ companyId: companyId, year: existingYear, month: existingMonth });
      if (profitLossDoc) {
        await profitLossModel.findByIdAndUpdate(profitLossDoc._id, { isValueChanged: true });
      }

      let prevProfitLossDoc = await profitLossModel.findOne({ companyId: companyId, year: prevYear, month: prevMonth });
      if (prevProfitLossDoc) {
        await profitLossModel.findByIdAndUpdate(prevProfitLossDoc._id, { isValueChanged: true });
      }

      res.status(200).json({
        data: updateExpense,
        msg: "Expense record updated",
        success: true,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        msg: "Failed to update expense record",
        error: error,
        success: false,
      });
    }
  },

  deleteExpense: async (req, res) => {
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
        isAllowed = services.checkPermissions(checkPermission, "expenseManagement", "expenseManagement");
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
          msg: "Expense id is required",
          success: false,
        });
      }
      let deleteExpense = await expenses.findOneAndDelete({ _id });
      if (!deleteExpense) {
        return res.status(404).json({
          msg: "No expense record with this id found",
          success: false,
        });
      }
      return res.status(200).json({
        msg: "Expense record deleted successfully",
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to delete expense record",
        error: error.message || "Something went wrong.",
        success: false,
      });
    }
  },
};

module.exports = methods;
