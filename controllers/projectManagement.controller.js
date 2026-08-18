require("dotenv").config();
const projectManagement = require("../models/projectManagement.model");
const User = require("../models/user.model");
const Client = require("../models/client.model");
const FocalPerson = require("../models/focalPerson.model");
const Permission = require("../models/permissions.model");
const services = require("../utils/services");
const timesheetModel = require("../models/timesheet.model");

const mongoose = require("mongoose");

let methods = {
  addProject: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = await User.findOne({ _id: userId });
      let isAllowed;
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let roleId = findUser?.roleId;
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "projectManagement", "projectManagement");
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

      var checkStartDate = new Date(data.startDate);
      if (checkStartDate.toString() === "Invalid Date") {
        return res.status(400).json({
          msg: "Invalid Start Date",
          success: false,
        });
      }

      var checkEndDate = new Date(data.endDate);
      if (checkEndDate.toString() === "Invalid Date") {
        return res.status(400).json({
          msg: "Invalid End Date",
          success: false,
        });
      }

      let project = new projectManagement(data);

      let addProject = await project.save();

      if (!addProject) {
        return res.status(404).json({
          msg: "Empty Project Record cannot be created",
          success: false,
        });
      }

      return res.status(200).json({
        project: addProject,
        msg: "Project added",
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to add project",
        error: error.message,
        success: false,
      });
    }
  },
  // viewProject: async (req, res) => {
  //   try {
  //     let _id = req.token._id;
  //     let check =
  //       (await User.findOne({ _id, deleted: false })) ||
  //       (await Admin.findOne({ _id, deleted: false }));

  //     const paginateOptions =
  //       req.query.page && req.query.limit
  //         ? { page: req.query.page, limit: req.query.limit }
  //         : {
  //             page: 1,
  //             limit: 10,
  //           };

  //     var options = {
  //       ...paginateOptions,
  //       populate: {
  //         path: "assignedDevelopers", // Specify the valid path as a string
  //       },
  //     };

  //     let companyID = check.companyID;

  //     let findProjects = await projectManagement.populate(
  //       {
  //         companyID: companyID,
  //         deleted: false,
  //       },
  //       { ...options }
  //     );

  //     return res.status(200).json({
  //       projects: findProjects,
  //       success: true,
  //     });
  //   } catch (error) {
  //     return res.status(500).json({
  //       msg: "Failed to view projects",
  //       error: error.message,
  //       success: false,
  //     });
  //   }
  // },
  viewProject: async (req, res) => {
    try {
      console.log(req.query.taskBoard)
      let userId = req.token._id;
      let findUser =
        (await User.findOne({ _id: userId })) ||
        (await Client.findOne({ _id: userId })) ||
        (await FocalPerson.findOne({ _id: userId }));
      let isAllowed;
      if (findUser.role === "admin" || findUser.role === "client" || findUser.role === "focalperson") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let roleId = findUser?.roleId;
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "projectManagement", "projectManagement");
      }
      // if (!isAllowed) {
      //   return res.status(401).json({
      //     msg: "Unauthorized User",
      //     success: true,
      //   });
      // }
      
      const paginateOptions =
        req.query.page && req.query.limit
          ? { page: req.query.page, limit: req.query.limit }
          : {
              page: 1,
              limit: 10,
            };

      if (findUser.role === "client") {
        let result = await projectManagement.paginate(
          {
            clientId: findUser._id,
            companyId: findUser.companyId,
            deleted: false,
          },
          { 
            ...paginateOptions,
            select: '-cost -costType -adminDocs -teamCost -currency -projectType -paymentSchedule',
            populate: [
              { path: 'projectLead', select: 'fullName imageUrl', match: { deleted: false, userStatus: 'Active' }  },
              { path: 'assignedDevelopers', select: 'fullName imageUrl', match: { deleted: false, userStatus: 'Active' }  },
            ],
          }
        );
        return res.status(200).json({
          projects: result,
          success: true,
        });
      } else if (findUser.role === "focalperson") {
        let result = await projectManagement.paginate(
          {
            focalPersonId: findUser._id,
            companyId: findUser.companyId,
            deleted: false,
          },
          { 
            ...paginateOptions,
            select: '-cost -costType -adminDocs -teamCost -currency -projectType -paymentSchedule',
            populate: [
              { path: 'projectLead', select: 'fullName imageUrl', match: { deleted: false, userStatus: 'Active' } },
              { path: 'assignedDevelopers', select: 'fullName imageUrl', match: { deleted: false, userStatus: 'Active' }  },
            ],
          }
        );

        return res.status(200).json({
          projects: result,
          success: true,
        });
      } else if (req.query.employeeId) {
        const companyId = findUser.companyId;
        const clientName = req.query.clientName; // Get the clientName from the request query
        const projectName = req.query.projectName;

        const aggregationPipeline = [
          {
            $match: {
              companyId: new mongoose.Types.ObjectId(companyId), // Convert companyId to ObjectId
              status: {
                $nin: ["Paused", "Archived", "Completed"],
              },
              $or: [
                {
                  projectLead: new mongoose.Types.ObjectId(req.query.employeeId),
                },
                {
                  assignedDevelopers: new mongoose.Types.ObjectId(req.query.employeeId),
                },
              ],
              deleted: false,
            },
          },
          {
            $lookup: {
              from: "clients",
              localField: "clientId",
              foreignField: "_id",
              as: "client",
            },
          },
          {
            $unwind: {
              path: "$client",
            },
          },
          {
            $lookup: {
              from: "users",
              let: { leadId: "$projectLead" },
              pipeline: [
                { $match: { $expr: { $eq: ["$_id", "$$leadId"] }, deleted: false } },
                { $project: { _id: 1, fullName: 1, imageUrl: 1 } },
              ],
              as: "projectLeadData",
            },        
          },
          {
            $unwind: {
              path: "$projectLeadData",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "users",
              let: { devIds: "$assignedDevelopers" },
              pipeline: [
                { $match: { $expr: { $in: ["$_id", "$$devIds"] }, deleted: false } },
                { $project: { _id: 1, fullName: 1, imageUrl: 1 } },
              ],
              as: "assignedDevelopersData",
            },
          },
          {
            $project: {
              _id: 1,
              projectName: 1,
              projectDescription: 1,
              startDate: 1,
              endDate: 1,
              priority: 1,
              status: 1,
              docs: 1,
              projectDomain: 1,
              taskBoard: 1,
              projectLead: {
                $cond: {
                  if: { $ifNull: ["$projectLeadData", false] },
                  then: {
                    _id: "$projectLeadData._id",
                    fullName: "$projectLeadData.fullName",
                    imageUrl: "$projectLeadData.imageUrl",
                  },
                  else: null,
                },
              },
              assignedDevelopers: {
                $map: {
                  input: "$assignedDevelopersData",
                  as: "developer",
                  in: {
                    _id: "$$developer._id",
                    fullName: "$$developer.fullName",
                    imageUrl: "$$developer.imageUrl",
                  },
                },
              },
            },
          },
          {
            $addFields: {
              sortOrder: {
                $switch: {
                  branches: [
                    { case: { $eq: ["$status", "On-Going"] }, then: 1 },
                    { case: { $eq: ["$status", "Scheduled"] }, then: 2 },
                    { case: { $eq: ["$status", "Paused"] }, then: 3 },
                    { case: { $eq: ["$status", "Completed"] }, then: 4 },
                    { case: { $eq: ["$status", "Archived"] }, then: 5 },
                  ],
                  default: 6,
                },
              },
            },
          },
          { 
            $sort: { 
              sortOrder: 1,
              _id: -1 
            } 
          },
        ];

        if (clientName) {
          aggregationPipeline.push({
            $match: {
              "client.clientName": {
                $regex: clientName ? new RegExp(clientName, "i") : new RegExp(".*"),
              },
            },
          });
        }
        if (projectName) {
          aggregationPipeline.push({
            $match: {
              projectName: {
                $regex: projectName ? new RegExp(projectName, "i") : new RegExp(".*"),
              },
            },
          });
        }
        if (req.query.projectDomain) {
          aggregationPipeline.push({
            $match: {
              projectDomain: new mongoose.Types.ObjectId(req.query.projectDomain),
            },
          });
        }

        if (req.query.costType) {
          aggregationPipeline.push({
            $match: {
              projectType: 'Billed',
              costType: req.query.costType,
            },
          });
        }
        
        if (req.query.costTypeInvoice) {
          aggregationPipeline.push({
            $match: {
              projectType: 'Billed',
              costType: {
                $in: ['Monthly', 'Hourly']
              },
            },
          });
        }

        if (req.query.taskBoard === 'true') {
          aggregationPipeline.push({
            $match: {
              $and: [
                { taskBoard: { $exists: true } },
                { taskBoard: true }
              ]
            },
          });
        }

        if (req.query.taskBoard === 'false') {
          aggregationPipeline.push({
            $match: {
              $or: [
                { taskBoard: false }, // Projects where taskBoard is false
                { taskBoard: { $exists: false } }, // Projects where taskBoard doesn't exist
              ]
            },
          });
        }

        if (req.query.projectId) {
          aggregationPipeline.push({
            $match: {
              _id: new mongoose.Types.ObjectId(req.query.projectId),
            },
          });
        }

        const result = await projectManagement.aggregatePaginate(
          projectManagement.aggregate(aggregationPipeline),
          paginateOptions
        );

        return res.status(200).json({
          projects: result,
          success: true,
        });
      } else {
        if (!isAllowed) {
          return res.status(401).json({
            msg: "Unauthorized User",
            success: true,
          });
        }
        const companyId = findUser.companyId;
        const clientName = req.query.clientName; // Get the clientName from the request query
        const projectName = req.query.projectName;

        const aggregationPipeline = [
          {
            $match: {
              companyId: new mongoose.Types.ObjectId(companyId), // Convert companyId to ObjectId
              deleted: false,
            },
          },
          {
            $lookup: {
              from: "clients",
              localField: "clientId",
              foreignField: "_id",
              as: "client",
            },
          },
          {
            $unwind: {
              path: "$client",
            },
          },
          {
            $lookup: {
              from: "users",
              let: { leadId: "$projectLead" },
              pipeline: [
                { $match: { $expr: { $eq: ["$_id", "$$leadId"] }, deleted: false } },
                { $project: { _id: 1, fullName: 1, imageUrl: 1 } },
              ],
              as: "projectLeadData",
            },    
          },
          {
            $unwind: {
              path: "$projectLeadData",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "users",
              let: { devIds: "$assignedDevelopers" },
              pipeline: [
                { $match: { $expr: { $in: ["$_id", "$$devIds"] }, deleted: false } },
                { $project: { _id: 1, fullName: 1, imageUrl: 1 } },
              ],
              as: "assignedDevelopersData",
            },
          },
          {
            $addFields: {
              projectLead: {
                $cond: {
                  if: { $ifNull: ["$projectLeadData", false] },
                  then: {
                    _id: "$projectLeadData._id",
                    fullName: "$projectLeadData.fullName",
                    imageUrl: "$projectLeadData.imageUrl",
                  },
                  else: null,
                },
              },
              assignedDevelopers: {
                $map: {
                  input: "$assignedDevelopersData",
                  as: "developer",
                  in: {
                    _id: "$$developer._id",
                    fullName: "$$developer.fullName",
                    imageUrl: "$$developer.imageUrl",
                  },
                },
              },
              sortOrder: {
                $switch: {
                  branches: [
                    { case: { $eq: ["$status", "On-Going"] }, then: 1 },
                    { case: { $eq: ["$status", "Scheduled"] }, then: 2 },
                    { case: { $eq: ["$status", "Paused"] }, then: 3 },
                    { case: { $eq: ["$status", "Completed"] }, then: 4 },
                    { case: { $eq: ["$status", "Archived"] }, then: 5 },
                  ],
                  default: 6,
                },
              },
            },
          },
          {
            $project: {
              projectLeadData: 0,
              assignedDevelopersData: 0,
            },
          },
          { 
            $sort: { 
              sortOrder: 1,
              _id: -1 
            } 
          },
        ];

        // Add a $match stage to filter by clientName if it's provided
        if (clientName) {
          aggregationPipeline.push({
            $match: {
              "client.clientName": {
                $regex: clientName ? new RegExp(clientName, "i") : new RegExp(".*"),
              },
            },
          });
        }

        if (projectName) {
          aggregationPipeline.push({
            $match: {
              projectName: {
                $regex: projectName ? new RegExp(projectName, "i") : new RegExp(".*"),
              },
            },
          });
        }

        if (req.query.projectDomain) {
          aggregationPipeline.push({
            $match: {
              projectDomain: new mongoose.Types.ObjectId(req.query.projectDomain),
            },
          });
        }

        if (req.query.costType) {
          aggregationPipeline.push({
            $match: {
              projectType: 'Billed',
              costType: req.query.costType,
            },
          });
        }

        if (req.query.costTypeInvoice) {
          aggregationPipeline.push({
            $match: {
              projectType: 'Billed',
              costType: {
                $in: ['Monthly', 'Hourly']
              },
            },
          });
        }

        if (req.query.status) {
          aggregationPipeline.push({
            $match: {
              status: req.query.status,
            },
          });
        }

        if (req.query.taskBoard === 'true') {
          console.log("FUNCTION")
          aggregationPipeline.push({
            $match: {
              $and: [
                { taskBoard: { $exists: true } },
                { taskBoard: true }
              ]
            },
          });
        }

        if (req.query.taskBoard === 'false') {
          aggregationPipeline.push({
            $match: {
              $or: [
                { taskBoard: false }, // Projects where taskBoard is false
                { taskBoard: { $exists: false } }, // Projects where taskBoard doesn't exist
              ]
            },
          });
        }

        if (req.query.projectId) {
          aggregationPipeline.push({
            $match: {
              _id: new mongoose.Types.ObjectId(req.query.projectId),
            },
          });
        }

        // Execute the aggregation query
        const result = await projectManagement.aggregatePaginate(
          projectManagement.aggregate(aggregationPipeline),
          paginateOptions
        );

        return res.status(200).json({
          projects: result,
          success: true,
        });
      }
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to view projects",
        error: error.message,
        success: false,
      });
    }
  },

  viewProjectByClientId: async (req, res) => {
    try {
      let role = req.query.role;
      let id = req.query.id;

      const paginateOptions =
        req.query.page && req.query.limit
          ? { page: req.query.page, limit: req.query.limit }
          : {
              page: 1,
              limit: 10,
            };

      if (role == "client") {
        let projects = await projectManagement.paginate(
          {
            clientId: new mongoose.Types.ObjectId(id),
            deleted: false,
          },
          { 
            ...paginateOptions,
            select: '-cost -costType -adminDocs -teamCost -currency -projectType -paymentSchedule',
            populate: [
              { path: 'projectLead', select: 'fullName imageUrl' },
              { path: 'assignedDevelopers', select: 'fullName imageUrl' },
            ],
          }
        );

        res.status(200).json({
          projects: projects,
          success: true,
        });
      } else if (role == "focalperson") {
        let projects = await projectManagement.paginate(
          { focalPersonId: new mongoose.Types.ObjectId(id), deleted: false },
          { ...paginateOptions,
            select: '-cost -costType -adminDocs -teamCost -currency -projectType -paymentSchedule',
            populate: [
              { path: 'projectLead', select: 'fullName imageUrl' },
              { path: 'assignedDevelopers', select: 'fullName imageUrl' },
            ],
          }
        );
        res.status(200).json({
          projects: projects,
          success: true,
        });
      } else {
        res.status(404),
          json({
            msg: "No such role exists",
            success: false,
          });
      }
    } catch (error) {
      res.status(500).json({
        msg: "Failed to update project",
        error: error.message,
        success: false,
      });
    }
  },

  viewHourlyProjectInvoice: async (req, res) => {
    try {

      let projectId = req.query.projectId;
      let startDate = req.query.invoiceStartDate;
      let endDate = req.query.invoiceEndDate;

      startDate = new Date(startDate);
      endDate = new Date(endDate);
        
        // Check if projectId is provided
        if (!projectId) {
            return res.status(400).json({
                msg: "Project ID is required",
                success: false,
            });
        }

        // Find the project by ID
        const projectDetails = await projectManagement?.findById(projectId);

        // Check if project exists
        if (!projectDetails) {
            return res.status(404).json({
                msg: "Project not found",
                success: false,
            });
        }

        const teamCostWithDetails = await Promise.all(projectDetails?.teamCost
          ?.filter(teamMember => parseFloat(teamMember.cost) !== 0)
          ?.map(async (teamMember) => {
          const { userId, cost } = teamMember;
          const user = await User.findById(userId);
          const userName = user ? user.fullName : 'Unknown';

          console.log(userId, cost, startDate, endDate)
          const timesheets = await timesheetModel.find({
              projectId,
              userId,
              status: "Approved",
              date: { $gte: startDate, $lte: endDate },
              //deleted: false
          });

          //console.log(timesheets)

          let totalMinutes = 0;
          timesheets?.forEach(({ hoursWorked }) => {
              const [hours, minutes] = hoursWorked.split(':').map(Number);
              totalMinutes += hours * 60 + minutes;
          });

          const hoursWorkedDecimal = totalMinutes / 60;
          const total = hoursWorkedDecimal * parseFloat(cost); // cost is hourly rate

          return {
              userId: userId,
              userName: userName,
              cost: cost,
              hoursWorked: hoursWorkedDecimal.toFixed(2), // formatted to 2 decimal places
              total: total.toFixed(2) // formatted to 2 decimal places
          };
      }));

        // Send the project details as a response
        res.status(200).json({
          teamCost: teamCostWithDetails,
          success: true,
        });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to get project",
        error: error.message,
        success: false,
      });
    }
  },

  viewMonthlyProjectInvoice: async (req, res) => {
    try {

      let projectId = req.query.projectId;
      let startDate = req.query.invoiceStartDate;
      let endDate = req.query.invoiceEndDate;

      startDate = new Date(startDate);
      endDate = new Date(endDate);
        
        // Check if projectId is provided
        if (!projectId) {
            return res.status(400).json({
                msg: "Project ID is required",
                success: false,
            });
        }

        // Find the project by ID
        const projectDetails = await projectManagement?.findById(projectId);

        // Check if project exists
        if (!projectDetails) {
            return res.status(404).json({
                msg: "Project not found",
                success: false,
            });
        }

        const teamCostWithDetails = await Promise.all(projectDetails?.teamCost
          ?.filter(teamMember => parseFloat(teamMember.cost) !== 0)
          ?.map(async (teamMember) => {
          const { userId, cost } = teamMember;
          const user = await User.findById(userId);
          const userName = user ? user.fullName : 'Unknown';


          const perDayCost = parseFloat(cost) / 22;

          console.log(userId, cost, startDate, endDate)
          const timesheets = await timesheetModel.find({
              projectId,
              userId,
              status: "Approved",
              date: { $gte: startDate, $lte: endDate },
              //deleted: false
          });

          const daysWorked = timesheets.length;

          const total = daysWorked * perDayCost; 

          return {
              userId: userId,
              userName: userName,
              cost: cost,
              perDayCost: perDayCost.toFixed(2), // formatted to 2 decimal places
              daysWorked: daysWorked,    
              total: total.toFixed(2) // formatted to 2 decimal places
          };
      }));

        // Send the project details as a response
        res.status(200).json({
          teamCost: teamCostWithDetails,
          success: true,
        });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to get project",
        error: error.message,
        success: false,
      });
    }
  },

  updateProject: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = await User.findOne({ _id: userId });
      let isAllowed;
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let roleId = findUser?.roleId;
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "projectManagement", "projectManagement");
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
          msg: "Project id is required",
          success: false,
        });
      }

      var checkStartDate = new Date(data.startDate);
      if (checkStartDate.toString() === "Invalid Date") {
        return res.status(400).json({
          msg: "Invalid Start Date",
          success: false,
        });
      }

      var checkEndDate = new Date(data.endDate);
      if (checkEndDate.toString() === "Invalid Date") {
        return res.status(400).json({
          msg: "Invalid End Date",
          success: false,
        });
      }

      let updateProject = await projectManagement.updateOne({ _id: id }, data);

      res.status(200).json({
        project: updateProject,
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to update project",
        error: error.message,
        success: false,
      });
    }
  },
  deleteProject: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = await User.findOne({ _id: userId });
      let isAllowed;
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let roleId = findUser?.roleId;
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "projectManagement", "projectManagement");
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

      let project = await projectManagement.findOneAndUpdate({ _id }, { deleted: true });

      if (!project) {
        return res.status(404).json({
          msg: "Project with this id not found",
        });
      }

      return res.status(200).json({
        msg: "Project status updated to deleted successfully",
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to delete project",
        error: error.message,
        success: false,
      });
    }
  },
};
module.exports = methods;
