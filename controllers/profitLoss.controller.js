let profitLoss = require("../models/profitLoss.model");
let Expenses = require("../models/expenses.model");
let Payrolls = require("../models/payrolls.model");
let Invoices = require("../models/invoices.model");
let Permission = require("../models/permissions.model");
let User = require("../models/user.model");
let services = require("../utils/services");

const addProfitLoss = async (month, year, companyId, id) => {
  try {
    console.log("in add functuon")
    let data = {};
    data.month = month;
    data.year = year;

    data.companyId = companyId;

    let startDate = new Date(Date.UTC(year, month - 1, 1)); 
    let endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    
    let companyExpenses = await Expenses.find({
      companyId: companyId,
      purchaseDate: {
        $gte: startDate,
        $lte: endDate,
      },
    });

    let totalCompanyExpenses = 0;

    for (let expense of companyExpenses) {
      if (
        expense.convertedAmount !== undefined &&
        expense.convertedAmount !== "" &&
        !isNaN(+expense.convertedAmount) // Check if it's a valid number
      ) {
        totalCompanyExpenses += parseFloat(+expense.convertedAmount);
      }
    }

    data.generalExpense = totalCompanyExpenses.toFixed(2);

    let companyRevenue = await Invoices.find({
      companyId: companyId,
      invoiceEndDate: {
        $gte: startDate,
        $lte: endDate,
      },
      status: { $in: ["Paid", "Partially Paid"] },
    });

    let totalCompanyRevenue = 0;

    for (let revenue of companyRevenue) {
      if (
        revenue.paidAmountInPreferredCurrency !== undefined &&
        revenue.convertedAmount !== "" &&
        !isNaN(+revenue.paidAmountInPreferredCurrency) // Check if it's a valid number
      ) {
        totalCompanyRevenue += parseFloat(+revenue.paidAmountInPreferredCurrency);
      }
    }

    data.totalRevenue = totalCompanyRevenue.toFixed(2);

    const monthNumberToString = {
      1: "January",
      2: "February",
      3: "March",
      4: "April",
      5: "May",
      6: "June",
      7: "July",
      8: "August",
      9: "September",
      10: "October",
      11: "November",
      12: "December",
    };

    const monthString = monthNumberToString[+month];

    let companyCreditedSalaries = await Payrolls.find({
      companyId: companyId,
      payMonth: monthString,
      payYear: year,
      processed: true,
    });

    let totalCreditedSalaryThisMonth = 0;
    let totalPaidTax = 0;

    for (let salary of companyCreditedSalaries) {
      if (
        salary.creditSalary !== undefined &&
        salary.creditSalary !== "" &&
        !isNaN(salary.creditSalary) // Check if it's a valid number
      ) {
        totalCreditedSalaryThisMonth += parseFloat(salary.creditSalary);
      }

      if (
        salary.tax !== undefined &&
        salary.tax !== "" &&
        !isNaN(salary.tax) // Check if it's a valid number
      ) {
        totalPaidTax += parseFloat(salary.tax);
      }
    }

    data.creditedSalaryExpense = totalCreditedSalaryThisMonth.toFixed(2);
    data.salaryTaxExpense = totalPaidTax.toFixed(2);

    data.totalExpense = (+totalCreditedSalaryThisMonth + +totalPaidTax + +totalCompanyExpenses).toFixed(2);

    data.profitLoss = (data.totalRevenue - data.totalExpense).toFixed(2);
    data.isValueChanged = false;

    if (id) {
      // If `id` is provided, update the existing profitLoss document
      let updatedProfitLoss = await profitLoss.findByIdAndUpdate(
        id,
        data,
        { new: true } // Return the updated document
      );
      if (!updatedProfitLoss) {
        console.log("Failed to update profit loss");
      } else {
        console.log("Profit loss updated");
      }
    }
    else {
      let newProfitLoss = new profitLoss(data);
      let addProfitLoss = await newProfitLoss.save();
      if (!addProfitLoss) {
        console.log("profit loss not added")
      }
      console.log("profit loss added")
    }

  } catch (error) {
    console.log("Failed to add profit loss", error.message)
  }
}

