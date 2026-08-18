let tasks = require("../models/tasks.model");
let Permission = require("../models/permissions.model");
let User = require("../models/user.model");
let taskBoard = require("../models/taskBoard.model");
let services = require("../utils/services");
let mongoose = require("mongoose");
const projectManagementModel = require("../models/projectManagement.model");

let methods = {
  addTask: async (req, res) => {
    try {
      let { _id } = req.token;
      let findUser = await User.findOne({ _id });
      let roleId = findUser.roleId;
      let isAllowed;


      const allowedFields = [
        '_id', 'description', 'projectId', 'title', 'tags',
      ];
  
      // Get the payload keys
      let payloadKeys = Object.keys(req.body);
      console.log(payloadKeys)
  
      // Check for unauthorized fields
      let hasUnauthorizedFields = payloadKeys.some(key => !allowedFields.includes(key));
      console.log(hasUnauthorizedFields)

      if (hasUnauthorizedFields) {
        if (findUser.role === 'admin') {
          isAllowed = true;
        } else {
          let checkPermission = await Permission.findOne({ roleId });
          console.log(checkPermission);
          isAllowed = services.checkPermissions(checkPermission, 'projectManagement', 'projectManagement');
        }
  
        if (!isAllowed) {
          return res.status(401).json({
            msg: 'Unauthorized User',
            success: true,
          });
        }
      }
      // if (findUser.role === "admin") {
      //   isAllowed = true;
      // } else {
      //   // Perform the permission check for non-admin users
      //   let checkPermission = await Permission.findOne({ roleId });
      //   isAllowed = services.checkPermissions(checkPermission, "projectManagement", "projectManagement");
      // }
      // if (!isAllowed) {
      //   return res.status(401).json({
      //     msg: "Unauthorized User",
      //     success: true,
      //   });
      // }
      let companyId = req.token.companyId;

      let data = req.body;
      if (!data) {
        return res.status(404).json({
          msg: "Please Input details",
          success: false,
        });
      }
      data.companyId = companyId;

      let task = new tasks(data);
      let addTask = await task.save();
      if (!addTask) {
        return res.status(404).json({
          msg: "Task is not added",
          success: false,
        });
      }
      return res.status(200).json({
        Task: addTask,
        msg: "Task added",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to add task",
        error: error,
        success: false,
      });
    }
  },

  viewTasks: async (req, res) => {
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
        isAllowed = services.checkPermissions(
          checkPermission,
          "projectManagement",
          "projectManagement"
        );
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
          {
            path: "projectId",
            select: "projectName",
          },
        ],
        sort: { createdAt: -1 },
      };

      let companyId = findUser.companyId;

      const filter = {}; // Create an empty filter object

      if (req.query.title) {
        filter.title = { $regex: req.query.title, $options: "i" };
      }

      //   if (req.query.tag) {
      //     // Search for tasks based on tags
      //     filter.tags = { $in: [req.query.tag] };
      //   }

      if (req.query.tag) {
        // Perform a regex search on tags
        filter.tags = { $regex: req.query.tag, $options: "i" };
      }

      if (req.query.lane == 'empty') {
        // Perform a search for tasks with an empty string as the lane or no lane property
        filter.$or = [
            { lane: { $in: [null, undefined, ''] } },
            { lane: { $exists: false } }
        ];
    } 

      if (!isAllowed) {
        // If the user is not allowed, only show tasks where they are assignedLead or part of assignedDevelopers
        let allowedProjects = await projectManagementModel.find({
          $or: [
            { projectLead: _id },
            { assignedDevelopers: _id }
          ],
          companyId: companyId,
        }).select('_id');

        // Extract project IDs into an array
        let projectIds = allowedProjects.map(project => project._id);

        // Add this condition to the filter
        filter.projectId = { $in: projectIds };
      }

      if (req.query.projectId) {
        console.log(req.query.projectId)
        try {
          // Convert designationId to ObjectId
          filter.projectId = new mongoose.Types.ObjectId(req.query.projectId);
        } catch (error) {
          console.error(error);
        }
      }

      let findTask = await tasks.paginate(
        {
          companyId: companyId,
          ...filter, // Add the filter to the query
        },
        { ...options }
      );

      for (const task of findTask?.docs) {
        if (task.columnId) {
          const board = await taskBoard?.findOne({ companyId: companyId, 'columns.tasks.taskId': task._id });
          if (board) {
            const column = board?.columns?.find(col => col.tasks.some(taskItem => taskItem.taskId.toString() === task._id.toString()));
            if (column) {
              task._doc.columnColor = column.color;
              //console.log(column.color)
              task._doc.boardId = board._id
              task._doc.options = board.columns
              ?.filter(col => col._id.toString() !== column._id.toString())
              ?.map(col => ({
                columnId: col._id,
                title: col.title,
                color: col.color
              }));
              //console.log(task._doc.options)
            }
          }
        }
      }

      return res.status(200).json({
        Task: findTask,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to view tasks",
        error: error,
        success: false,
      });
    }
  },

  updateTask: async (req, res) => {
    try {
      let { _id, companyId } = req.token;
      let findUser = await User.findOne({ _id });
      let roleId = findUser.roleId;
      let isAllowed;

      const allowedFields = [
        '_id', 'description', 'projectId', 'title', 'tags',
      ];
  
      // Get the payload keys
      let payloadKeys = Object.keys(req.body);
      console.log(payloadKeys)
  
      // Check for unauthorized fields
      let hasUnauthorizedFields = payloadKeys.some(key => !allowedFields.includes(key));
      console.log(hasUnauthorizedFields)

      if (hasUnauthorizedFields) {
        if (findUser.role === 'admin') {
          isAllowed = true;
        } else {
          let checkPermission = await Permission.findOne({ roleId });
          console.log(checkPermission);
          isAllowed = services.checkPermissions(checkPermission, 'projectManagement', 'projectManagement');
        }
  
        if (!isAllowed) {
          return res.status(401).json({
            msg: 'Unauthorized User',
            success: true,
          });
        }
      }

      // if (findUser.role === "admin") {
      //   isAllowed = true;
      // } else {
      //   // Perform the permission check for non-admin users
      //   let checkPermission = await Permission.findOne({ roleId });
      //   isAllowed = services.checkPermissions(checkPermission, "projectManagement", "projectManagement");
      // }
      // if (!isAllowed) {
      //   return res.status(401).json({
      //     msg: "Unauthorized User",
      //     success: true,
      //   });
      // }

      let data = req.body;
      let id = data._id;
      if (!id) {
        return res.status(400).json({
          msg: "Task id is required",
          success: false,
        });
      }

      // Retrieve the existing task
      let existingTask = await tasks.findOne({ _id: id });
      if (!existingTask) {
        return res.status(404).json({
          msg: "Task not found",
          success: false,
        });
      }

      let existingProjectId = existingTask?.projectId?.toString()
      //console.log(existingTask?.projectId.toString(), data.projectId)
      console.log(companyId)

      if (data.projectId !== existingProjectId) {
        data.columnId = null;
        data.lane = '';

        const board = await taskBoard?.findOne({ companyId: companyId, project: existingProjectId });
        if (board) {
          // Iterate over columns to find and remove the task
          for (let column of board?.columns) {
              const taskIndex = column?.tasks?.findIndex(task => task?.taskId.toString() === id);
              if (taskIndex !== -1) {
                  column?.tasks?.splice(taskIndex, 1); 
                  break;
              }
          }

          // Save the updated taskBoard
          await board.save();
      }

      }

      let updateTask = await tasks.updateOne({ _id: id }, { ...data });
      res.status(200).json({
        data: updateTask,
        msg: "Task updated",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to update task",
        error: error,
        success: false,
      });
    }
  },

  deleteTask: async (req, res) => {
    try {
      let userId = req.token._id;
      let companyId = req.token.userId;
      let findUser = await User.findOne({ _id: userId });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "projectManagement", "projectManagement");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }
      let data = req.body._id;
      let _id = data?._id;
      let boardId = data?.boardId;
      let projectId = data?.projectId?._id;
      console.log("this is project id", projectId)

      const board = await taskBoard?.findOne({ _id: boardId });
        if (board) {
          console.log("board",board)
          // Iterate over columns to find and remove the task
          for (let column of board?.columns) {
              const taskIndex = column?.tasks?.findIndex(task => task?.taskId.toString() === _id);
              if (taskIndex !== -1) {
                  column?.tasks?.splice(taskIndex, 1); 
                  break;
              }
          }

          // Save the updated taskBoard
          await board.save();
      }

      if (!_id) {
        return res.status(400).json({
          msg: "task id is required",
          success: false,
        });
      }
      let deleteTask = await tasks.findOneAndDelete({ _id });
      if (!deleteTask) {
        return res.status(404).json({
          msg: "No task with this id found",
          success: false,
        });
      }
      return res.status(200).json({
        msg: "task deleted successfully",
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to delete task",
        error: error.message || "Something went wrong.",
        success: false,
      });
    }
  },
};

module.exports = methods;
