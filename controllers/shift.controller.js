require("dotenv").config();
const Shift = require("../models/shift.model");
const User = require("../models/user.model");
const Permission = require("../models/permissions.model");
const services = require("../utils/services");
const moment = require("moment");

let methods = {
  addShift: async (req, res) => {
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
      data.companyId = companyId;

      let existingShift = await Shift.findOne({
        companyId: data.companyId,
        title: data.title,
      });

      if (existingShift) {
        return res.status(400).json({
          msg: "Shift with this title already exists",
          success: false,
        });
      }

      const startTime = moment(data.startTime, "HH:mm:ss");
      const maxStartTime = moment(data.maxStartTime, "HH:mm:ss");

      if (!startTime.isValid() || !maxStartTime.isValid()) {
        return res.status(400).json({
          msg: "Invalid time format. Time should be in HH:MM:SS format",
          success: false,
        });
      }

      if (maxStartTime.isBefore(startTime)) {
        return res.status(400).json({
          msg: "Shift max start time cannot be less than start time",
          success: false,
        });
      }

      let shift = new Shift(data);

      let addShift = await shift.save();

      if (!addShift) {
        return res.status(404).json({
          msg: "Empty Shift Record cannot be created",
          success: false,
        });
      }

      res.status(200).json({
        Shift: addShift,
        msg: "Shift added",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to add shift",
        error: error.message,
        success: false,
      });
    }
  },

  addShiftExcel: async (start, end, companyId, baseShiftName) => {
    try {
      console.log("in shift function")
      let shiftName = baseShiftName;
      let shiftExists = true;

      // Check if the shift already exists
      while (shiftExists) {
        const existingShift = await Shift.findOne({
          companyId,
          title: shiftName
        });

        if (existingShift) {
          // Increment shiftName to next number
          let match = shiftName.match(/(\d+)$/);
          if (match) {
            let number = parseInt(match[0], 10) + 1;
            shiftName = baseShiftName.replace(/\d+$/, number);
          } else {
            shiftName = `${baseShiftName} 1`;
          }
        } else {
          shiftExists = false;
        }
      }

      // Prepare shift data
      const startTime = moment(start, "HH:mm:ss");
      const maxStartTime = startTime.add(30, "minutes").format("HH:mm:ss");

      let data = {
        companyId,
        startTime: start,
        maxStartTime,
        endTime: end,
        title: shiftName
      };

      // Create and save the shift
      let shift = new Shift(data)

      let addShift = await shift.save();
      console.log("in shift creation")
      if (!addShift) {
        throw new Error("Failed to create shift record");
      }
  
      return addShift._id;
    } catch (error) {
      console.error("Failed to add shift:", error.message);
      //return done();
    }
  },
  viewShift: async (req, res) => {
    try {
      let _id = req.token._id;
      let check = await User.findOne({ _id, deleted: false });

      let companyId = check.companyId;

      let findShift = await Shift.find({
        companyId: companyId,
        deleted: false,
      });

      return res.status(200).json({
        shift: findShift,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to view shifts",
        error: error.message,
        success: false,
      });
    }
  },
  updateShift: async (req, res) => {
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
          msg: "shift id is required",
          success: false,
        });
      }
      let existingSlab = await Shift.findOne({
        title: data.title,
        _id: { $ne: id },
        companyId: findUser.companyId,
      });

      if (existingSlab) {
        return res.status(400).json({
          msg: "Title already exists for another shift",
          success: false,
        });
      }

      let updateShift = await Shift.findOneAndUpdate({ _id: id }, data);
      if (!updateShift) {
        return res.status(404).json({
          msg: "Shift with this id not found",
        });
      }
      res.status(200).json({
        shift: updateShift,
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to update shift",
        error: error.message,
        success: false,
      });
    }
  },
  deleteShift: async (req, res) => {
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
          msg: "shift id is required",
          success: false,
        });
      }

      let shift = await Shift.findOneAndDelete({ _id });

      if (!shift) {
        return res.status(404).json({
          msg: "Shift with this id not found",
        });
      }

      return res.status(200).json({
        msg: "Shift deleted successfully",
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to delete shift",
        error: error.message,
        success: false,
      });
    }
  },
};
module.exports = methods;