let methods = {
  viewProfitLoss: async (req, res) => {
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
        isAllowed = services.checkPermissions(checkPermission, "financeManagement", "managePayrolls");
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
        populate: {
          path: "companyId",
          select: "preferredCurrency",
        },
        sort: { month: -1 },
      };

      let companyId = findUser.companyId;
      let deleted = false;

      let filter = {};

      filter.companyId = companyId;
      filter.deleted = deleted;

      if (req.query.month) {
        filter.month = req.query.month;
      }

      if (req.query.year) {
        filter.year = req.query.year;
      }

      let findProfitLoss = await profitLoss.find(filter).sort({ month: 1 });
      //console.log("findProfitLoss",findProfitLoss)
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1; 
      let endMonth = 12;

      if (req.query.year == currentYear) {
        console.log("same year")
        endMonth = currentMonth; // If the year is the current year, only go up to the current month
      }

      // If no records found, initialize the year with new profit loss documents
      if (findProfitLoss.length === 0) {
        console.log("here in first")
        for (let month = 1; month <= endMonth; month++) {
          await addProfitLoss(month, req.query.year, companyId, null);
        }
      } else {
        // Check if any month is missing or if any profit loss has isValueChanged = true
        for (let month = 1; month <= endMonth; month++) {
          const monthProfitLoss = findProfitLoss.find((pl) => pl.month == month);

          if (!monthProfitLoss) {
            console.log("here in not created", month)
            // No profit loss document exists for this month, create one
            await addProfitLoss(month, req.query.year, companyId, null);
          } else if (monthProfitLoss.isValueChanged) {
            console.log("here in not valucechanged", month)
            // Profit loss document exists but isValueChanged is true, update it
            await addProfitLoss(month, req.query.year, companyId, monthProfitLoss._id);
          }
        }
      }

      findProfitLoss = await profitLoss.paginate(filter, { ...options });

      if (!findProfitLoss) {
        findProfitLoss = "";
      }
      return res.status(200).json({
        profitLoss: findProfitLoss,
        success: true,
      });
    } catch (error) {
      console.log(error.message)
      return res.status(500).json({
        msg: "Failed to view profit loss records",
        error: error,
        success: false,
      });
    }
  },

  profitLossGraph: async (req, res) => {
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
        isAllowed = services.checkPermissions(checkPermission, "financeManagement", "managePayrolls");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }

      let companyId = findUser.companyId;
      let deleted = false;

      let filter = {};

      filter.companyId = companyId;
      filter.deleted = deleted;

      if (req.query.month) {
        filter.month = req.query.month;
      }

      if (req.query.year) {
        filter.year = req.query.year;
      }

      let findProfitLoss = await profitLoss.find(filter);

      if (!findProfitLoss.length) {
        findProfitLoss = [];
      }

      // Transform the data into the desired format
      const graph_data = [];

      const dataByYearMonth = {};

      findProfitLoss.forEach((item) => {
        const year = item.year;
        const month = item.month;
        if (!dataByYearMonth[year]) {
          dataByYearMonth[year] = {};
        }
        dataByYearMonth[year][month] = {
          month: month,
          totalExpense: parseFloat(item.totalExpense),
          totalRevenue: parseFloat(item.totalRevenue),
          profitLoss: parseFloat(item.profitLoss),
        };
      });

      for (const year in dataByYearMonth) {
        const yearData = {
          year: year,
          months: [],
        };

        for (let month = 1; month <= 12; month++) {
          if (dataByYearMonth[year][month]) {
            yearData.months.push(dataByYearMonth[year][month]);
          } else {
            yearData.months.push({
              month: month.toString(),
              totalExpense: null,
              totalRevenue: null,
              profitLoss: null,
            });
          }
        }

        graph_data.push(yearData);
      }

      // Send the transformed data as the response
      return res.status(200).json({
        profitLoss: graph_data,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to view profit loss records",
        error: error,
        success: false,
      });
    }
  },

  updateProfitLoss: async (req, res) => {
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
        isAllowed = services.checkPermissions(checkPermission, "financeManagement", "managePayrolls");
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
          msg: "Record id is required",
          success: false,
        });
      }

      data.profitLoss = (+data.totalRevenue - +data.totalExpense).toFixed(2);

      let updateProfitLoss = await profitLoss.updateOne({ _id: id }, { ...data });
      res.status(200).json({
        data: updateProfitLoss,
        msg: "Profit loss record updated",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to update profit loss record",
        error: error,
        success: false,
      });
    }
  },

  deleteProfitLoss: async (req, res) => {
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
        isAllowed = services.checkPermissions(checkPermission, "financeManagement", "managePayrolls");
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
          msg: "Team id is required",
          success: false,
        });
      }

      let deleteProfitLoss = await profitLoss.findOneAndDelete({ _id });
      if (!deleteProfitLoss) {
        return res.status(404).json({
          msg: "No profit loss record with this id found",
          success: false,
        });
      }
      return res.status(200).json({
        msg: "Profit loss record deleted successfully",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to delete profit loss record",
        error: error.message || "Something went wrong.",
        success: false,
      });
    }
  },
};

module.exports = methods;
