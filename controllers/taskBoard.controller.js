require("dotenv").config();
const projectManagement = require("../models/projectManagement.model");
const tasks = require("../models/tasks.model");
const taskBoard = require("../models/taskBoard.model");
const User = require("../models/user.model");
const Permission = require("../models/permissions.model");
const services = require("../utils/services");

const mongoose = require("mongoose");
 
let methods = {
    addTaskBoard: async (req, res) => {
        try {
            const { projectId } = req.body;

            const foundTasks = await tasks?.find({
                companyId: req?.token?.companyId,
                projectId: projectId,
              }).select("_id");
            let Backlog = foundTasks?.map(task => ({ taskId: task._id }));

            const newTaskBoard = new taskBoard({
                project: projectId,
                columns: [
                    {
                        title:"Backlog",
                        color:"purple",
                        tasks: Backlog ? Backlog : []
                    },
                    {
                        title:"Todo",
                        color:"info",
                        tasks:[]
                    },
                    {
                        title:"In Progress",
                        color:"warning",
                        tasks:[]
                    },
                    {
                        title:"Completed",
                        color:"success",
                        tasks:[]
                    },
                ],
                companyId : req?.token?.companyId,
                deleted: false,
            });

            await newTaskBoard.save();

            await projectManagement.findByIdAndUpdate(projectId, { taskBoard: true });

            const backlogColumnId = newTaskBoard?.columns?.find(column => column.title === "Backlog")._id;

            const taskIds = foundTasks?.map(task => task._id);
            await tasks?.updateMany(
            { _id: { $in: taskIds } },
            { $set: { lane: "Backlog", columnId: backlogColumnId } }
            );

            res.status(200).json({
                taskBoard: newTaskBoard,
                msg: "Task board added successfully",
                success: true,
              });
        } catch (error) {
            console.error("Error adding task board:", error);
            return res.status(500).json({
                msg: "Failed to add task board",
                error: error.message,
                success: false,
              });
        }
    },
    editTaskBoard: async (req, res) => {
        try {
            const { _id, title, color, columnId, taskId, prevColumn, updatedTasks, boardTitle, columns } = req.body;

            const existingTaskBoard = await taskBoard.findById(_id);
    
            if (!existingTaskBoard) {
                return res.status(404).json({
                    msg: "Task board not found",
                    success: false,
                });
            }

            if (boardTitle) {
                existingTaskBoard.boardTitle = boardTitle;

                await existingTaskBoard.save();

                return res.status(200).json({
                    msg: "Task board updated successfully",
                    success: true,
                    data: existingTaskBoard,
                });
            }

            if (columns){
                existingTaskBoard.columns = columns;

                await existingTaskBoard.save();

                return res.status(200).json({
                    taskBoard: existingTaskBoard,
                    msg: "Column Moved successfully",
                    success: true,
                });
            }

            if (columnId && (title || color)) {
                const columnIndex = existingTaskBoard?.columns?.findIndex(column => column._id.toString() === columnId);
                if (columnIndex === -1) {
                    return res.status(404).json({
                        msg: "Column not found in the task board",
                        success: false,
                    });
                }
                const normalizedTitle = title.toLowerCase();
                const isTitleDuplicate = existingTaskBoard?.columns?.some(
                    column => column._id.toString() !== columnId && column.title.toLowerCase() === normalizedTitle
                );
                if (isTitleDuplicate) {
                    return res.status(400).json({
                        msg: "A column with this title already exists",
                        success: false,
                    });
                }
    
                if (title) {
                    existingTaskBoard.columns[columnIndex].title = title;
                }
                if (color) {
                    existingTaskBoard.columns[columnIndex].color = color;
                }
    
                await existingTaskBoard.save();
    
                return res.status(200).json({
                    taskBoard: existingTaskBoard,
                    msg: "Column updated successfully",
                    success: true,
                });
            }

            if (title && color){
                const normalizedTitle = title.toLowerCase();
                const isTitleDuplicate = existingTaskBoard?.columns?.some(column => column.title.toLowerCase() === normalizedTitle);
                if (isTitleDuplicate) {
                    return res.status(400).json({
                        msg: "A column with this title already exists",
                        success: false,
                    });
                }
                const newColumn = {
                    title: title,
                    color: color,
                    tasks: [] 
                };
    
                existingTaskBoard.columns.push(newColumn);
    
                await existingTaskBoard.save();

                return res.status(200).json({
                    taskBoard: existingTaskBoard,
                    msg: "Column added successfully",
                    success: true,
                });
            }

            if (columnId && taskId){

                const columnIndex = existingTaskBoard.columns.findIndex(column => column._id.toString() === columnId);
                if (columnIndex === -1) {
                    return res.status(404).json({
                        msg: "Column not found in the task board",
                        success: false,
                    });
                }

                existingTaskBoard.columns[columnIndex].tasks.push({taskId: taskId});

                await existingTaskBoard.save();

                const task = await tasks.findById(taskId);
                if (task) {
                    task.lane = existingTaskBoard.columns[columnIndex].title;
                    task.columnId = existingTaskBoard.columns[columnIndex]._id;
                    await task.save();
                }

                if (prevColumn) {
                    const columnIndex = existingTaskBoard.columns.findIndex(column => column._id.toString() === prevColumn);
        
                    if (columnIndex === -1) {
                        return res.status(404).json({
                            msg: "Column not found in the task board",
                            success: false,
                        });
                    }

                    const taskIndex = existingTaskBoard.columns[columnIndex].tasks.findIndex(task => task.taskId.toString() === taskId);

                    if (taskIndex === -1) {
                        return res.status(404).json({
                            msg: "Task not found in the column",
                            success: false,
                        });
                    }

                    existingTaskBoard.columns[columnIndex].tasks.splice(taskIndex, 1);

                    await existingTaskBoard.save();
                }

                return res.status(200).json({
                    taskBoard: existingTaskBoard,
                    msg: "Task added to column successfully",
                    success: true,
                });
            }

            if (columnId && updatedTasks) {
                const columnIndex = existingTaskBoard.columns.findIndex(column => column._id.toString() === columnId);
                if (columnIndex === -1) {
                    return res.status(404).json({
                        msg: "Column not found in the task board",
                        success: false,
                    });
                }
                
                existingTaskBoard.columns[columnIndex].tasks = updatedTasks;

                await existingTaskBoard.save();

                return res.status(200).json({
                    taskBoard: existingTaskBoard,
                    msg: "Task added to column successfully",
                    success: true,
                });
            }

        } catch (error) {
            console.error("Error editing task board:", error);
            return res.status(500).json({
                msg: "Failed to edit task board",
                error: error.message,
                success: false,
            });
        }
    },
    
    viewTaskBoard: async (req, res) => {
        try {
            const { projectId } = req.query;
    
            // Find task boards associated with the projectId
            const taskBoards = await taskBoard.find({ project: projectId });
    
            res.status(200).json({
                taskBoards: taskBoards,
                msg: "Task boards retrieved successfully",
                success: true,
            });
        } catch (error) {
            console.error("Error retrieving task boards:", error);
            return res.status(500).json({
                msg: "Failed to retrieve task boards",
                error: error.message,
                success: false,
            });
        }
    },
    
    deleteColumn: async (req, res) => {
        try {
            const { _id, columnId } = req.body._id;

            const existingTaskBoard = await taskBoard.findById(_id);
    
            if (!existingTaskBoard) {
                return res.status(404).json({
                    msg: "Task board not found",
                    success: false,
                });
            }

            const columnIndex = existingTaskBoard.columns.findIndex(column => column._id.toString() === columnId);
    
            if (columnIndex === -1) {
                return res.status(404).json({
                    msg: "Column not found in the task board",
                    success: false,
                });
            }

            for (const task of existingTaskBoard.columns[columnIndex].tasks) {
                await tasks.findByIdAndUpdate(task.taskId, { lane: '' , columnId: null });
            }

            existingTaskBoard.columns.splice(columnIndex, 1);

            await existingTaskBoard.save();
    
            return res.status(200).json({
                msg: "Column deleted successfully",
                success: true,
            });
    
        } catch (error) {
            console.error("Error deleting column:", error);
            return res.status(500).json({
                msg: "Failed to delete column",
                error: error.message,
                success: false,
            });
        }
    },
    
    deleteTaskBoard: async (req, res) => {
        try {
            const { _id } = req.body;
    
            // Find the task board associated with the project ID
            const taskBoardToDelete = await taskBoard.findOneAndDelete({ project: _id });
    
            if (!taskBoardToDelete) {
                return res.status(404).json({
                    msg: "Task board not found for the given project",
                    success: false,
                });
            }
    
            // Set the taskBoard property of the associated project to false
            await projectManagement.findByIdAndUpdate(_id, { taskBoard: false });
    
            for (const column of taskBoardToDelete.columns) {
                // Iterate over each task within the column
                for (const task of column.tasks) {
                    console.log(task);
                    // Find and update each task to set the label property to an empty string
                    const updatedTask = await tasks.findByIdAndUpdate(task.taskId, { lane: '' , columnId: null });
                    console.log(updatedTask);
                }
            }

            return res.status(200).json({
                msg: "Task board deleted successfully",
                success: true,
            });
        } catch (error) {
            console.error("Error deleting task board:", error);
            return res.status(500).json({
                msg: "Failed to delete task board",
                error: error.message,
                success: false,
            });
        }
    },

    removeTask: async (req, res) => {
        try {
            const { _id, columnId, taskId } = req.body._id;

            const existingTaskBoard = await taskBoard.findById(_id);
    
            if (!existingTaskBoard) {
                return res.status(404).json({
                    msg: "Task board not found",
                    success: false,
                });
            }
            const columnIndex = existingTaskBoard.columns.findIndex(column => column._id.toString() === columnId);
        
            if (columnIndex === -1) {
                return res.status(404).json({
                    msg: "Column not found in the task board",
                    success: false,
                });
            }

            const taskIndex = existingTaskBoard.columns[columnIndex].tasks.findIndex(task => task.taskId.toString() === taskId);

            if (taskIndex === -1) {
                return res.status(404).json({
                    msg: "Task not found in the column",
                    success: false,
                });
            }

            existingTaskBoard.columns[columnIndex].tasks.splice(taskIndex, 1);

            await existingTaskBoard.save();

            const task = await tasks.findById(taskId);
                if (task) {
                    task.lane = "";
                    task.columnId = null;
                    await task.save();
                }

            return res.status(200).json({
                msg: "Task removed successfully",
                success: true,
            });

        } catch (error) {
            console.error("Error deleting task board:", error);
            return res.status(500).json({
                msg: "Failed to remove task",
                error: error.message,
                success: false,
            });
        }
    },
    
};
module.exports = methods;
