let Request = require("../models/requests.model");
const User = require("../models/user.model");
let services = require("../utils/services");
const Attendance = require("../models/attendance.model");
const leavesPolicy = require("../models/leavePolicy.model");
const Permission = require("../models/permissions.model");
const Company = require("../models/company.model");
const moment = require("moment");
const { default: mongoose } = require("mongoose");
const _ = require("mongoose-paginate");

let methods = {
  addRequest: async (req, res) => {
    try {
      let userId = req.token._id;
      let companyId = req.token.companyId;
      let currentDate = new Date(Date.now());
      let findUser = await User.findOne({ _id: userId });
      let checkPermission = await Permission.findOne({
        roleId: findUser.roleId,
      });
      // Calculate the start and end of the current year
      let yearStart = moment(currentDate).startOf("year").format("YYYY-MM-DD");
      let yearEnd = moment(currentDate).endOf("year").format("YYYY-MM-DD");

      console.log("current year",yearStart,yearEnd)

      let isAllowed = services.checkPermissions(checkPermission, "requestManagement", "manageSelfRequest");
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: false,
        });
      }

      let company = await Company.findOne({
        _id: companyId,
        deleted: false,
      });
      if (!company) {
        return res.status(404).send({ message: "Company not found" });
      }

      let workingDays = company?.workingDays?.map(day => day?.toLowerCase());

      let Approvers = [];
      let allPermissions = await Permission.find({ companyId: companyId });
      let allowedUser = allPermissions.map((obj) => {
        obj.permissions.map((subObj) => {
          if (subObj.value == "requestManagement") {
            subObj.subPermissions.map((permCheck) => {
              if (permCheck.value == "viewAllRequest") {
                if (permCheck.checked == true) {
                  Approvers.push(obj.roleId);
                }
              }
            });
          }
        });
      });

      let findApprovers = await User.find({
        roleId: { $in: Approvers },
        companyId: companyId,
        deleted: false
      });
      let approversMail = [];
      for (let i = 0; i < findApprovers.length; i++) {
        let mail = findApprovers[i].email;
        approversMail.push(mail);
      }

      let data = req.body;
      if (!data.startDate || !data.endDate) {
        return res.status(400).json({
          msg: "Start or end date is missing",
          success: false,
        });
      }
      let viewLeavesPolicies = await leavesPolicy.findOne({
        companyId: companyId,
      });
      const { sickLeaves, casualLeaves, workFromHomeLeaves, annualLeaves } = viewLeavesPolicies;

      const totalCompanySickLeave = parseFloat(sickLeaves).toFixed(1);
      const totalCompanyAnnualLeave = parseFloat(annualLeaves).toFixed(1);
      const totalCompanyWfhLeave = parseFloat(workFromHomeLeaves).toFixed(1);
      const totalCompanyCasualLeave = parseFloat(casualLeaves).toFixed(1);

      let requestType = data.requestType;

      if (requestType != "leave") {
        let requestStartDate = data.startDate;
        let requestEndDate = data.endDate
        let checkRequestIfExist = await Request.findOne({
          userId: userId,
          companyId: companyId,
          startDate: requestStartDate,
          deleted: false,
        });
        if (checkRequestIfExist) {
          return res.status(400).json({
            msg: "Request Already exist for today",
            success: false,
          });
        }
        let requestStartingDate = moment(data.startDate);
        let requestEndingDate = moment(data.endDate);

        let appliedNoOfLeaves = 0;
        let currentDate = requestStartingDate.clone();

        while (currentDate.isSameOrBefore(requestEndingDate, "day")) {
          // Check if the current day is not a weekend (Saturday or Sunday)
          // if (currentDate.day() !== 0 && currentDate.day() !== 6) {
          //   appliedNoOfLeaves++;
          // }
          if (workingDays?.includes(currentDate.format('dddd').toLowerCase())) {
            appliedNoOfLeaves++;
          }

          // Move to the next day
          currentDate.add(1, "day");
        }
        // let requestStartingDate = data.startDate;
        // requestStartingDate = new Date(requestStartingDate).getTime();

        // let requestEndingDate = data.endDate;
        // requestEndingDate = new Date(requestEndingDate).getTime();

        if (requestEndingDate < requestStartingDate) {
          return res.status(400).json({
            msg: "Ending Date cannot be less then starting date",
            success: false,
          });
        }

        // let appliedNoOfLeaves = (requestEndingDate - requestStartingDate) / 86400000;

        console.log(appliedNoOfLeaves);

        data.userId = userId;

        let findUser = await User.findOne({ _id: userId });

        let availableSickLeaves = parseFloat(findUser.sickLeaves).toFixed(1);
        let availableCasualLeaves = parseFloat(findUser.casualLeaves).toFixed(1);
        let availableannualLeaves = parseFloat(findUser.annualLeaves).toFixed(1);
        let availableWFH = parseFloat(findUser.workFromHomeLeaves).toFixed(1);

        let remainingWfhLeaves= findUser?.remainingWorkFromHomeLeaves
        let takenWfhLeaves = findUser?.takenWorkFromHomeLeaves

        if (data.requestType == "wfh" && +appliedNoOfLeaves > +remainingWfhLeaves) {
          return res.status(400).json({
            msg: `you applied for ${appliedNoOfLeaves} whereas available number of leaves are less then that or zero`,
            success: true,
          });
        } else {
          remainingWfhLeaves = JSON.stringify(+remainingWfhLeaves - +appliedNoOfLeaves)
          takenWfhLeaves = JSON.stringify(+takenWfhLeaves + +appliedNoOfLeaves)
        }

        data.companyId = companyId;

        let request = new Request(data);

        let addRequest = await request.save();

        let updatedUser = await User.updateOne(
          {_id: userId},
          {
            remainingWorkFromHomeLeaves: remainingWfhLeaves,
            takenWorkFromHomeLeaves: takenWfhLeaves
          },
          {new: true}
        )
        let findRequestee = await User.findOne({ _id: data.userId });
        findRequestee = findRequestee.fullName;

        if (!addRequest) {
          return res.status(404).json({
            msg: "No values found! Request record cant created empty",
            success: false,
          });
        }

        let requestType = data.leaveType;
        let description = data.description;
        let requestId = addRequest._id;

        let remainingWFH= parseFloat(findUser?.remainingWorkFromHomeLeaves).toFixed(1);
        let remainingcasualLeaves = parseFloat(findUser?.remainingCasualLeaves).toFixed(1);
        let remainingsickLeaves = parseFloat(findUser?.remainingSickLeaves).toFixed(1);
        let remainingannualLeaves = parseFloat(findUser?.remainingAnnualLeaves).toFixed(1);
        requestStartDate = moment(requestStartDate).format("DD-MM-YYYY")
        requestEndDate = moment(requestEndDate).format("DD-MM-YYYY")
        await services.sendRequestNotification(
          approversMail,
          findRequestee,
          appliedNoOfLeaves,
          requestStartDate,
          requestEndDate,
          requestType,
          requestId,
          description,
          `${remainingWFH} out of ${availableWFH}`,
          `${remainingannualLeaves} out of ${availableannualLeaves}`,
          `${remainingsickLeaves} out of ${availableSickLeaves}`,
          `${remainingcasualLeaves} out of ${availableCasualLeaves}`
        );

        res.status(200).json({
          Request: addRequest,
          User: updatedUser,
          msg: "Request submitted",
          success: true,
        });
      } else {
        if (!data.leaveType) {
          return res.status(400).json({
            msg: "Leave Type cant be empty",
            success: false,
          });
        }
        let requestStartDate = data.startDate;
        let checkRequestIfExist = await Request.findOne({
          userId: userId,
          companyId: companyId,
          startDate: requestStartDate,
          deleted: false,
        });
        if (checkRequestIfExist) {
          return res.status(400).json({
            msg: "Request Already exist for today",
            success: false,
          });
        }

        let requestStartingDate = data.startDate;
        requestStartingDate = new Date(requestStartingDate).getTime();

        let requestEndDate = data.endDate;
        let requestEndingDate = new Date(requestEndDate).getTime();

        if (requestEndingDate < requestStartingDate) {
          return res.status(400).json({
            msg: "Ending Date cannot be less then starting date",
            success: false,
          });
        }

        if (
          data.leaveType === "sick" ||
          data.leaveType === "casual" ||
          data.leaveType == "bereavement" ||
          data.leaveType == "paternity" ||
          data.leaveType == "maternity" ||
          data.leaveType == "annual" ||
          data.leaveType == "marriage" ||
          data.leaveType == "halfDay"
        ) {
          // let requestStartingDate = data.startDate;
          // requestStartingDate = new Date(requestStartingDate).getTime();

          // let requestEndingDate = data.endDate;
          // requestEndingDate = new Date(requestEndingDate).getTime();
          let requestStartingDate = moment(data.startDate);
          let requestEndingDate = moment(data.endDate);

          let appliedNoOfLeaves = 0;
          let currentDate = requestStartingDate.clone();

          while (currentDate.isSameOrBefore(requestEndingDate, "day")) {
            // Check if the current day is not a weekend (Saturday or Sunday)
            // if (currentDate.day() !== 0 && currentDate.day() !== 6) {
            //   appliedNoOfLeaves++;
            // }
            if (workingDays?.includes(currentDate.format('dddd').toLowerCase())) {
              appliedNoOfLeaves++;
            }

            // Move to the next day
            currentDate.add(1, "day");
          }

          console.log(appliedNoOfLeaves);

          if (requestEndingDate < requestStartingDate) {
            return res.status(400).json({
              msg: "Ending Date cannot be less then starting date",
              success: false,
            });
          }
          let findUser = await User.findOne({ _id: userId });

          let availableSickLeaves = parseFloat(findUser.sickLeaves).toFixed(1);
          let availableCasualLeaves = parseFloat(findUser.casualLeaves).toFixed(1);
          let availableannualLeaves = parseFloat(findUser.annualLeaves).toFixed(1);
          let availableWFH = parseFloat(findUser.workFromHomeLeaves).toFixed(1);
  
          let remainingCasualLeaves= findUser?.remainingCasualLeaves;
          let remainingSickLeaves= findUser?.remainingSickLeaves;
          let remainingBereavementLeaves= findUser?.remainingBereavementLeaves;
          let remainingPaternityLeaves= findUser?.remainingPaternityLeaves;
          let remainingMaternityLeaves= findUser?.remainingMaternityLeaves;
          let remainingMarriageLeaves= findUser?.remainingMarriageLeaves;
          let remainingAnnualLeaves= findUser?.remainingAnnualLeaves;
          let remainingLeaves= findUser?.remainingLeaves;
          
          let takenCasualLeaves = findUser?.takenCasualLeaves;
          let takenSickLeaves = findUser?.takenSickLeaves
          let takenBereavementLeaves = findUser?.takenBereavementLeaves
          let takenPaternityLeaves = findUser?.takenPaternityLeaves
          let takenMaternityLeaves = findUser?.takenMaternityLeaves
          let takenMarriageLeaves = findUser?.takenMarriageLeaves
          let takenAnnualLeaves = findUser?.takenAnnualLeaves
          let takenLeaves = findUser?.takenLeaves
          
          if (
            (data.leaveType == "sick" && +remainingSickLeaves < +appliedNoOfLeaves) ||
            (data.leaveType == "casual" && +remainingCasualLeaves < +appliedNoOfLeaves) ||
            (data.leaveType == "bereavement" && +remainingBereavementLeaves < +appliedNoOfLeaves) ||
            (data.leaveType == "paternity" && +remainingPaternityLeaves < +appliedNoOfLeaves) ||
            (data.leaveType == "maternity" && +remainingMaternityLeaves < +appliedNoOfLeaves) ||
            (data.leaveType == "marriage" && +remainingMarriageLeaves < +appliedNoOfLeaves) ||
            (data.leaveType == "annual" && +remainingAnnualLeaves < +appliedNoOfLeaves)
          ) {
            return res.status(400).json({
              msg: "You leaves limit have reached or you are applying for more then alloted number of leaves",
              success: false,
            });
          } else {
            remainingLeaves = JSON.stringify(+remainingLeaves - +appliedNoOfLeaves);
            takenLeaves = JSON.stringify(+takenLeaves + +appliedNoOfLeaves); 
          if (data.leaveType == "sick") {
            remainingSickLeaves = JSON.stringify(+remainingSickLeaves - +appliedNoOfLeaves);
            takenSickLeaves = JSON.stringify(+takenSickLeaves + +appliedNoOfLeaves);
        } else if (data.leaveType == "casual") {
            remainingCasualLeaves = JSON.stringify(+remainingCasualLeaves - +appliedNoOfLeaves);
            takenCasualLeaves = JSON.stringify(+takenCasualLeaves + +appliedNoOfLeaves);
        } else if (data.leaveType == "bereavement") {
            remainingBereavementLeaves = JSON.stringify(+remainingBereavementLeaves - +appliedNoOfLeaves);
            takenBereavementLeaves = JSON.stringify(+takenBereavementLeaves + +appliedNoOfLeaves);
        } else if (data.leaveType == "paternity") {
            remainingPaternityLeaves = JSON.stringify(+remainingPaternityLeaves - +appliedNoOfLeaves);
            takenPaternityLeaves = JSON.stringify(+takenPaternityLeaves + +appliedNoOfLeaves);
        } else if (data.leaveType == "maternity") {
            remainingMaternityLeaves = JSON.stringify(+remainingMaternityLeaves - +appliedNoOfLeaves);
            takenMaternityLeaves = JSON.stringify(+takenMaternityLeaves + +appliedNoOfLeaves);
        } else if (data.leaveType == "marriage") {
            remainingMarriageLeaves = JSON.stringify(+remainingMarriageLeaves - +appliedNoOfLeaves);
            takenMarriageLeaves = JSON.stringify(+takenMarriageLeaves + +appliedNoOfLeaves);
        } else if (data.leaveType == "annual") {
            remainingAnnualLeaves = JSON.stringify(+remainingAnnualLeaves - +appliedNoOfLeaves);
            takenAnnualLeaves = JSON.stringify(+takenAnnualLeaves + +appliedNoOfLeaves);
        }
          }

          let latestAttendance = await Attendance.findOne({
            userId: userId,
            attendanceDate: {$gte: data.startDate, $lte: data.endDate},
            deleted: false,
            status: { $in: ["Present", "Late"] }
          });

          if (latestAttendance) {
            return res.status(400).json({
              msg: "Your attendance is already marked for the selected days",
              success: false,
            });
          }

          data.userId = userId;

          let request = new Request(data);

          let addRequest = await request.save();

          let updatedUser = await User.updateOne(
            {_id: userId},
            {
              remainingCasualLeaves : remainingCasualLeaves,   
              remainingSickLeaves : remainingSickLeaves,
              remainingBereavementLeaves : remainingBereavementLeaves,
              remainingPaternityLeaves : remainingPaternityLeaves,
              remainingMaternityLeaves : remainingMaternityLeaves,
              remainingMarriageLeaves : remainingMarriageLeaves,
              remainingAnnualLeaves : remainingAnnualLeaves,
              remainingLeaves: remainingLeaves,
              takenCasualLeaves : takenCasualLeaves,    
              takenSickLeaves : takenSickLeaves,
              takenBereavementLeaves : takenBereavementLeaves,
              takenPaternityLeaves : takenPaternityLeaves,
              takenMaternityLeaves : takenMaternityLeaves,
              takenMarriageLeaves : takenMarriageLeaves,
              takenAnnualLeaves : takenAnnualLeaves,
              takenLeaves : takenLeaves
            },
            {new: true}
          )

          let findRequestee = await User.findOne({ _id: data.userId });
          findRequestee = findRequestee.fullName;

          if (!addRequest) {
            return res.status(404).json({
              msg: "No values found! Request record cant created empty",
              success: false,
            });
          }

          let requestType = data.leaveType;
          let requestId = addRequest._id;
          let description = data.description;

          let remainingWFH= parseFloat(findUser?.remainingWorkFromHomeLeaves).toFixed(1);
          let remainingcasualLeaves = parseFloat(findUser?.remainingCasualLeaves).toFixed(1);
          let remainingsickLeaves = parseFloat(findUser?.remainingSickLeaves).toFixed(1);
          let remainingannualLeaves = parseFloat(findUser?.remainingAnnualLeaves).toFixed(1);
          requestStartDate = moment(requestStartDate).format("DD-MM-YYYY")
          requestEndDate = moment(requestEndDate).format("DD-MM-YYYY")
          await services.sendRequestNotification(
            approversMail,
            findRequestee,
            appliedNoOfLeaves,
            requestStartDate,
            requestEndDate,
            requestType,
            requestId,
            description,
            `${remainingWFH} out of ${availableWFH}`,
            `${remainingannualLeaves} out of ${availableannualLeaves}`,
            `${remainingsickLeaves} out of ${availableSickLeaves}`,
            `${remainingcasualLeaves} out of ${availableCasualLeaves}`
          );

          res.status(200).json({
            Request: addRequest,
            User: updatedUser,
            msg: "Request submitted",
            success: true,
          });
        } else {
          data.userId = userId;

          let request = new Request(data);

          let addRequest = await request.save();
          let findRequestee = await User.findOne({ _id: data.userId });
          findRequestee = findRequestee.fullName;

          if (!addRequest) {
            return res.status(404).json({
              msg: "No values found! Request record cant created empty",
              success: false,
            });
          }

          let requestType = data.leaveType;
          let requestId = addRequest._id;
          let description = data.description;

          await services.sendRequestNotification(approversMail, findRequestee, requestType, requestId, description);

          res.status(200).json({
            Request: addRequest,
            msg: "Request submitted",
            success: true,
          });
        }
      }
    } catch (error) {
      res.status(500).json({
        msg: "Failed to add request",
        error: error.message,
        success: false,
      });
    }
  },

  viewSelfRequest: async (req, res) => {
    try {
      let userId = req.token._id;
      let companyId = req.token.companyId;
      let findUser = await User.findOne({ _id: userId });
      let currentDate = new Date(Date.now());
      // Calculate the start and end of the current year
      let yearStart = moment(currentDate).startOf("year").format("YYYY-MM-DD");
      let yearEnd = moment(currentDate).endOf("year").format("YYYY-MM-DD");

      console.log("current year",yearStart,yearEnd)

      let checkPermission = await Permission.findOne({
        roleId: findUser.roleId,
      });
      let isAllowed = services.checkPermissions(checkPermission, "requestManagement", "viewSelfRequest");
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: false,
        });
      }

      if (!findUser) {
        return res.status(404).json({
          msg: "No user found with given specific id ",
          success: false,
        });
      }

      let company = await Company.findOne({
        _id: companyId,
        deleted: false,
      });
      if (!company) {
        return res.status(404).send({ message: "Company not found" });
      }

      let workingDays = company?.workingDays?.map(day => day?.toLowerCase());

      const paginateOptions =
        req.query.page && req.query.limit
          ? { page: req.query.page, limit: req.query.limit }
          : {
              page: 1,
              limit: 10,
            };

      var options = {
        ...paginateOptions,
        sort: { createdAt: -1 },
        // deleted: false,
        populate: {
          path: "approvedBy",
          select: "imageUrl fullName",
        },
      };

      let findRequest = await Request.paginate(
        {
          userId: userId,
          // deleted: false,
        },
        {
          ...options,
        }
      );

      if (!findRequest) {
        findRequest = "";
      }

      let pendingRequests = await Request?.countDocuments({
        userId: userId,
        deleted: false,
        status: "Pending",
      });

      let approvedRequests = await Request?.countDocuments({
        userId: userId,
        deleted: false,
        status: "Approved",
      });

      let declinedRequests = await Request?.countDocuments({
        userId: userId,
        deleted: false,
        status: "Declined",
      });

      let casualLeaves= findUser?.casualLeaves;
      let sickLeaves= findUser?.sickLeaves;
      let wfhLeaves= findUser?.workFromHomeLeaves;

      let remainingLeaves = findUser?.remainingLeaves;

      let remainingCasualLeaves = findUser?.remainingCasualLeaves;
      let remainingSickLeaves= findUser?.remainingSickLeaves;
      let remainingWfhLeaves= findUser?.remainingWorkFromHomeLeaves;
      
      res.status(200).json({
        casualLeaves: casualLeaves,
        sickLeaves: sickLeaves,
        wfhLeaves: wfhLeaves,
        SelfRequests: findRequest,
        remainingLeaves: remainingLeaves,
        remainingCasualLeaves: remainingCasualLeaves,
        remainingSickLeaves: remainingSickLeaves,
        remainingWfhLeaves: remainingWfhLeaves,
        pendingRequests: pendingRequests,
        approvedRequests: approvedRequests,
        declinedRequests: declinedRequests,
        workingDays: workingDays,
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to view self requests",
        error: error.message,
        success: false,
      });
    }
  },

  viewSelfRequestDashboard: async (req, res) => {
    try {
      let userId = req.token._id;
      let companyId = req.token.companyId;
      const { page = 1, limit = 6 } = req.query;
      const skip = (page - 1) * limit;
      let currentDate = new Date(Date.now());
      const todayFormatted = moment(currentDate).format("-MM-DD");
      
      let todayBirthdays = await User.find({
        companyId: companyId,
        deleted: false,
        dateOfBirth: { $regex: todayFormatted },
      }).select("fullName dateOfBirth imageUrl");
      
      let workAnniversary = await User.find({
        companyId: companyId,
        deleted: false,
        joiningDate: { $regex: todayFormatted },
      }).select("fullName joiningDate imageUrl");

      let findUser = await User.findOne({ _id: userId });

      let checkPermission = await Permission.findOne({
        roleId: findUser.roleId,
      });
      let isAllowed = services.checkPermissions(checkPermission, "requestManagement", "viewSelfRequest");
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: false,
        });
      }

      if (!findUser) {
        return res.status(404).json({
          msg: "No user found with given specific id ",
          success: false,
        });
      }

      let findRequest = await Request.find(
        {
          userId: userId,
          status: { $in: ["Approved", "Declined"] },
          deleted: false,
        }
        // {
        //   ...options,
        // }
      ).sort({ createdAt: -1 }).limit(50);

      if (!findRequest) {
        findRequest = "";
      }
      
      res.status(200).json({
        SelfRequests: findRequest,
        workAnniversary: workAnniversary,
        todayBirthdays: todayBirthdays,
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to view self requests",
        error: error.message,
        success: false,
      });
    }
  },

  viewAllRequest: async (req, res) => {
    try {
      let userId = req.token._id;
      let leaveType = req.query.leaveType;
      let status = req.query.status;
      let employeeName = req.query.employeeName;
      let requestFrom = req.query.requestFrom;
      let requestTo = req.query.requestTo;
      let findUser = await User.findOne({ _id: userId });
      let companyId = req.token.companyId;

      const paginateOptions =
        req.query.page && req.query.limit
          ? { page: req.query.page, limit: req.query.limit }
          : {
              page: 1,
              limit: 10,
            };

      var options = {
        ...paginateOptions,
        sort: { createdAt: -1 },
        deleted: false,
      };

      // let findUser = await User.findOne({ _id });
      let roleId = findUser.roleId;
      let viewAllRequestPermission;
      let viewTeamRequestPermission;
      if (findUser.role === "admin" || !roleId) {
        viewAllRequestPermission = true;
        viewTeamRequestPermission = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({
          roleId: findUser.roleId,
        });

        checkPermission.permissions.map((obj) => {
          if (obj.value === "requestManagement") {
            obj.subPermissions.map((subObj) => {
              if (subObj.value === "viewAllRequest") {
                viewAllRequestPermission = subObj.checked;
              }
              if (subObj.value === "teamRequest") {
                viewTeamRequestPermission = subObj.checked;
              }
            });
          }
        });
      }

      if (viewTeamRequestPermission && !viewAllRequestPermission) {
        let findTeamUser = await User.find({ teamLead: userId });
        let arr = [];

        for (let i = 0; i < findTeamUser.length; i++) {
          let uId = findTeamUser[i]._id;
          arr.push(uId);
        }

        const requestFilter = {};

        if (leaveType) {
          requestFilter.leaveType = leaveType;
        }
        if (status) {
          requestFilter.status = status;
        }

        if (requestFrom && requestTo) {
          requestFilter.createdAt = {
            $gte: new Date(requestFrom),
            $lte: new Date(requestTo),
          };
        }

        const pipeline = [
          {
            $match: {
              companyId: new mongoose.Types.ObjectId(companyId),
              userId: { $in: arr }, // Filter by userId array
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "user",
            },
          },
          {
            $unwind: {
              path: "$user",
            },
          },
          {
            $match: {
              ...requestFilter,
              deleted: false,
              "user.fullName": {
                $regex: employeeName ? new RegExp(employeeName, "i") : new RegExp(".*"),
              },
            },
          },
          {
            $project: {
              _id: 1,
              userId: 1,
              companyId: 1,
              requestType: 1,
              leaveType: 1,
              startDate: 1,
              endDate: 1,
              status: 1,
              description: 1,
              approvedBy: 1,
              createdAt: 1,

              user: {
                _id: "$user._id",
                fullName: "$user.fullName",
                imageUrl: "$user.imageUrl",
                remainingSickLeaves: "$user.sickLeaves",
                remainingCasualLeaves: "$user.casualLeaves",
                remainingAnnualLeaves: "$user.annualLeaves",
                remainingWfhLeaves: "$user.workFromHomeLeaves",
              },
            },
          },
          {
            $sort: {
              createdAt: -1, // Sort in descending order (latest request first)
            },
          },
        ];

        const result = await Request.aggregatePaginate(Request.aggregate(pipeline), paginateOptions);

        return res.status(200).json({
          Requests: result,
          success: true,
        });
      } else if (
        (viewAllRequestPermission && viewTeamRequestPermission) ||
        (viewAllRequestPermission && !viewTeamRequestPermission)
      ) {
        const requestFilter = {};

        if (leaveType) {
          requestFilter.leaveType = leaveType;
        }
        if (status) {
          requestFilter.status = status;
        }

        if (requestFrom && requestTo) {
          requestFilter.createdAt = {
            $gte: new Date(requestFrom),
            $lte: new Date(requestTo),
          };
        }

        const pipeline = [
          {
            $match: {
              companyId: new mongoose.Types.ObjectId(companyId),
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "user",
            },
          },
          {
            $unwind: "$user",
          },
          {
            $lookup: {
              from: "users",
              localField: "approvedBy",
              foreignField: "_id",
              as: "approver",
            },
          },
          {
            $unwind: {
              path: "$approver",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: {
              "user.fullName": {
                $regex: employeeName ? new RegExp(employeeName, "i") : new RegExp(".*"),
              },
              ...requestFilter,
            },
          },
          {
            $project: {
              _id: 1,
              userId: 1,
              companyId: 1,
              requestType: 1,
              leaveType: 1,
              startDate: 1,
              endDate: 1,
              status: 1,
              totalDays: 1,
              description: 1,
              approvedBy: 1,
              createdAt: 1,
              user: {
                _id: "$user._id",
                fullName: "$user.fullName",
                imageUrl: "$user.imageUrl",
                sickLeaves: "$user.sickLeaves",
                casualLeaves: "$user.casualLeaves",
                annualLeaves: "$user.annualLeaves",
                wfhLeaves: "$user.workFromHomeLeaves",
                remainingSickLeaves: "$user.remainingSickLeaves",
                remainingCasualLeaves: "$user.remainingCasualLeaves",
                remainingAnnualLeaves: "$user.remainingAnnualLeaves",
                remainingWfhLeaves: "$user.remainingWorkFromHomeLeaves",
              },
              approver: {
                $cond: {
                  if: {
                    $or: [{ $eq: ["$approvedBy", ""] }, { $eq: ["$approvedBy", null] }],
                  },
                  then: null,
                  else: {
                    _id: "$approver._id",
                    fullName: "$approver.fullName",
                    imageUrl: "$approver.imageUrl",
                  },
                },
              },
            },
          },
          {
            $sort: {
              createdAt: -1, // Sort in descending order (latest request first)
            },
          },
        ];

        // Execute the pipeline and pagination here

        const result = await Request.aggregatePaginate(Request.aggregate(pipeline), paginateOptions);

        let totalEmployee = await User?.countDocuments({
          companyId: companyId,
          deleted: false,
        });

        let today = new Date(Date.now());
        let todayDate = moment(today).format("YYYY-MM-DD");

        let sickLeavesRequest = await Request?.countDocuments({
          companyId: companyId,
          deleted: false,
          leaveType: "sick",
          status: "Pending",
        });

        let casualLeavesRequest = await Request?.countDocuments({
          companyId: companyId,
          deleted: false,
          leaveType: "casual",
          status: "Pending",
        });

        let wfhRequests = await Request?.countDocuments({
          companyId: companyId,
          deleted: false,
          requestType: "wfh",
          status: "Pending",
        });

        let pendingRequests = await Request?.countDocuments({
          companyId: companyId,
          deleted: false,
          status: "Pending",
        });
        let viewLeavesPolicies = await leavesPolicy?.findOne({
          companyId: companyId,
        });

        // let sickLeaves, casualLeaves, workFromHomeLeaves, annualLeaves = "0"
        // if (!viewLeavesPolicies) {
        //   sickLeaves, casualLeaves, workFromHomeLeaves, annualLeaves = "0"
        // }
        // else {
        const sickLeaves = viewLeavesPolicies?.sickLeaves;
        const casualLeaves = viewLeavesPolicies?.casualLeaves;
        const workFromHomeLeaves = viewLeavesPolicies?.workFromHomeLeaves;
        const annualLeaves = viewLeavesPolicies?.annualLeaves;
        //}

        return res.status(200).json({
          Requests: result,
          totalCompanySickLeave: sickLeaves,
          totalCompanyAnnualLeave: annualLeaves,
          totalCompanyWfhLeave: workFromHomeLeaves,
          totalCompanyCasualLeave: casualLeaves,
          pendingRequests: pendingRequests,
          sickLeaves: sickLeavesRequest,
          casualLeaves: casualLeavesRequest,
          wfhRequests: wfhRequests,
          totalEmployee: totalEmployee,
          success: true,
        });
      } else {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: false,
        });
      }
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to view All requests",
        error: error.message,
        success: false,
      });
    }
  },

  updateRequest: async (req, res) => {
    try {
      let userId = req.token._id;
      let companyId = req.token.companyId;
      let company = await Company.findOne({
        _id: companyId,
        deleted: false,
      });
      if (!company) {
        return res.status(404).send({ message: "Company not found" });
      }
      console.log("User id in update request start",userId);
      
      let workingDays = company?.workingDays?.map(day => day?.toLowerCase());

      let approver = await User.findOne({ _id: userId });

      if (!approver) {
        return res.status(400).json({
          msg: "Unauthorized User! No record of the User found",
          success: false,
        });
      }

      let approverRole = approver?._id;

      let updateSelfRequest;
      let approveRequest;

      if (approver.role === "admin") {
        // isAllowed = true;
        updateSelfRequest = true;
        approveRequest = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({
          roleId: approver.roleId,
        });

        checkPermission.permissions.map((obj) => {
          if (obj.value === "requestManagement") {
            obj.subPermissions.map((subObj) => {
              if (subObj.value === "manageSelfRequest") {
                updateSelfRequest = subObj.checked;
              }
              if (subObj.value === "requestApproval") {
                approveRequest = subObj.checked;
              }
            });
          }
        });
      }

      let data = req.body;

      let _id = data._id;
      if (!_id) {
        return res.status(400).json({
          msg: "Provide the id of request to update the request record",
          success: false,
        });
      }

      let findRequest = await Request.findOne({ _id: _id }, { deleted: false });

      if (!findRequest) {
        return res.status(404).json({
          msg: "Request with this id not found",
          success: false,
        });
      }
      if (findRequest.status == "Approved" || findRequest.status == "Declined") {
        return res.status(400).json({
          msg: `Request already ${findRequest.status}`,
        });
      }

        // let requestStartingDate = data.startDate;
        // requestStartingDate = new Date(requestStartingDate).getTime();

        // let requestEndingDate = data.endDate;
        // requestEndingDate = new Date(requestEndingDate).getTime();
        let requestStartingDate = moment(data.startDate);
        let requestEndingDate = moment(data.endDate);

        let appliedNoOfLeaves = 0;
        let nowDate = requestStartingDate.clone();

        while (nowDate.isSameOrBefore(requestEndingDate, "day")) {
          // Check if the current day is not a weekend (Saturday or Sunday)
          // if (nowDate.day() !== 0 && nowDate.day() !== 6) {
          //   appliedNoOfLeaves++;
          // }
          if (workingDays?.includes(nowDate.format('dddd').toLowerCase())) {
            appliedNoOfLeaves++;
          }

          // Move to the next day
          nowDate.add(1, "day");
        }

        console.log(appliedNoOfLeaves);

        if (requestEndingDate < requestStartingDate) {
          return res.status(400).json({
            msg: "Ending Date cannot be less then starting date",
            success: false,
          });
        }

        // let appliedNoOfLeaves = (requestEndingDate - requestStartingDate) / 86400000;
        // let appliedNoOfLeaves = data.totalDays;
        let findUser = await User.findOne({ _id: userId});

        let availableSickLeaves = parseFloat(findUser.sickLeaves).toFixed(1);
        let availableCasualLeaves = parseFloat(findUser.casualLeaves).toFixed(1);
        let availableAnnualLeaves = parseFloat(findUser.annualLeaves).toFixed(1);
        let availableWFH = parseFloat(findUser.workFromHomeLeaves).toFixed(1);
        let availableBereavementLeaves = findUser?.bereavementLeaves;
        let availablePaternityLeaves = findUser?.paternityLeaves;
        let availableMaternityLeaves = findUser?.maternityLeaves;
        let availableMarriageLeaves = findUser?.marriageLeaves;
         
        let remainingCasualLeaves= findUser?.remainingCasualLeaves;
        let remainingSickLeaves= findUser?.remainingSickLeaves;
        let remainingWfhLeaves= findUser?.remainingWorkFromHomeLeaves;
        let remainingBereavementLeaves= findUser?.remainingBereavementLeaves;
        let remainingPaternityLeaves= findUser?.remainingPaternityLeaves;
        let remainingMaternityLeaves= findUser?.remainingMaternityLeaves;
        let remainingMarriageLeaves= findUser?.remainingMarriageLeaves;
        let remainingAnnualLeaves= findUser?.remainingAnnualLeaves;
        let remainingLeaves= findUser?.remainingLeaves

        let takenCasualLeaves = findUser?.takenCasualLeaves
        let takenSickLeaves = findUser?.takenSickLeaves
        let takenWfhLeaves = findUser?.takenWorkFromHomeLeaves
        let takenBereavementLeaves = findUser?.takenBereavementLeaves
        let takenPaternityLeaves = findUser?.takenPaternityLeaves
        let takenMaternityLeaves = findUser?.takenMaternityLeaves
        let takenMarriageLeaves = findUser?.takenMarriageLeaves
        let takenAnnualLeaves = findUser?.takenAnnualLeaves
        let takenLeaves= findUser?.takenLeaves
        if(data.status == "Pending" || !data.status)  {
        if(data?.leaveType == findRequest?.leaveType && appliedNoOfLeaves != findRequest?.totalDays){

          data.leaveType == "sick" ? (remainingSickLeaves = +remainingSickLeaves + +findRequest?.totalDays, takenSickLeaves= +takenSickLeaves - +findRequest?.totalDays) :
          data.leaveType == "casual" ? (remainingCasualLeaves = +remainingCasualLeaves + +findRequest?.totalDays, takenCasualLeaves= +takenCasualLeaves - +findRequest?.totalDays) :
          data.leaveType == "bereavement" ? (remainingBereavementLeaves = +remainingBereavementLeaves + +findRequest?.totalDays, takenBereavementLeaves= +takenBereavementLeaves - +findRequest?.totalDays) :
          data.leaveType == "paternity" ? (remainingPaternityLeaves = +remainingPaternityLeaves + +findRequest?.totalDays, takenPaternityLeaves= +takenPaternityLeaves - +findRequest?.totalDays) :
          data.leaveType == "maternity" ? (remainingMaternityLeaves = +remainingMaternityLeaves + +findRequest?.totalDays, takenMaternityLeaves= +takenMaternityLeaves - +findRequest?.totalDays) :
          data.leaveType == "marriage" ? (remainingMarriageLeaves = +remainingMarriageLeaves + +findRequest?.totalDays, takenMarriageLeaves= +takenMarriageLeaves - +findRequest?.totalDays) :
          data.leaveType == "annual" ? (remainingAnnualLeaves = +remainingAnnualLeaves + +findRequest?.totalDays, takenAnnualLeaves= +takenAnnualLeaves - +findRequest?.totalDays) :
          data.leaveType == "wfh" ? (remainingWfhLeaves = +remainingWfhLeaves + +findRequest?.totalDays, takenWfhLeaves= +takenWfhLeaves - +findRequest?.totalDays) : null;
          if (
            (data.leaveType == "sick" && (+remainingSickLeaves < +appliedNoOfLeaves || +remainingSickLeaves > +availableSickLeaves)) ||
            (data.leaveType == "casual" && (+remainingCasualLeaves < +appliedNoOfLeaves || +remainingCasualLeaves > +availableCasualLeaves)) ||
            (data.leaveType == "bereavement" && (+remainingBereavementLeaves < +appliedNoOfLeaves || +remainingBereavementLeaves > +availableBereavementLeaves)) ||
            (data.leaveType == "paternity" && (+remainingPaternityLeaves < +appliedNoOfLeaves || +remainingPaternityLeaves > +availablePaternityLeaves)) ||
            (data.leaveType == "maternity" && (+remainingMaternityLeaves < +appliedNoOfLeaves || +remainingMaternityLeaves > +availableMaternityLeaves)) ||
            (data.leaveType == "marriage" && (+remainingMarriageLeaves < +appliedNoOfLeaves || +remainingMarriageLeaves > +availableMarriageLeaves)) ||
            (data.leaveType == "annual" && (+remainingAnnualLeaves < +appliedNoOfLeaves || +remainingAnnualLeaves > +availableAnnualLeaves)) ||
            (data.leaveType == "wfh" && (+remainingWfhLeaves < +appliedNoOfLeaves || +remainingWfhLeaves > +availableWFH))
          ) {
            return res.status(400).json({
              msg: "You leaves limit have reached or you are applying for more then alloted number of leaves",
              success: false,
            });
          }
        else {
          if (data.requestType == "leave"){
          remainingLeaves = +remainingLeaves + +findRequest?.totalDays
          takenLeaves= +takenLeaves - +findRequest?.totalDays
          remainingLeaves = JSON.stringify(+remainingLeaves - +appliedNoOfLeaves);
          takenLeaves = JSON.stringify(+takenLeaves + +appliedNoOfLeaves);
        }
          if (data.leaveType == "sick") {
            remainingSickLeaves = JSON.stringify(+remainingSickLeaves - +appliedNoOfLeaves);
            takenSickLeaves = JSON.stringify(+takenSickLeaves + +appliedNoOfLeaves);
        } else if (data.leaveType == "casual") {
            remainingCasualLeaves = JSON.stringify(+remainingCasualLeaves - +appliedNoOfLeaves);
            takenCasualLeaves = JSON.stringify(+takenCasualLeaves + +appliedNoOfLeaves);
        } else if (data.leaveType == "wfh") {
            remainingWfhLeaves = JSON.stringify(+remainingWfhLeaves - +appliedNoOfLeaves);
            takenWfhLeaves = JSON.stringify(+takenWfhLeaves + +appliedNoOfLeaves);
        } else if (data.leaveType == "bereavement") {
            remainingBereavementLeaves = JSON.stringify(+remainingBereavementLeaves - +appliedNoOfLeaves);
            takenBereavementLeaves = JSON.stringify(+takenBereavementLeaves + +appliedNoOfLeaves);
        } else if (data.leaveType == "paternity") {
            remainingPaternityLeaves = JSON.stringify(+remainingPaternityLeaves - +appliedNoOfLeaves);
            takenPaternityLeaves = JSON.stringify(+takenPaternityLeaves + +appliedNoOfLeaves);
        } else if (data.leaveType == "maternity") {
            remainingMaternityLeaves = JSON.stringify(+remainingMaternityLeaves - +appliedNoOfLeaves);
            takenMaternityLeaves = JSON.stringify(+takenMaternityLeaves + +appliedNoOfLeaves);
        } else if (data.leaveType == "marriage") {
            remainingMarriageLeaves = JSON.stringify(+remainingMarriageLeaves - +appliedNoOfLeaves);
            takenMarriageLeaves = JSON.stringify(+takenMarriageLeaves + +appliedNoOfLeaves);
        } else if (data.leaveType == "annual") {
            remainingAnnualLeaves = JSON.stringify(+remainingAnnualLeaves - +appliedNoOfLeaves);
            takenAnnualLeaves = JSON.stringify(+takenAnnualLeaves + +appliedNoOfLeaves);
        }
      }
      } else if(data?.leaveType != findRequest?.leaveType){

          if (
            (data.leaveType == "sick" && +remainingSickLeaves < +appliedNoOfLeaves) ||
            (data.leaveType == "casual" && +remainingCasualLeaves < +appliedNoOfLeaves) ||
            (data.leaveType == "bereavement" && +remainingBereavementLeaves < +appliedNoOfLeaves) ||
            (data.leaveType == "paternity" && +remainingPaternityLeaves < +appliedNoOfLeaves) ||
            (data.leaveType == "maternity" && +remainingMaternityLeaves < +appliedNoOfLeaves) ||
            (data.leaveType == "marriage" && +remainingMarriageLeaves < +appliedNoOfLeaves) ||
            (data.leaveType == "annual" && +remainingAnnualLeaves < +appliedNoOfLeaves) ||
            (data.leaveType == "wfh" && +remainingWfhLeaves < +appliedNoOfLeaves)
          ) {
            return res.status(400).json({
              msg: "You leaves limit have reached or you are applying for more then alloted number of leaves",
              success: false,
            });
          } else {
            remainingLeaves = findRequest?.leaveType != 'wfh' ? (+remainingLeaves + +findRequest?.totalDays) : +remainingLeaves;
            takenLeaves= findRequest?.leaveType != 'wfh' ? (+takenLeaves - +findRequest?.totalDays) : +takenLeaves
            if (data.requestType == "leave"){
              remainingLeaves = JSON.stringify(+remainingLeaves - +appliedNoOfLeaves);
              takenLeaves = JSON.stringify(+takenLeaves + +appliedNoOfLeaves);
            }
          if (data.leaveType == "sick") {
            remainingSickLeaves = JSON.stringify(+remainingSickLeaves - +appliedNoOfLeaves);
            takenSickLeaves = JSON.stringify(+takenSickLeaves + +appliedNoOfLeaves);
        } else if (data.leaveType == "casual") {
            remainingCasualLeaves = JSON.stringify(+remainingCasualLeaves - +appliedNoOfLeaves);
            takenCasualLeaves = JSON.stringify(+takenCasualLeaves + +appliedNoOfLeaves);
        } else if (data.leaveType == "wfh") {
            remainingWfhLeaves = JSON.stringify(+remainingWfhLeaves - +appliedNoOfLeaves);
            takenWfhLeaves = JSON.stringify(+takenWfhLeaves + +appliedNoOfLeaves);
        } else if (data.leaveType == "bereavement") {
            remainingBereavementLeaves = JSON.stringify(+remainingBereavementLeaves - +appliedNoOfLeaves);
            takenBereavementLeaves = JSON.stringify(+takenBereavementLeaves + +appliedNoOfLeaves);
        } else if (data.leaveType == "paternity") {
            remainingPaternityLeaves = JSON.stringify(+remainingPaternityLeaves - +appliedNoOfLeaves);
            takenPaternityLeaves = JSON.stringify(+takenPaternityLeaves + +appliedNoOfLeaves);
        } else if (data.leaveType == "maternity") {
            remainingMaternityLeaves = JSON.stringify(+remainingMaternityLeaves - +appliedNoOfLeaves);
            takenMaternityLeaves = JSON.stringify(+takenMaternityLeaves + +appliedNoOfLeaves);
        } else if (data.leaveType == "marriage") {
            remainingMarriageLeaves = JSON.stringify(+remainingMarriageLeaves - +appliedNoOfLeaves);
            takenMarriageLeaves = JSON.stringify(+takenMarriageLeaves + +appliedNoOfLeaves);
        } else if (data.leaveType == "annual") {
            remainingAnnualLeaves = JSON.stringify(+remainingAnnualLeaves - +appliedNoOfLeaves);
            takenAnnualLeaves = JSON.stringify(+takenAnnualLeaves + +appliedNoOfLeaves);
        }

        if (findRequest.leaveType == "sick") {
          remainingSickLeaves = JSON.stringify(+remainingSickLeaves + +findRequest?.totalDays);
          takenSickLeaves = JSON.stringify(+takenSickLeaves - +findRequest?.totalDays);
      } else if (findRequest.leaveType == "casual") {
          remainingCasualLeaves = JSON.stringify(+remainingCasualLeaves + +findRequest?.totalDays);
          takenCasualLeaves = JSON.stringify(+takenCasualLeaves - +findRequest?.totalDays);
      } else if (findRequest.leaveType == "wfh") {
          remainingWfhLeaves = JSON.stringify(+remainingWfhLeaves + +findRequest?.totalDays);
          takenWfhLeaves = JSON.stringify(+takenWfhLeaves - +findRequest?.totalDays);
      } else if (findRequest.leaveType == "bereavement") {
          remainingBereavementLeaves = JSON.stringify(+remainingBereavementLeaves + +findRequest?.totalDays);
          takenBereavementLeaves = JSON.stringify(+takenBereavementLeaves - +findRequest?.totalDays);
      } else if (findRequest.leaveType == "paternity") {
          remainingPaternityLeaves = JSON.stringify(+remainingPaternityLeaves + +findRequest?.totalDays);
          takenPaternityLeaves = JSON.stringify(+takenPaternityLeaves - +findRequest?.totalDays);
      } else if (findRequest.leaveType == "maternity") {
          remainingMaternityLeaves = JSON.stringify(+remainingMaternityLeaves + +findRequest?.totalDays);
          takenMaternityLeaves = JSON.stringify(+takenMaternityLeaves - +findRequest?.totalDays);
      } else if (findRequest.leaveType == "marriage") {
          remainingMarriageLeaves = JSON.stringify(+remainingMarriageLeaves + +findRequest?.totalDays);
          takenMarriageLeaves = JSON.stringify(+takenMarriageLeaves - +findRequest?.totalDays);
      } else if (findRequest.leaveType == "annual") {
          remainingAnnualLeaves = JSON.stringify(+remainingAnnualLeaves + +findRequest?.totalDays);
          takenAnnualLeaves = JSON.stringify(+takenAnnualLeaves - +findRequest?.totalDays);
      }
        
      }
    }
    let updatedUser = await User.updateOne(
      {_id: userId},
      {
        remainingCasualLeaves : remainingCasualLeaves,   
        remainingSickLeaves : remainingSickLeaves,
        remainingWorkFromHomeLeaves: remainingWfhLeaves,
        remainingBereavementLeaves : remainingBereavementLeaves,
        remainingPaternityLeaves : remainingPaternityLeaves,
        remainingMaternityLeaves : remainingMaternityLeaves,
        remainingMarriageLeaves : remainingMarriageLeaves,
        remainingAnnualLeaves : remainingAnnualLeaves,
        remainingLeaves: remainingLeaves,
        takenCasualLeaves : takenCasualLeaves,    
        takenSickLeaves : takenSickLeaves,
        takenWorkFromHomeLeaves: takenWfhLeaves,
        takenBereavementLeaves : takenBereavementLeaves,
        takenPaternityLeaves : takenPaternityLeaves,
        takenMaternityLeaves : takenMaternityLeaves,
        takenMarriageLeaves : takenMarriageLeaves,
        takenAnnualLeaves : takenAnnualLeaves,
        takenLeaves: takenLeaves
      },
      {new: true}
    )
  }
      
      let approvee = JSON.stringify(approver._id);
      let requestee = JSON.stringify(findRequest.userId);

      if (updateSelfRequest && !approveRequest) {
        let _id = data._id;

        delete data.status;

        if (!data.startDate) {
          return res.status(400).json({
            msg: "Start Date of request cannot be set empty",
            success: false,
          });
        }
        if (!data.endDate) {
          return res.status(400).json({
            msg: "End Date of request cannot be set empty",
            success: false,
          });
        }

        data.status = "Pending";
        data.approverRole = "";

        let requestStartingDate = data.startDate;
        requestStartingDate = new Date(requestStartingDate).getTime();

        let requestEndingDate = data.endDate;
        requestEndingDate = new Date(requestEndingDate).getTime();

        if (requestEndingDate < requestStartingDate) {
          return res.status(400).json({
            msg: "Ending Date cannot be less then starting date",
            success: false,
          });
        }
        
        

        let updateRequest = await Request.findOneAndUpdate({ _id: _id }, data);

        return res.status(200).json({
          Request: updateRequest,
          // User: updatedUser,
          success: true,
        });
      } else if (updateSelfRequest && approveRequest) {
        console.log("CTO");
        if (approvee === requestee) {
          let _id = data._id;

          if (!data.startDate) {
            return res.status(400).json({
              msg: "Start Date of request cannot be set empty",
              success: false,
            });
          }
          if (!data.endDate) {
            return res.status(400).json({
              msg: "End Date of request cannot be set empty",
              success: false,
            });
          }

          delete data.status;

          data.status = "Pending";

          let requestStartingDate = data.startDate;
          requestStartingDate = new Date(requestStartingDate).getTime();

          let requestEndingDate = data.endDate;
          requestEndingDate = new Date(requestEndingDate).getTime();

          if (requestEndingDate < requestStartingDate) {
            return res.status(400).json({
              msg: "Ending Date cannot be less then starting date",
              success: false,
            });
          }

          let updateRequest = await Request.findOneAndUpdate({ _id: _id }, data);

          return res.status(200).json({
            Request: updateRequest,
            success: true,
          });
        } else {
          let status = data.status;

          let requestId = data._id;

          let findRequest = await Request.findOne({
            _id: requestId,
          }).populate("userId");

          if (!findRequest) {
            return res.status(404).json({
              msg: "Request with this id not found",
              success: false,
            });
          } else {
            let status = data.status;
            let requestId = findRequest._id;

            // Check if the status is "declined"
            if (status === "Declined") {
              // Check if the user has attendance for that day
              let currentDate = new Date(findRequest.startDate);
              let attendanceDate = moment(currentDate).format("YYYY-MM-DD");
              let currentTime = moment().format("HH:mm");

              let checkIfAttendanceExist = await Attendance.findOne({
                attendanceDate: attendanceDate,
                userId: findRequest.userId,
              });

              if (checkIfAttendanceExist && checkIfAttendanceExist.checkInTime) {
                // Mark the status as "Absent"
                await Attendance.updateOne(
                  {
                    attendanceDate: attendanceDate,
                    userId: findRequest.userId,
                  },
                  { status: "Absent", checkInTime: null }
                );
              }
              let userId = data.userId
              let findUser = await User.findOne({ _id: userId});
              console.log("find user",findUser)
              let remainingCasualLeaves= findUser?.remainingCasualLeaves;
              let remainingSickLeaves= findUser?.remainingSickLeaves;
              let remainingWfhLeaves= findUser?.remainingWorkFromHomeLeaves;
              let remainingBereavementLeaves= findUser?.remainingBereavementLeaves;
              let remainingPaternityLeaves= findUser?.remainingPaternityLeaves;
              let remainingMaternityLeaves= findUser?.remainingMaternityLeaves;
              let remainingMarriageLeaves= findUser?.remainingMarriageLeaves;
              let remainingAnnualLeaves= findUser?.remainingAnnualLeaves;
              let remainingLeaves= findUser?.remainingLeaves

              let takenCasualLeaves = findUser?.takenCasualLeaves
              let takenSickLeaves = findUser?.takenSickLeaves
              let takenWfhLeaves = findUser?.takenWorkFromHomeLeaves
              let takenBereavementLeaves = findUser?.takenBereavementLeaves
              let takenPaternityLeaves = findUser?.takenPaternityLeaves
              let takenMaternityLeaves = findUser?.takenMaternityLeaves
              let takenMarriageLeaves = findUser?.takenMarriageLeaves
              let takenAnnualLeaves = findUser?.takenAnnualLeaves
              let takenLeaves= findUser?.takenLeaves

              console.log("data",data);
              console.log("applied no of leaves",appliedNoOfLeaves);

              if(data.requestType == "leave"){
                console.log("req:pr:leave",remainingLeaves);
              console.log("req:pt:leave",takenLeaves);
                remainingLeaves = JSON.stringify(+remainingLeaves + +appliedNoOfLeaves)
                takenLeaves = JSON.stringify(+takenLeaves - +appliedNoOfLeaves)
                console.log("req:leaver",remainingLeaves);
              console.log("req:leavet",takenLeaves);
              }
        
              if (data.leaveType == "sick") {
                console.log("sick");
                console.log("srl",remainingSickLeaves);
              console.log("stl",takenSickLeaves);
                remainingSickLeaves = JSON.stringify(+remainingSickLeaves + +appliedNoOfLeaves);
                takenSickLeaves = JSON.stringify(+takenSickLeaves - +appliedNoOfLeaves);
                console.log("after srl",remainingSickLeaves);
              console.log("after stl",takenSickLeaves);
            } else if (data.leaveType == "casual") {
              console.log("casual");
              console.log("crl",remainingCasualLeaves);
              console.log("ctl",takenCasualLeaves);
                remainingCasualLeaves = JSON.stringify(+remainingCasualLeaves + +appliedNoOfLeaves);
                takenCasualLeaves = JSON.stringify(+takenCasualLeaves - +appliedNoOfLeaves);
                console.log("after crl",remainingCasualLeaves);
              console.log("after ctl",takenCasualLeaves);
            } else if (data.leaveType == "wfh") {
              console.log("workhome");

                remainingWfhLeaves = JSON.stringify(+remainingWfhLeaves + +appliedNoOfLeaves);
                takenWfhLeaves = JSON.stringify(+takenWfhLeaves - +appliedNoOfLeaves);
            } else if (data.leaveType == "bereavement") {
              console.log("bereavement");

                remainingBereavementLeaves = JSON.stringify(+remainingBereavementLeaves + +appliedNoOfLeaves);
                takenBereavementLeaves = JSON.stringify(+takenBereavementLeaves - +appliedNoOfLeaves);
            } else if (data.leaveType == "paternity") {
              console.log("paternity");

                remainingPaternityLeaves = JSON.stringify(+remainingPaternityLeaves + +appliedNoOfLeaves);
                takenPaternityLeaves = JSON.stringify(+takenPaternityLeaves - +appliedNoOfLeaves);
            } else if (data.leaveType == "maternity") {
              console.log("maternity");
                remainingMaternityLeaves = JSON.stringify(+remainingMaternityLeaves + +appliedNoOfLeaves);
                takenMaternityLeaves = JSON.stringify(+takenMaternityLeaves - +appliedNoOfLeaves);
            } else if (data.leaveType == "marriage") {
              console.log("marriage");

                remainingMarriageLeaves = JSON.stringify(+remainingMarriageLeaves + +appliedNoOfLeaves);
                takenMarriageLeaves = JSON.stringify(+takenMarriageLeaves - +appliedNoOfLeaves);
            } else if (data.leaveType == "annual") {
              console.log("annual");

                remainingAnnualLeaves = JSON.stringify(+remainingAnnualLeaves + +appliedNoOfLeaves);
                takenAnnualLeaves = JSON.stringify(+takenAnnualLeaves - +appliedNoOfLeaves);
            }
            console.log("user id", data.userId);

            
              let updatedUser = await User.updateOne(
                {_id: userId},
                {
                  remainingCasualLeaves : remainingCasualLeaves,   
                  remainingSickLeaves : remainingSickLeaves,
                  remainingWorkFromHomeLeaves: remainingWfhLeaves,
                  remainingBereavementLeaves : remainingBereavementLeaves,
                  remainingPaternityLeaves : remainingPaternityLeaves,
                  remainingMaternityLeaves : remainingMaternityLeaves,
                  remainingMarriageLeaves : remainingMarriageLeaves,
                  remainingAnnualLeaves : remainingAnnualLeaves,
                  remainingLeaves: remainingLeaves,
                  takenCasualLeaves : takenCasualLeaves,    
                  takenSickLeaves : takenSickLeaves,
                  takenWorkFromHomeLeaves: takenWfhLeaves,
                  takenBereavementLeaves : takenBereavementLeaves,
                  takenPaternityLeaves : takenPaternityLeaves,
                  takenMaternityLeaves : takenMaternityLeaves,
                  takenMarriageLeaves : takenMarriageLeaves,
                  takenAnnualLeaves : takenAnnualLeaves,
                  takenLeaves:takenLeaves
                },
                {new: true}
              )

              // Update the request status to "declined"
              let updateRequest = await Request.updateOne(
                { _id: requestId },
                { status: status, approvedBy: approverRole },
                { new: true }
              );

              
              /////DECLINED KA CHECK TO INCREASE REMAINING LEAVE YAHAN LAGNA CHAHYE

              // Return the response
              // return res.status(200).json({
              //   Request: updateRequest,
              //   msg: "Request declined",
              //   success: true,
              // });
            }

            let requestType = findRequest.requestType;

            let leaveType = findRequest.leaveType;

            let user = findRequest.userId;

            let casualLeaves = user.casualLeaves;

            let sickLeaves = user.sickLeaves;

            let wfhLeaves = user.workFromHomeLeaves;

            let marriageLeaves = user.marriageLeaves;

            let halfDayLeaves = user.halfDayLeaves;

            let bereavementLeaves = user.bereavementLeaves;

            let paternityLeaves = user.paternityLeaves;

            let maternityLeaves = user.maternityLeaves;

            let annualLeaves = user.annualLeaves;

            let unpaidLeaves = user.unpaidLeaves;

            let remainingLeaves = user.remainingLeaves;

            let endingDate = moment(findRequest.endDate).format("YYYY-MM-DDT23:59:59");

            let startingDate = moment(findRequest.startDate).format("YYYY-MM-DDT00:00:00");

            let numberOfLeavesAccepted = new Date(endingDate).getTime() - new Date(startingDate).getTime();

            numberOfLeavesAccepted = numberOfLeavesAccepted / 86400000;

            numberOfLeavesAccepted = Math.round(numberOfLeavesAccepted);

            if (numberOfLeavesAccepted < 1) {
              if (status == "Approved" && leaveType == "casual") {
                console.log("casual single");
                // casualLeaves = JSON.stringify(+casualLeaves - 1);
                // remainingLeaves = JSON.stringify(+remainingLeaves - 1);
              } else if (status == "Approved" && leaveType == "sick") {
                console.log("sick single");
                // sickLeaves = JSON.stringify(+sickLeaves - 1);
                // remainingLeaves = JSON.stringify(+remainingLeaves - 1);
              } else if (status == "Approved" && leaveType == "bereavement") {
                console.log("bereavement single");
                // bereavementLeaves = JSON.stringify(+bereavementLeaves - 1);
                // remainingLeaves = JSON.stringify(+remainingLeaves - 1);
              } else if (status == "Approved" && leaveType == "paternity") {
                console.log("paternity single");
                // paternityLeaves = JSON.stringify(+paternityLeaves - 1);
                // remainingLeaves = JSON.stringify(+remainingLeaves - 1);
              } else if (status == "Approved" && leaveType == "maternity") {
                console.log("maternity single");
                // maternityLeaves = JSON.stringify(+maternityLeaves - 1);
                // remainingLeaves = JSON.stringify(+remainingLeaves - 1);
              } else if (status == "Approved" && leaveType == "marriage") {
                console.log("marriage single");
                // marriageLeaves = JSON.stringify(+marriageLeaves - 1);
                // remainingLeaves = JSON.stringify(+remainingLeaves - 1);
              } else if (status == "Approved" && leaveType == "half") {
                console.log("halfDay single");
                halfDayLeaves = JSON.stringify(+halfDayLeaves - 1);
                // remainingLeaves = JSON.stringify(+remainingLeaves - 1);
              } else if (status == "Approved" && leaveType == "annual") {
                console.log("annual single");
                // annualLeaves = JSON.stringify(+annualLeaves - 1);
                // remainingLeaves = JSON.stringify(+remainingLeaves - 1);
              } else if (status == "Approved" && leaveType == "unpaid") {
                console.log("unpaid single");
                // unpaidLeaves = JSON.stringify(+unpaidLeaves - 1);
                // remainingLeaves = JSON.stringify(+remainingLeaves - 1);
              } else if (status == "Approved" && requestType == "wfh") {
                console.log("wfh single");
                // wfhLeaves = JSON.stringify(+wfhLeaves - 1);
                // remainingLeaves = JSON.stringify(+remainingLeaves - 1);
              }
            } else {
              if (status == "Approved" && leaveType == "casual") {
                console.log("casual multi");
                // casualLeaves = JSON.stringify(+casualLeaves - +numberOfLeavesAccepted);
                // remainingLeaves = JSON.stringify(+remainingLeaves - +numberOfLeavesAccepted);
              } else if (status == "Approved" && leaveType == "sick") {
                console.log("sick multi");
                console.log("mein 2 mein hu");
                // sickLeaves = JSON.stringify(+sickLeaves - +numberOfLeavesAccepted);
                // remainingLeaves = JSON.stringify(+remainingLeaves - +numberOfLeavesAccepted);
              } else if (status == "Approved" && leaveType == "bereavement") {
                console.log("bereavement multi");
                // bereavementLeaves = JSON.stringify(+bereavementLeaves - +numberOfLeavesAccepted);
                // remainingLeaves = JSON.stringify(+remainingLeaves - +numberOfLeavesAccepted);
              } else if (status == "Approved" && leaveType == "paternity") {
                console.log("paternity multi");
                // paternityLeaves = JSON.stringify(+paternityLeaves - +numberOfLeavesAccepted);
                // remainingLeaves = JSON.stringify(+remainingLeaves - +numberOfLeavesAccepted);
              } else if (status == "Approved" && leaveType == "maternity") {
                console.log("maternity multi");
                // maternityLeaves = JSON.stringify(+maternityLeaves - +numberOfLeavesAccepted);
                // remainingLeaves = JSON.stringify(+remainingLeaves - +numberOfLeavesAccepted);
              } else if (status == "Approved" && leaveType == "marriage") {
                console.log("marriage multi");
                // marriageLeaves = JSON.stringify(+marriageLeaves - +numberOfLeavesAccepted);
                // remainingLeaves = JSON.stringify(+remainingLeaves - +numberOfLeavesAccepted);
              } else if (status == "Approved" && leaveType == "annual") {
                console.log("annual multi");
                // annualLeaves = JSON.stringify(+annualLeaves - +numberOfLeavesAccepted);
                // remainingLeaves = JSON.stringify(+remainingLeaves - +numberOfLeavesAccepted);
              } else if (status == "Approved" && leaveType == "unpaid") {
                console.log("unpaid multi");
                // unpaidLeaves = JSON.stringify(+unpaidLeaves - +numberOfLeavesAccepted);
                // remainingLeaves = JSON.stringify(+remainingLeaves - +numberOfLeavesAccepted);
              } else if (status == "Approved" && requestType == "wfh") {
                console.log("wfh multi");
                // wfhLeaves = JSON.stringify(+wfhLeaves - +numberOfLeavesAccepted);
                // remainingLeaves = JSON.stringify(
                //   +remainingLeaves - +numberOfLeavesAccepted
                // );
              }
            }
            if (
              status == "Approved" &&
              requestType == "leave" &&
              (leaveType == "casual" ||
                leaveType == "sick" ||
                leaveType == "marriage" ||
                leaveType == "bereavement" ||
                leaveType == "paternity" ||
                leaveType == "maternity" ||
                leaveType == "annual" ||
                leaveType == "unpaid")
            ) {
              if (numberOfLeavesAccepted <= 1) {
                let currentDate = new Date(findRequest.startDate);
                let currentTime = moment().format("HH:mm");
                let data = {};
                data.attendanceDate = moment(currentDate).format("YYYY-MM-DD"); // Format date as "YYYY-MM-DD"

                checkIfAttendanceExist = await Attendance.findOne({
                  attendanceDate: data.attendanceDate,
                  userId: findRequest.userId,
                });

                if (checkIfAttendanceExist) {
                  await Attendance.updateOne(
                    {
                      attendanceDate: data.attendanceDate,
                      userId: findRequest.userId,
                    },
                    { status: "On-Leave", checkInTime: null }
                  );
                } else {
                  let monthCheck = new Date(moment(currentDate));
                  data.attendanceMonth = monthCheck.toLocaleString("default", {
                    month: "long",
                  });
                  data.attendanceYear = moment(data.attendanceDate).year().toString();
                  data.note = requestType;
                  data.userId = findRequest.userId;
                  data.companyId = companyId;
                  data.attendanceDate = findRequest.startDate;
                  data.userId = user;
                  data.checkInTime = "";
                  data.checkOutTime = "";
                  data.hoursWorked = 0;
                  data.overTime = null;
                  data.status = "On-Leave";

                  let attendance = new Attendance(data);

                  let addAttendance = await attendance.save();

                  if (!addAttendance) {
                    throw new Error("Failed to create attendance");
                  }
                }
              } else {
                let currentDate = new Date(findRequest.startDate);
                let currentTime = moment().format("HH:mm");
                const endDate = new Date(findRequest.endDate);
                let attendanceDate = new Date(moment(data.attendanceDate));
                data.attendanceMonth = attendanceDate.toLocaleString("default", {
                  month: "long",
                });

                data.attendanceYear = moment(data.attendanceDate).year().toString();

                while (currentDate <= endDate) {
                  let data = {};
                  data.note = requestType;
                  data.attendanceDate = moment(currentDate).format("YYYY-MM-DD"); // Format date as "YYYY-MM-DD"
                  checkIfAttendanceExist = await Attendance.findOne({
                    attendanceDate: data.attendanceDate,
                    userId: findRequest.userId,
                  });

                  if (checkIfAttendanceExist) {
                    await Attendance.updateOne(
                      {
                        attendanceDate: data.attendanceDate,
                        userId: findRequest.userId,
                      },
                      { status: "On-Leave", checkInTime: null }
                    );
                  } else {
                    let attendanceDate = new Date(moment(currentDate));
                    data.attendanceMonth = attendanceDate.toLocaleString("default", {
                      month: "long",
                    });
                    data.attendanceYear = moment(data.attendanceDate).year().toString();
                    data.userId = user;
                    data.companyId = companyId;
                    data.checkInTime = "";
                    data.checkOutTime = "";
                    data.hoursWorked = 0;
                    data.overTime = null;
                    data.status = "On-Leave";

                    let attendance = new Attendance(data);

                    let addAttendance = await attendance.save();

                    if (!addAttendance) {
                      throw new Error("Failed to create attendance");
                    }
                  }

                  currentDate.setDate(currentDate.getDate() + 1);
                  console.log("currentDate after update", currentDate);
                }
              }
            }
            let approvedBy = approverRole;

            console.log("halfdayyyyy", halfDayLeaves);

            let updateRequest = await Request.updateOne(
              { _id: requestId },
              { status: status, approvedBy: approvedBy },
              { new: true }
            );

            // let updateUser = await User.findOneAndUpdate(
            //   { _id: user },
            //   {
            //     // casualLeaves: casualLeaves,
            //     // sickLeaves: sickLeaves,
            //     // workFromHomeLeaves: wfhLeaves,
            //     // halfDayLeaves: halfDayLeaves,
            //     // bereavementLeaves: bereavementLeaves,
            //     // paternityLeaves: paternityLeaves,
            //     // maternityLeaves: maternityLeaves,
            //     // marriageLeaves: marriageLeaves,
            //     // annualLeaves: annualLeaves,
            //     // unpaidLeaves: unpaidLeaves,
            //     remainingLeaves: remainingLeaves,
            //     remainingCasualLeaves : remainingCasualLeaves,   
            //     remainingSickLeaves : remainingSickLeaves,
            //     remainingWorkFromHomeLeaves: remainingWfhLeaves,
            //     remainingBereavementLeaves : remainingBereavementLeaves,
            //     remainingPaternityLeaves : remainingPaternityLeaves,
            //     remainingMaternityLeaves : remainingMaternityLeaves,
            //     remainingMarriageLeaves : remainingMarriageLeaves,
            //     remainingAnnualLeaves : remainingAnnualLeaves,
            //     takenCasualLeaves : takenCasualLeaves,    
            //     takenSickLeaves : takenSickLeaves,
            //     takenWorkFromHomeLeaves: takenWfhLeaves,
            //     takenBereavementLeaves : takenBereavementLeaves,
            //     takenPaternityLeaves : takenPaternityLeaves,
            //     takenMaternityLeaves : takenMaternityLeaves,
            //     takenMarriageLeaves : takenMarriageLeaves,
            //     takenAnnualLeaves : takenAnnualLeaves,
            //     takenLeaves: takenLeaves      
            //   },
            //   { new: true }
            // );

            let findRequestee = await User.findOne({ _id: user });

            await services.sendRequestStatusEmail(findRequestee.email, data.status, data.requestType, data.description);

            return res.status(200).json({
              Request: updateRequest,
              // User: updateUser,
              msg: "Request updated",
              success: true,
            });
          }
        }
      } else if (!updateSelfRequest && approveRequest) {
        console.log("CEO");
        let status = data.status;

        let requestId = data._id;

        let findRequest = await Request.findOne({
          _id: requestId,
        }).populate("userId");

        if (!findRequest) {
          return res.status(404).json({
            msg: "Request with this id not found",
            success: false,
          });
        }
        if (status === "Declined") {
          // Check if the user has attendance for that day
          let currentDate = new Date(findRequest.startDate);
          let attendanceDate = moment(currentDate).format("YYYY-MM-DD");
          let currentTime = moment().format("HH:mm");

          let checkIfAttendanceExist = await Attendance.findOne({
            attendanceDate: attendanceDate,
            userId: findRequest.userId,
          });

          if (checkIfAttendanceExist && checkIfAttendanceExist.checkInTime) {
            // Mark the status as "Absent"
            await Attendance.updateOne(
              {
                attendanceDate: attendanceDate,
                userId: findRequest.userId,
              },
              { status: "Absent", checkInTime: null }
            );
          }

          let remainingCasualLeaves= findUser?.remainingCasualLeaves;
          let remainingSickLeaves= findUser?.remainingSickLeaves;
          let remainingWfhLeaves= findUser?.remainingWorkFromHomeLeaves;
          let remainingBereavementLeaves= findUser?.remainingBereavementLeaves;
          let remainingPaternityLeaves= findUser?.remainingPaternityLeaves;
          let remainingMaternityLeaves= findUser?.remainingMaternityLeaves;
          let remainingMarriageLeaves= findUser?.remainingMarriageLeaves;
          let remainingAnnualLeaves= findUser?.remainingAnnualLeaves;
          let remainingLeaves= findUser?.remainingLeaves

          let takenCasualLeaves = findUser?.takenCasualLeaves
          let takenSickLeaves = findUser?.takenSickLeaves
          let takenWfhLeaves = findUser?.takenWorkFromHomeLeaves
          let takenBereavementLeaves = findUser?.takenBereavementLeaves
          let takenPaternityLeaves = findUser?.takenPaternityLeaves
          let takenMaternityLeaves = findUser?.takenMaternityLeaves
          let takenMarriageLeaves = findUser?.takenMarriageLeaves
          let takenAnnualLeaves = findUser?.takenAnnualLeaves
          let takenLeaves= findUser?.takenLeaves
          if(data.requestType == "leave"){
            remainingLeaves = JSON.stringify(+remainingLeaves + +findRequest?.totalDays)
            takenLeaves = JSON.stringify(+takenLeaves - +findRequest?.totalDays)
          }
    
          if (findRequest.leaveType == "sick") {
            remainingSickLeaves = JSON.stringify(+remainingSickLeaves + +findRequest?.totalDays);
            takenSickLeaves = JSON.stringify(+takenSickLeaves - +findRequest?.totalDays);
        } else if (findRequest.leaveType == "casual") {
            remainingCasualLeaves = JSON.stringify(+remainingCasualLeaves + +findRequest?.totalDays);
            takenCasualLeaves = JSON.stringify(+takenCasualLeaves - +findRequest?.totalDays);
        } else if (findRequest.leaveType == "wfh") {
            remainingWfhLeaves = JSON.stringify(+remainingWfhLeaves + +findRequest?.totalDays);
            takenWfhLeaves = JSON.stringify(+takenWfhLeaves - +findRequest?.totalDays);
        } else if (findRequest.leaveType == "bereavement") {
            remainingBereavementLeaves = JSON.stringify(+remainingBereavementLeaves + +findRequest?.totalDays);
            takenBereavementLeaves = JSON.stringify(+takenBereavementLeaves - +findRequest?.totalDays);
        } else if (findRequest.leaveType == "paternity") {
            remainingPaternityLeaves = JSON.stringify(+remainingPaternityLeaves + +findRequest?.totalDays);
            takenPaternityLeaves = JSON.stringify(+takenPaternityLeaves - +findRequest?.totalDays);
        } else if (findRequest.leaveType == "maternity") {
            remainingMaternityLeaves = JSON.stringify(+remainingMaternityLeaves + +findRequest?.totalDays);
            takenMaternityLeaves = JSON.stringify(+takenMaternityLeaves - +findRequest?.totalDays);
        } else if (findRequest.leaveType == "marriage") {
            remainingMarriageLeaves = JSON.stringify(+remainingMarriageLeaves + +findRequest?.totalDays);
            takenMarriageLeaves = JSON.stringify(+takenMarriageLeaves - +findRequest?.totalDays);
        } else if (findRequest.leaveType == "annual") {
            remainingAnnualLeaves = JSON.stringify(+remainingAnnualLeaves + +findRequest?.totalDays);
            takenAnnualLeaves = JSON.stringify(+takenAnnualLeaves - +findRequest?.totalDays);
        }
              let updatedUser = await User.updateOne(
                {_id: userId},
                {
                  remainingCasualLeaves : remainingCasualLeaves,   
                  remainingSickLeaves : remainingSickLeaves,
                  remainingWorkFromHomeLeaves: remainingWfhLeaves,
                  remainingBereavementLeaves : remainingBereavementLeaves,
                  remainingPaternityLeaves : remainingPaternityLeaves,
                  remainingMaternityLeaves : remainingMaternityLeaves,
                  remainingMarriageLeaves : remainingMarriageLeaves,
                  remainingAnnualLeaves : remainingAnnualLeaves,
                  takenCasualLeaves : takenCasualLeaves,    
                  takenSickLeaves : takenSickLeaves,
                  takenWorkFromHomeLeaves: takenWfhLeaves,
                  takenBereavementLeaves : takenBereavementLeaves,
                  takenPaternityLeaves : takenPaternityLeaves,
                  takenMaternityLeaves : takenMaternityLeaves,
                  takenMarriageLeaves : takenMarriageLeaves,
                  takenAnnualLeaves : takenAnnualLeaves
                },
                {new: true}
              )

          // Update the request status to "declined"
          let updateRequest = await Request.updateOne(
            { _id: requestId },
            { status: status, approvedBy: approverRole },
            { new: true }
          );

          // Return the response
          // return res.status(200).json({
          //   Request: updateRequest,
          //   msg: "Request declined",
          //   success: true,
          // });
        }

        let requestType = findRequest.requestType;

        let leaveType = findRequest.leaveType;

        let user = findRequest.userId;

        let casualLeaves = user.casualLeaves;

        let sickLeaves = user.sickLeaves;

        let wfhLeaves = user.workFromHomeLeaves;

        let marriageLeaves = user.marriageLeaves;

        let halfDayLeaves = user.halfDayLeaves;

        let bereavementLeaves = user.bereavementLeaves;

        let paternityLeaves = user.paternityLeaves;

        let maternityLeaves = user.maternityLeaves;

        let annualLeaves = user.annualLeaves;

        let unpaidLeaves = user.unpaidLeaves;

        let remainingLeaves = user.remainingLeaves;

        let endingDate = moment(findRequest.endDate).format("YYYY-MM-DDT23:59:59");

        let startingDate = moment(findRequest.startDate).format("YYYY-MM-DDT00:00:00");

        let numberOfLeavesAccepted = new Date(endingDate).getTime() - new Date(startingDate).getTime();

        numberOfLeavesAccepted = numberOfLeavesAccepted / 86400000;

        numberOfLeavesAccepted = Math.round(numberOfLeavesAccepted);

        if (numberOfLeavesAccepted < 1) {
          if (status == "Approved" && leaveType == "casual") {
            // casualLeaves = JSON.stringify(+casualLeaves - 1);
            // remainingLeaves = JSON.stringify(+remainingLeaves - 1);
          } else if (status == "Approved" && leaveType == "sick") {
            console.log("mein yahan hu");
            // sickLeaves = JSON.stringify(+sickLeaves - 1);
            // remainingLeaves = JSON.stringify(+remainingLeaves - 1);
          } else if (status == "Approved" && leaveType == "bereavement") {
            console.log("mein yahan hu");
            // bereavementLeaves = JSON.stringify(+bereavementLeaves - 1);
            // remainingLeaves = JSON.stringify(+remainingLeaves - 1);
          } else if (status == "Approved" && leaveType == "paternity") {
            console.log("mein yahan hu");
            // paternityLeaves = JSON.stringify(+paternityLeaves - 1);
            // remainingLeaves = JSON.stringify(+remainingLeaves - 1);
          } else if (status == "Approved" && leaveType == "maternity") {
            console.log("mein yahan hu");
            // maternityLeaves = JSON.stringify(+maternityLeaves - 1);
            // remainingLeaves = JSON.stringify(+remainingLeaves - 1);
          } else if (status == "Approved" && leaveType == "marriage") {
            console.log("mein yahan hu");
            // marriageLeaves = JSON.stringify(+marriageLeaves - 1);
            // remainingLeaves = JSON.stringify(+remainingLeaves - 1);
          } else if (status == "Approved" && leaveType == "half") {
            console.log("mein yahan hu");
            halfDayLeaves = JSON.stringify(+halfDayLeaves - 0.5);
            // remainingLeaves = JSON.stringify(+remainingLeaves - 0.5);
          } else if (status == "Approved" && leaveType == "annual") {
            console.log("mein yahan hu");
            // annualLeaves = JSON.stringify(+annualLeaves - 1);
            // remainingLeaves = JSON.stringify(+remainingLeaves - 1);
          } else if (status == "Approved" && leaveType == "unpaid") {
            console.log("mein yahan hu");
            // unpaidLeaves = JSON.stringify(+unpaidLeaves - 1);
            // remainingLeaves = JSON.stringify(+remainingLeaves - 1);
          } else if (status == "Approved" && requestType == "wfh") {
            // wfhLeaves = JSON.stringify(+wfhLeaves - 1);
            // remainingLeaves = JSON.stringify(+remainingLeaves - 1);
          }
        } else {
          if (status == "Approved" && leaveType == "casual") {
            // casualLeaves = JSON.stringify(+casualLeaves - +numberOfLeavesAccepted);
            // remainingLeaves = JSON.stringify(+remainingLeaves - +numberOfLeavesAccepted);
          } else if (status == "Approved" && leaveType == "sick") {
            console.log("mein 2 mein hu");
            // sickLeaves = JSON.stringify(+sickLeaves - +numberOfLeavesAccepted);
            // remainingLeaves = JSON.stringify(+remainingLeaves - +numberOfLeavesAccepted);
          } else if (status == "Approved" && leaveType == "bereavement") {
            console.log("mein yahan hu");
            // bereavementLeaves = JSON.stringify(+bereavementLeaves - +numberOfLeavesAccepted);
            // remainingLeaves = JSON.stringify(+remainingLeaves - +numberOfLeavesAccepted);
          } else if (status == "Approved" && leaveType == "paternity") {
            // paternityLeaves = JSON.stringify(+paternityLeaves - +numberOfLeavesAccepted);
            // remainingLeaves = JSON.stringify(+remainingLeaves - +numberOfLeavesAccepted);
          } else if (status == "Approved" && leaveType == "maternity") {
            console.log("mein yahan hu");
            // maternityLeaves = JSON.stringify(+maternityLeaves - +numberOfLeavesAccepted);
            // remainingLeaves = JSON.stringify(+remainingLeaves - +numberOfLeavesAccepted);
          } else if (status == "Approved" && leaveType == "marriage") {
            console.log("mein yahan hu");
            // marriageLeaves = JSON.stringify(+marriageLeaves - +numberOfLeavesAccepted);
            // remainingLeaves = JSON.stringify(+remainingLeaves - +numberOfLeavesAccepted);
          } else if (status == "Approved" && leaveType == "annual") {
            console.log("mein yahan hu");
            // annualLeaves = JSON.stringify(+annualLeaves - +numberOfLeavesAccepted);
            // remainingLeaves = JSON.stringify(+remainingLeaves - +numberOfLeavesAccepted);
          } else if (status == "Approved" && leaveType == "unpaid") {
            console.log("mein yahan hu");
            // unpaidLeaves = JSON.stringify(+unpaidLeaves - +numberOfLeavesAccepted);
            // remainingLeaves = JSON.stringify(+remainingLeaves - +numberOfLeavesAccepted);
          } else if (status == "Approved" && requestType == "wfh") {
            // wfhLeaves = JSON.stringify(+wfhLeaves - +numberOfLeavesAccepted);
            // remainingLeaves = JSON.stringify(
            //   +remainingLeaves - +numberOfLeavesAccepted
            // );
          }
        }
        if (
          status == "Approved" &&
          requestType == "leave" &&
          (leaveType == "casual" ||
            leaveType == "sick" ||
            leaveType == "marriage" ||
            leaveType == "bereavement" ||
            leaveType == "paternity" ||
            leaveType == "maternity" ||
            leaveType == "annual" ||
            leaveType == "unpaid")
        ) {
          if (numberOfLeavesAccepted <= 1) {
            let currentDate = new Date(findRequest.startDate);
            let currentTime = moment().format("HH:mm");

            let data = {};
            data.attendanceDate = moment(currentDate).format("YYYY-MM-DD"); // Format date as "YYYY-MM-DD"

            checkIfAttendanceExist = await Attendance.findOne({
              attendanceDate: data.attendanceDate,
              userId: findRequest.userId,
            });

            if (checkIfAttendanceExist) {
              await Attendance.updateOne(
                {
                  attendanceDate: data.attendanceDate,
                  userId: findRequest.userId,
                },
                { status: "On-Leave", checkInTime: null }
              );
            } else {
              let monthCheck = new Date(moment(currentDate));
              data.attendanceMonth = monthCheck.toLocaleString("default", {
                month: "long",
              });
              data.attendanceYear = moment(data.attendanceDate).year().toString();
              data.note = requestType;
              data.userId = findRequest.userId;
              data.companyId = companyId;
              data.attendanceDate = findRequest.startDate;
              data.userId = user;
              data.checkInTime = "";
              data.checkOutTime = "";
              data.hoursWorked = 0;
              data.overTime = null;
              data.status = "On-Leave";

              let attendance = new Attendance(data);

              let addAttendance = await attendance.save();

              if (!addAttendance) {
                throw new Error("Failed to create attendance");
              }
            }
          } else {
            let currentDate = new Date(findRequest.startDate);
            let currentTime = moment().format("HH:mm");

            const endDate = new Date(findRequest.endDate);
            let attendanceDate = new Date(moment(data.attendanceDate));
            data.attendanceMonth = attendanceDate.toLocaleString("default", {
              month: "long",
            });

            data.attendanceYear = moment(data.attendanceDate).year().toString();

            while (currentDate <= endDate) {
              let data = {};
              data.note = requestType;
              data.attendanceDate = moment(currentDate).format("YYYY-MM-DD"); // Format date as "YYYY-MM-DD"
              checkIfAttendanceExist = await Attendance.findOne({
                attendanceDate: data.attendanceDate,
                userId: findRequest.userId,
              });

              if (checkIfAttendanceExist) {
                await Attendance.updateOne(
                  {
                    attendanceDate: data.attendanceDate,
                    userId: findRequest.userId,
                  },
                  { status: "On-Leave", checkInTime: null }
                );
              } else {
                let attendanceDate = new Date(moment(currentDate));
                data.attendanceMonth = attendanceDate.toLocaleString("default", {
                  month: "long",
                });
                data.attendanceYear = moment(data.attendanceDate).year().toString();
                data.userId = user;
                data.companyId = companyId;
                data.checkInTime = "";
                data.checkOutTime = "";
                data.hoursWorked = 0;
                data.overTime = null;
                data.status = "On-Leave";

                let attendance = new Attendance(data);

                let addAttendance = await attendance.save();

                if (!addAttendance) {
                  throw new Error("Failed to create attendance");
                }
              }

              currentDate.setDate(currentDate.getDate() + 1);
              console.log("currentDate after update", currentDate);
            }
          }
        }
        let approvedBy = approverRole;

        let updateRequest = await Request.updateOne(
          { _id: requestId },
          { status: status, approvedBy: approvedBy },
          { new: true }
        );

        // let updateUser = await User.findOneAndUpdate(
        //   { _id: user },
        //   {
        //     // casualLeaves: casualLeaves,
        //     // sickLeaves: sickLeaves,
        //     // workFromHomeLeaves: wfhLeaves,
        //     // halfDayLeaves: halfDayLeaves,
        //     // bereavementLeaves: bereavementLeaves,
        //     // paternityLeaves: paternityLeaves,
        //     // maternityLeaves: maternityLeaves,
        //     // marriageLeaves: marriageLeaves,
        //     // annualLeaves: annualLeaves,
        //     // unpaidLeaves: unpaidLeaves,
        //     remainingLeaves: remainingLeaves,
        //     remainingCasualLeaves : remainingCasualLeaves,   
        //     remainingSickLeaves : remainingSickLeaves,
        //     remainingWorkFromHomeLeaves: remainingWfhLeaves,
        //     remainingBereavementLeaves : remainingBereavementLeaves,
        //     remainingPaternityLeaves : remainingPaternityLeaves,
        //     remainingMaternityLeaves : remainingMaternityLeaves,
        //     remainingMarriageLeaves : remainingMarriageLeaves,
        //     remainingAnnualLeaves : remainingAnnualLeaves,
        //     takenCasualLeaves : takenCasualLeaves,    
        //     takenSickLeaves : takenSickLeaves,
        //     takenWorkFromHomeLeaves: takenWfhLeaves,
        //     takenBereavementLeaves : takenBereavementLeaves,
        //     takenPaternityLeaves : takenPaternityLeaves,
        //     takenMaternityLeaves : takenMaternityLeaves,
        //     takenMarriageLeaves : takenMarriageLeaves,
        //     takenAnnualLeaves : takenAnnualLeaves,
        //     takenLeaves:takenLeaves    
        //   },
        //   { new: true }
        // );

        let findRequestee = await User.findOne({ _id: user });

        await services.sendRequestStatusEmail(findRequestee.email, data.status, data.requestType, data.description);

        return res.status(200).json({
          Request: updateRequest,
          // User: updateUser,
          msg: "Request updated",
          success: true,
        });
      } else {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: false,
        });
      }
    } catch (error) {
      console.log(error)
      res.status(500).json({
        msg: "Failed to update request",
        success: false,
      });
    }
  },

  deleteRequest: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = await User.findOne({ _id: userId });
      let checkPermission = await Permission.findOne({
        roleId: findUser.roleId,
      });
      let isAllowed = services.checkPermissions(checkPermission, "requestManagement", "manageSelfRequest");
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: false,
        });
      }

      let _id = req.body._id;
      if (!_id) {
        return res.status(400).json({
          msg: "Please provide the id of request to delete the request",
          success: false,
        });
      }

      let findRequest = await Request.findOne({ _id: _id }, { deleted: false });

      let remainingCasualLeaves= findUser?.remainingCasualLeaves;
      let remainingSickLeaves= findUser?.remainingSickLeaves;
      let remainingWfhLeaves= findUser?.remainingWorkFromHomeLeaves;
      let remainingBereavementLeaves= findUser?.remainingBereavementLeaves;
      let remainingPaternityLeaves= findUser?.remainingPaternityLeaves;
      let remainingMaternityLeaves= findUser?.remainingMaternityLeaves;
      let remainingMarriageLeaves= findUser?.remainingMarriageLeaves;
      let remainingAnnualLeaves= findUser?.remainingAnnualLeaves;
      let remainingLeaves= findUser?.remainingLeaves

      let takenCasualLeaves = findUser?.takenCasualLeaves
      let takenSickLeaves = findUser?.takenSickLeaves
      let takenWfhLeaves = findUser?.takenWorkFromHomeLeaves
      let takenBereavementLeaves = findUser?.takenBereavementLeaves
      let takenPaternityLeaves = findUser?.takenPaternityLeaves
      let takenMaternityLeaves = findUser?.takenMaternityLeaves
      let takenMarriageLeaves = findUser?.takenMarriageLeaves
      let takenAnnualLeaves = findUser?.takenAnnualLeaves
      let takenLeaves= findUser?.takenLeaves

      if(findRequest.requestType == "leave"){
        remainingLeaves = JSON.stringify(+remainingLeaves + +findRequest?.totalDays)
        takenLeaves = JSON.stringify(+takenLeaves - +findRequest?.totalDays)
      }

      if (findRequest.leaveType == "sick") {
        remainingSickLeaves = JSON.stringify(+remainingSickLeaves + +findRequest?.totalDays);
        takenSickLeaves = JSON.stringify(+takenSickLeaves - +findRequest?.totalDays);
    } else if (findRequest.leaveType == "casual") {
        remainingCasualLeaves = JSON.stringify(+remainingCasualLeaves + +findRequest?.totalDays);
        takenCasualLeaves = JSON.stringify(+takenCasualLeaves - +findRequest?.totalDays);
    } else if (findRequest.leaveType == "wfh") {
        remainingWfhLeaves = JSON.stringify(+remainingWfhLeaves + +findRequest?.totalDays);
        takenWfhLeaves = JSON.stringify(+takenWfhLeaves - +findRequest?.totalDays);
    } else if (findRequest.leaveType == "bereavement") {
        remainingBereavementLeaves = JSON.stringify(+remainingBereavementLeaves + +findRequest?.totalDays);
        takenBereavementLeaves = JSON.stringify(+takenBereavementLeaves - +findRequest?.totalDays);
    } else if (findRequest.leaveType == "paternity") {
        remainingPaternityLeaves = JSON.stringify(+remainingPaternityLeaves + +findRequest?.totalDays);
        takenPaternityLeaves = JSON.stringify(+takenPaternityLeaves - +findRequest?.totalDays);
    } else if (findRequest.leaveType == "maternity") {
        remainingMaternityLeaves = JSON.stringify(+remainingMaternityLeaves + +findRequest?.totalDays);
        takenMaternityLeaves = JSON.stringify(+takenMaternityLeaves - +findRequest?.totalDays);
    } else if (findRequest.leaveType == "marriage") {
        remainingMarriageLeaves = JSON.stringify(+remainingMarriageLeaves + +findRequest?.totalDays);
        takenMarriageLeaves = JSON.stringify(+takenMarriageLeaves - +findRequest?.totalDays);
    } else if (findRequest.leaveType == "annual") {
        remainingAnnualLeaves = JSON.stringify(+remainingAnnualLeaves + +findRequest?.totalDays);
        takenAnnualLeaves = JSON.stringify(+takenAnnualLeaves - +findRequest?.totalDays);
    }

      let request = await Request.findOneAndUpdate({ _id }, { deleted: true, status: "Cancelled" }, { new: true });

      if (!request) {
        return res.status(404).json({
          msg: "No request Found",
          success: false,
        });
      }

      let updatedUser = await User.updateOne(
        {_id: userId},
        {
          remainingCasualLeaves : remainingCasualLeaves,   
          remainingSickLeaves : remainingSickLeaves,
          remainingWorkFromHomeLeaves: remainingWfhLeaves,
          remainingBereavementLeaves : remainingBereavementLeaves,
          remainingPaternityLeaves : remainingPaternityLeaves,
          remainingMaternityLeaves : remainingMaternityLeaves,
          remainingMarriageLeaves : remainingMarriageLeaves,
          remainingAnnualLeaves : remainingAnnualLeaves,
          remainingLeaves: remainingLeaves,
          takenCasualLeaves : takenCasualLeaves,    
          takenSickLeaves : takenSickLeaves,
          takenWorkFromHomeLeaves: takenWfhLeaves,
          takenBereavementLeaves : takenBereavementLeaves,
          takenPaternityLeaves : takenPaternityLeaves,
          takenMaternityLeaves : takenMaternityLeaves,
          takenMarriageLeaves : takenMarriageLeaves,
          takenAnnualLeaves : takenAnnualLeaves,
          takenLeaves: takenLeaves
        },
        {new: true}
      )

      return res.status(200).json({
        User: updatedUser,
        msg: "Request Cancelled",
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to cancel request",

        error: error.message,
        success: false,
      });
    }
  },
};

module.exports = methods;
