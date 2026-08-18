let Holidays = require("../models/holidays.model");
let Permission = require("../models/permissions.model");
let User = require("../models/user.model");
let services = require("../utils/services");
const { default: mongoose } = require("mongoose");

let methods = {
  addHoliday: async (req, res) => {
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
          success: false,
        });
      }
      let companyId = req.token.companyId;

      let data = req.body;
      if (!data) {
        return res.status(404).json({
          msg: "Please Input holiday details",
          success: false,
        });
      }
      data.companyId = companyId;
      const holidayDateFromBody = data.holidayDate;
      const holidayDate = holidayDateFromBody.split("T")[0];
      let findHolidayIfExists = await Holidays.findOne({
        companyId: data.companyId,
        holidayDate: holidayDate,
      });
      if (findHolidayIfExists) {
        return res.status(400).json({
          msg: "Holiday with this date already exist",
          success: false,
        });
      }

      let findHolidayDateIfExists = await Holidays.findOne({
        companyId: data.companyId,
        holidayDate: data.holidayDate,
      });
      if (findHolidayDateIfExists) {
        return res.status(400).json({
          msg: "Holiday with this date already exist",
          success: false,
        });
      }

      let holiday = new Holidays(data);
      let addHoliday = await holiday.save();
      if (!addHoliday) {
        return res.status(404).json({
          msg: "Holiday is not added",
          success: false,
        });
      }
      res.status(200).json({
        Holiday: addHoliday,
        msg: "Holiday added",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to add holiday",
        error: error,
        success: false,
      });
    }
  },

  viewHolidays: async (req, res) => {
    try {
      let _id = req.token._id;
      const paginateOptions =
        req.query.page && req.query.limit
          ? { page: req.query.page, limit: req.query.limit }
          : {
              page: 1,
              limit: 10,
            };

      var options = {
        ...paginateOptions,
        sort: { holidayDate: 1 },
      };

      let companyId = req.token.companyId;

      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(Date.UTC(currentYear, 0, 1));
      const endOfYear = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999));
      
      let findHoliday = await Holidays.paginate(
        { companyId: companyId, 
          holidayDate: { $gte: startOfYear, $lte: endOfYear }, 
        },
        { ...options }
      );

      if (!findHoliday) {
        findHoliday = "";
      }
      return res.status(200).json({
        Holiday: findHoliday,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to view holidays",
        error: error,
        success: false,
      });
    }
  },

  updateHoliday: async (req, res) => {
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
          msg: "Holiday id is required",
          success: false,
        });
      }

      // Retrieve the existing team
      let existingHoliday = await Holidays.findOne({ _id: id });
      if (!existingHoliday) {
        return res.status(404).json({
          msg: "Holiday not found",
          success: false,
        });
      }

      // If the team name is being updated and it's different from the existing team name
      if (data.holidayTitle && data.holidayTitle !== existingHoliday.holidayTitle) {
        // Check if the new team name already exists for another team
        let holidayWithSameName = await Holidays.findOne({
          holidayTitle: data.holidayTitle,
          companyId: existingHoliday.companyId,
        });

        if (holidayWithSameName) {
          return res.status(400).json({
            msg: "Holiday name already exists for the same company",
            success: false,
          });
        }
      }

      if (data.holidayDate && data.holidayDate !== existingHoliday.holidayDate) {
        // Check if the new team name already exists for another team
        let holidayWithSameDate = await Holidays.findOne({
          holidayDate: data.holidayDate,
          companyId: existingHoliday.companyId,
        });

        if (holidayWithSameDate) {
          return res.status(400).json({
            msg: "Holiday date already exists for the same company",
            success: false,
          });
        }
      }

      let updateHoliday = await Holidays.updateOne({ _id: id }, { ...data });
      return res.status(200).json({
        data: updateHoliday,
        msg: "Holiday updated",
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to update holiday",
        error: error,
        success: false,
      });
    }
  },

  deleteHoliday: async (req, res) => {
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
          msg: "Team id is required",
          success: false,
        });
      }
      let deleteHoliday = await Holidays.findOneAndDelete({ _id });
      if (!deleteHoliday) {
        return res.status(404).json({
          msg: "No holiday with this id found",
          success: false,
        });
      }
      return res.status(200).json({
        msg: "Holiday deleted successfully",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to delete holiday",
        error: error.message || "Something went wrong.",
        success: false,
      });
    }
  },
};

module.exports = methods;
