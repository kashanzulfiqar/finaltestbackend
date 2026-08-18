let Timesheets = require("../models/timesheet.model");
let Permission = require("../models/permissions.model");
let User = require("../models/user.model");
let services = require("../utils/services");
const { date } = require("joi");
let mongoose = require("mongoose");

let methods = {
  addTimesheet: async (req, res) => {
    try {
      let { _id } = req.token;
      let companyId = req.token.companyId;

      let data = req.body;
      if (!data) {
        return res.status(404).json({
          msg: "Please Input required data",
          success: false,
        });
      }
      data.userId = _id;
      data.companyId = companyId;

      console.log(new Date(data.date));

      // let checkIfTimesheetExists = await Timesheets.findOne({
      //   companyId: companyId,
      //   date: new Date(data.date),
      //   projectId: new mongoose.Types.ObjectId(data.projectId),
      //   taskId: new mongoose.Types.ObjectId(data.taskId),
      // });
      // console.log(checkIfTimesheetExists);

      // if (checkIfTimesheetExists) {
      //   return res.status(400).json({
      //     msg: "Timesheet for this date for this project and task already exist",
      //   });
      // }

      let timesheet = new Timesheets(data);
      let addTimesheet = await timesheet.save();
      if (!addTimesheet) {
        return res.status(404).json({
          msg: "Timesheet is not added",
          success: false,
        });
      }
      res.status(200).json({
        Timesheet: addTimesheet,
        msg: "Timesheet added",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to add timesheet",
        error: error,
        success: false,
      });
    }
  },

  viewTimesheet: async (req, res) => {
    try {
      const _id = req.token._id;
      const findUser = await User.findOne({ _id });

      const roleId = findUser.roleId;
      let isAllowed;

      // Pagination options
      const paginateOptions =
        req.query.page && req.query.limit ? { page: req.query.page, limit: req.query.limit } : { page: 1, limit: 10 };

      // Options for populating references and sorting
      const options = {
        ...paginateOptions,
        populate: [
          { path: "projectId", select: "projectName" },
          { path: "userId", select: "fullName imageUrl" },
          { path: "taskId", select: "title" },
        ],
        sort: { createdAt: -1 },
      };

      // Extract timesheetTo and timesheetFrom values from the request query parameters
      const timesheetTo = req.query.timesheetTo;
      const timesheetFrom = req.query.timesheetFrom;
      const username = req.query.userName;
      const employeeOnlyData = req.query.employeeOnly;

      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        const checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "timesheetManagement", "timesheetManagement");
      }

      if (isAllowed && employeeOnlyData === "false") {
        const companyId = findUser.companyId;
        // Check if neither username nor timesheet filter is provided
        const noFilterProvided = !username && (!timesheetTo || !timesheetFrom);

        if (noFilterProvided) {
          // If no filters are provided, fetch all timesheets
          const allTimesheets = await Timesheets.paginate({}, { ...options });

          return res.status(200).json({
            Timesheet: allTimesheets,
            success: true,
          });
        }

        // Create a filter object based on timesheetTo and timesheetFrom values
        let filter = { companyId: companyId };

        if (username) {
          // If username is provided, filter for user search by username using regex
          const regexUserName = new RegExp(username, "i");

          // Find users that match the provided user name using regex
          const usersMatchingName = await User.find({ fullName: { $regex: regexUserName } });

          // Extract user IDs from the matching users
          const userIds = usersMatchingName.map((user) => user._id);

          // Use user IDs to filter timesheets
          if (userIds.length > 0) {
            filter.userId = { $in: userIds };
          } else {
            // Handle the case where no matching users are found
            return res.status(404).json({
              msg: "No users found for the provided username",
              success: false,
            });
          }
        }

        // Add timesheetTo and timesheetFrom filters for both cases
        if (timesheetTo && timesheetFrom) {
          // Calculate the start and end dates for the entire day
          const startOfDay = new Date(timesheetFrom);
          startOfDay.setHours(0, 0, 0, 0);

          const endOfDay = new Date(timesheetTo);
          endOfDay.setHours(23, 59, 59, 999);

          filter.date = {
            $gte: startOfDay,
            $lte: endOfDay,
          };
        }

        // Find timesheets based on the filter
        const findTimesheet = await Timesheets.paginate(filter, { ...options });
        if (!findTimesheet) {
          findTimesheet = "";
        }

        return res.status(200).json({
          Timesheet: findTimesheet,
          success: true,
        });
      } else {
        // Non-admin case
        const filter = { userId: _id };

        if (timesheetTo && timesheetFrom) {
          // Calculate the start and end dates for the entire day
          const startOfDay = new Date(timesheetFrom);
          startOfDay.setHours(0, 0, 0, 0);

          const endOfDay = new Date(timesheetTo);
          endOfDay.setHours(23, 59, 59, 999);

          filter.date = {
            $gte: startOfDay,
            $lte: endOfDay,
          };
        }

        const findTimesheet = await Timesheets.paginate(filter, { ...options });

        if (!findTimesheet) {
          findTimesheet = "";
        }

        return res.status(200).json({
          Timesheet: findTimesheet,
          success: true,
        });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        msg: "Failed to view timesheet",
        error: error,
        success: false,
      });
    }
  },

  updateTimesheet: async (req, res) => {
    try {
      const _id = req.token._id;
      const userTokenId = _id;
      const findUser = await User.findOne({ _id });
      const roleId = findUser.roleId;
      let isAllowed;

      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        const checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "timesheetManagement", "timesheetManagement");
        console.log(isAllowed);
      }

      if (!isAllowed) {
        const data = req.body;
        const id = data._id;

        if (!id) {
          return res.status(400).json({
            msg: "Timesheet record id is required",
            success: false,
          });
        }

        const existingTimesheet = await Timesheets.findOne({ _id: id });

        if (!existingTimesheet) {
          return res.status(404).json({
            msg: "Timesheet not found",
            success: false,
          });
        }

        // For non-admin users, set status to "Pending"
        data.status = data.status;

        const updateTimesheet = await Timesheets.updateOne({ _id: id }, { ...data });

        return res.status(200).json({
          data: updateTimesheet,
          msg: "Timesheet updated",
          success: true,
        });
      } else {
        // Admin user logic to update status to "Approved" or "Declined"
        const data = req.body;
        const id = data._id;
        const idsToFind = id;

        if (!id) {
          return res.status(400).json({
            msg: "Timesheet record id is required",
            success: false,
          });
        }

        const existingTimesheet = await Timesheets.find({ _id: { $in: idsToFind } });

        if (!existingTimesheet) {
          return res.status(404).json({
            msg: "Timesheet not found",
            success: false,
          });
        }

        // Admin user logic to update status based on "approved" field
        if (data.approved === true) {
          data.status = "Approved";
        } else if (data.approved === false) {
          data.status = "Declined";
        } else {
          data.status = data.status;
        }

        // Update the timesheet and capture the result
        const updateData = { ...data };
        const { _id, ...updateDataWithoutId } = updateData;
        // const objectIdsToFind = _id.map((id) => new mongoose.Types.ObjectId(id));
        const objectIdsToFind = Array.isArray(_id)
          ? _id.map((id) => new mongoose.Types.ObjectId(id))
          : [new mongoose.Types.ObjectId(_id)];

        const updateResult = await Timesheets.updateMany(
          { _id: { $in: objectIdsToFind } },
          { $set: updateDataWithoutId }
        );

        const updatedTimesheet = await Timesheets.find({ _id: { $in: objectIdsToFind } });

        if (data.status === "Declined" || data.status === "Approved") {
          // Extract common logic for sending email
          const sendEmail = async (timesheet) => {
            const { userId, reason, status } = timesheet;

            const findUser = await User.findOne({ _id: userId });
            const tokenUser = await User.findOne({ _id: userTokenId });
            const userName = tokenUser.fullName;
            const email = findUser.email;
            const stringUserId = userId.toString();

            // Check userTokenId against userId
            if (userTokenId === stringUserId) {
              return {
                msg: `Unable to ${data.status} Timesheet`,
                error: `You cannot ${data.status.toLowerCase()} your own timesheet.`,
                success: false,
              };
            }
            const weekRegex = /week no (\d+), (\d{2}-\d{2}-\d{4}), (\d{2}-\d{2}-\d{4})/;
            const weekMatch = data.week.match(weekRegex);

            if (!weekMatch) {
              return {
                msg: "Invalid week format",
                success: false,
              };
            }

            const weekNumber = weekMatch[1];
            const startDate = weekMatch[2];
            const endDate = weekMatch[3];

            // Your existing logic to send emails
            await services.sendTimeSheetStatusEmail(email, status, reason, weekNumber, startDate, endDate, userName);
          };

          // Check if at least one timesheet was updated
          if (updateResult.modifiedCount > 0) {
            // Iterate through updated timesheets and send email once
            const firstUpdatedTimesheet = updatedTimesheet[0]; // Assuming there is at least one updated timesheet
            // console.log(firstUpdatedTimesheet);
            const result = await sendEmail(firstUpdatedTimesheet);
            if (result) return res.status(400).json(result);
          }

          // Return the updated timesheet in the response
          return res.status(200).json({
            data: {
              updateResult,
              status: updatedTimesheet[0]?.status,
            },
            msg: "Timesheet updated",
            success: true,
          });
        } else {
          // Handle other status values if needed

          return res.status(200).json({
            data: {
              updateResult,
              status: updatedTimesheet[0]?.status,
            },
            msg: "Timesheet updated",
            success: true,
          });
        }
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        msg: "Failed to update timesheet",
        error: error,
        success: false,
      });
    }
  },

  deleteTimesheet: async (req, res) => {
    try {
      let _id = req.body._id;
      if (!_id) {
        return res.status(400).json({
          msg: "Timesheet record id is required",
          success: false,
        });
      }
      let deleteTimesheet = await Timesheets.findOneAndDelete({ _id });
      if (!deleteTimesheet) {
        return res.status(404).json({
          msg: "No timesheet with this id found",
          success: false,
        });
      }
      return res.status(200).json({
        msg: "Timesheet deleted successfully",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to delete timesheet",
        error: error.message || "Something went wrong.",
        success: false,
      });
    }
  },
};

module.exports = methods;
