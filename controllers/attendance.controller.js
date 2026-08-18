const Attendance = require("../models/attendance.model");
const Request = require("../models/requests.model");
const Shift = require("../models/shift.model");
const User = require("../models/user.model");
const services = require("../utils/services");
const Permission = require("../models/permissions.model");
const moment = require("moment");

let methods = {
  // addAttendance: async (req, res) => {
  //   try {
  //     let data = req.body;
  //     let { _id, companyId } = req.token;

  //     if (!_id) {
  //       return res.status(400).json({
  //         msg: "No User id Found",
  //         success: false,
  //       });
  //     }

  //     let today = new Date(Date.now());
  //     let todayDate = moment(today).format("YYYY-MM-DD");

  //     let findTodayAttendance = await Attendance.findOne({
  //       userId: req.token._id,
  //       attendanceDate: data.attendanceDate,
  //       deleted: false,
  //     });

  //     if (findTodayAttendance) {
  //       return res.status(400).json({
  //         msg: "Attendance already exists for this date",
  //         success: false,
  //       });
  //     }

  //     // let checkRequestIfExist = await Request.findOne({
  //     //   userId: userId,
  //     //   startDate: todayDate,
  //     //   $and: [{ requestType: "leave" }, { status: "Approved" }],
  //     // });

  //     // if (checkRequestIfExist) {
  //     //   return res.status(400).json({
  //     //     msg: "You already have leave approved for today",
  //     //   });
  //     // }

  //     data.userId = _id;
  //     data.companyId = companyId;

  //     let findUser = await User.findOne({ _id }).populate("shiftId");

  //     if (!findUser) {
  //       return res.status(404).json({
  //         msg: "No user record found",
  //         success: false,
  //       });
  //     }
  //     if (findUser.shiftId == null || findUser.shiftId == "") {
  //       return res.status(400).json({
  //         msg: "User have no shift assigned, Allot shift to proceed further",
  //         success: false,
  //       });
  //     }

  //     let attendanceCheckIn;

  //     let shiftStartingTime = moment(findUser.shiftId.maxStartTime, "HH:mm");
  //     if (!data.checkInTime.trim()) {
  //       // If checkInTime is an empty string or contains only whitespace
  //       return res.status(400).json({
  //         msg: "checkInTime cant be an empty string or cant just contain white space",
  //       });
  //     } else {
  //       attendanceCheckIn = moment(data.checkInTime, "HH:mm");
  //     }

  //     shiftStartingTime = new Date(shiftStartingTime).getTime();

  //     let employeeCheckIn = new Date(attendanceCheckIn).getTime();

  //     let difference = (employeeCheckIn - shiftStartingTime) / 60000;

  //     difference = difference.toFixed(3);

  //     if (difference > 0) {
  //       console.log("difference", difference);
  //       data.lateArrival = difference;
  //     }

  //     if (employeeCheckIn > shiftStartingTime) {
  //       data.status = "Late";
  //     } else {
  //       data.status = "Present";
  //     }
  //     let attendanceDate = new Date(moment(data.attendanceDate));
  //     data.attendanceMonth = attendanceDate.toLocaleString("default", {
  //       month: "long",
  //     });

  //     data.attendanceYear = moment(data.attendanceDate).year().toString();

  //     let attendance = new Attendance(data);

  //     let addAttendance = await attendance.save();

  //     if (!addAttendance) {
  //       return res.status(404).json({
  //         addAttendance: "No data Found to Add the Attendance",
  //       });
  //     }
  //     return res.status(200).json({
  //       Attendance: addAttendance,
  //       msg: "Attendance added",
  //       success: true,
  //     });
  //   } catch (error) {
  //     return res.status(500).json({
  //       msg: "Failed to add attendance",
  //       error: error.message,
  //       success: false,
  //     });
  //   }
  // },

  addAttendance: async (req, res) => {
    try {
      let data = req.body;
      let { _id, companyId } = req.token;

      if (!_id) {
        return res.status(400).json({
          msg: "No User id Found",
          success: false,
        });
      }

      let today = new Date(Date.now());
      let nowTime = moment(today).format("HH:mm")
      //let nowTime = "12:41"
      console.log("this is",nowTime)
      today = moment(today).format("YYYY-MM-DD");
      

      let testTime = moment(data.checkInTime, "HH:mm");
      let currentTime = moment(nowTime, "HH:mm");
      console.log("this is initial server",currentTime)

      // Subtract 1 minute from currentTime
      let timeThreshold = currentTime.subtract(1, 'minute');
      console.log("this is threshold server",timeThreshold)
      console.log("this is chekIn",data.checkInTime,testTime)
      // Compare checkInTime with the timeThreshold
      if (testTime.isBefore(timeThreshold)) {
        return res.status(400).json({
          msg: "Attendance cannot be marked for past time",
          success: false,
        });
      }
      //console.log(data.attendanceDate, today)

      if (moment(data.attendanceDate).isBefore(today, 'day')) {
        //console.log("hello")
        return res.status(400).json({
          msg: "Attendnace cannot be marked for past dates",
          success: false,
        });
      }
      if (moment(data.attendanceDate).isAfter(today, 'day')) {
        //console.log("hello")
        return res.status(400).json({
          msg: "Attendnace cannot be marked for future dates",
          success: false,
        });
      }
      // if (findTodayAttendance) {
      //   return res.status(400).json({
      //     msg: "Attendance already exists for this date",
      //     success: false,
      //   });
      // }

      let existingAttendance = await Attendance.findOne({
        userId: _id,
        attendanceDate: today,
      });
  console.log("this is data",data)
      if (!existingAttendance) {
        existingAttendance = new Attendance({
          userId: _id,
          companyId: companyId,
          attendanceDate: data.attendanceDate,
        });
      }

      data.userId = _id;
      data.companyId = companyId;

      let findUser = await User.findOne({ _id }).populate("shiftId");

      if (!findUser) {
        return res.status(404).json({
          msg: "No user record found",
          success: false,
        });
      }
      if (findUser.shiftId == null || findUser.shiftId == "") {
        return res.status(400).json({
          msg: "User have no shift assigned, Allot shift to proceed further",
          success: false,
        });
      }

      let attendanceCheckIn;

      let shiftStartingTime = moment(findUser.shiftId.maxStartTime, "HH:mm");
      if (!data.checkInTime.trim()) {
        // If checkInTime is an empty string or contains only whitespace
        return res.status(400).json({
          msg: "checkInTime cant be an empty string or cant just contain white space",
          success: false,
        });
      } else {
        attendanceCheckIn = data.checkInTime
      }

      let lengthArray = existingAttendance?.attendanceRecords?.length

      //console.log(existingAttendance?.attendanceRecords[lengthArray-1].checkOutTime)
      if (existingAttendance?.attendanceRecords && existingAttendance?.attendanceRecords?.length > 0 && !existingAttendance?.attendanceRecords[lengthArray-1]?.checkOutTime) {
        return res.status(400).json({
          msg: "Error marking attendance, please refresh you page",
          success: false,
        });
      }

      let newAttendanceRecord = {
        checkInTime: attendanceCheckIn,
      };

      existingAttendance?.attendanceRecords?.push(newAttendanceRecord);

      let firstCheckIn = existingAttendance?.attendanceRecords[0]?.checkInTime;
      if (firstCheckIn){
        firstCheckIn = moment(firstCheckIn, "HH:mm")
      }

      shiftStartingTime = new Date(shiftStartingTime).getTime();

      let employeeCheckIn = firstCheckIn ? new Date(firstCheckIn).getTime() : new Date(attendanceCheckIn).getTime() ;

      let difference = (employeeCheckIn - shiftStartingTime) / 60000;

      difference = difference.toFixed(3);

      if (difference > 0) {
        console.log("difference", difference);
        existingAttendance.lateArrival = difference;
      }

      if (employeeCheckIn > shiftStartingTime) {
        existingAttendance.status = "Late";
      } else {
        existingAttendance.status = "Present";
      }
      let attendanceDate = new Date(moment(data.attendanceDate));
      existingAttendance.attendanceMonth = attendanceDate.toLocaleString("default", {
        month: "long",
      });

      existingAttendance.attendanceYear = moment(data.attendanceDate).year().toString();

      let attendance = new Attendance(existingAttendance);

      let addAttendance = await attendance.save();

      if (!addAttendance) {
        return res.status(404).json({
          addAttendance: "No data Found to Add the Attendance",
        });
      }
      return res.status(200).json({
        Attendance: addAttendance,
        msg: "Attendance added",
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to add attendance",
        error: error.message,
        success: false,
      });
    }
  },

  myAttendance: async (req, res) => {
    try {
      let _id = req.token._id;
      let today = new Date(Date.now());
      let attendanceDate = req.query.attendanceDate;
      let attendanceMonth = req.query.attendanceMonth;
      let attendanceYear = req.query.attendanceYear;

      let user = await User.findOne({ _id }).populate("shiftId").select("shiftId");

      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      const monthName = monthNames[today.getMonth()];

      // Get the year
      const year = today.getFullYear();

      let todayDate = moment(today).format("YYYY-MM-DD");

      if (!_id) {
        return res.status(400).json({
          msg: "No id passed for desired attendance",
          success: false,
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
        deleted: false,
        sort: { attendanceDate: -1 },
      };

      let query = { userId: _id, attendanceDate: { $lte: todayDate } };

      if (attendanceDate) {
        query.attendanceDate = attendanceDate;
      }
      if (attendanceMonth) {
        query.attendanceMonth = attendanceMonth;
      }

      if (attendanceYear) {
        query.attendanceYear = attendanceYear;
      }

      let findAttendance = await Attendance.paginate(
        {
          ...query,
        },
        { ...options }
      );

      let lastWeekAttendance = await Attendance.find({ userId: _id }).sort({ createdAt: -1 }).limit(5);

      // Step 2: Calculate the total hoursWorked from these records
      let weekHoursWorked = 0;

      for (const record of lastWeekAttendance) {
        const hoursWorked = parseFloat(record.hoursWorked);

        if (!isNaN(hoursWorked)) {
          weekHoursWorked += hoursWorked;
        } else {
          console.error(`Invalid hoursWorked value for record with ID ${record._id}`);
        }
      }

      let lastMonthAttendance = await Attendance.find({
        userId: _id,
        attendanceMonth: monthName,
        attendanceYear: year,
      }).sort({ createdAt: -1 });
      // Step 2: Calculate the total hoursWorked from these records
      let monthHoursWorked = 0;

      for (const record of lastMonthAttendance) {
        const hoursWorked = parseFloat(record.hoursWorked);

        if (!isNaN(hoursWorked)) {
          monthHoursWorked += hoursWorked;
        } else {
          console.error(`Invalid hoursWorked value for record with ID ${record._id}`);
        }
      }

      if (!findAttendance) {
        return res.status(200).json({
          findAttendance: "",
          success: true,
        });
      }

      return res.status(200).json({
        Attendance: findAttendance,
        lastWeek: weekHoursWorked,
        lastMonth: monthHoursWorked,
        user: user,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to get My attendance",
        error: error.message,
        success: false,
      });
    }
  },

  employeesAttendance: async (req, res) => {
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
        isAllowed = services.checkPermissions(checkPermission, "attendanceManagement", "attendanceManagement");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }
      let today = new Date(Date.now()); // Use the current date
      today = moment(today).format("YYYY-MM-DD");
      const sortOrder = req.query.sortOrder;
      let attendanceMonth = req.query?.attendanceMonth;
      let attendanceYear = req.query?.attendanceYear;
      const search = req.query?.search;

      const check = await User.findOne({ _id: _id, deleted: false });

      if (!check) {
        return res.status(404).json({
          msg: "User does not exist",
          success: false,
        });
      }

      const companyId = check.companyId;

      const paginateOptions = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
      };

      const attendanceFilter = {};
      let currentMonth = new Date(moment(Date.now()));
      currentMonth = currentMonth.toLocaleString("default", {
        month: "long",
      });

      let currentYear = moment(Date.now()).year().toString();

      if (!attendanceMonth) {
        attendanceMonth = currentMonth;
      }

      if (!attendanceYear) {
        attendanceYear = currentYear;
      }

      if (attendanceMonth) {
        attendanceFilter.attendanceMonth = attendanceMonth;
      }
      if (attendanceYear) {
        attendanceFilter.attendanceYear = attendanceYear;
      }

      const pipeline = [
        {
          $match: {
            companyId: companyId,
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
            ...attendanceFilter,
            deleted: false,
            "user.fullName": {
              $regex: search ? new RegExp(search, "i") : new RegExp(".*"),
            },
          },
        },
        {
          $project: {
            _id: 1,
            userId: 1,
            note: 1,
            attendanceDate: 1,
            attendanceMonth: 1,
            attendanceYear: 1,
            checkInTime: 1,
            checkOutTime: 1,
            attendanceRecords: 1,
            hoursWorked: 1,
            lateArrival: 1,
            overTime: 1,
            status: 1,
            createdAt: 1,
            updatedAt: 1,

            user: {
              _id: "$user._id",
              fullName: "$user.fullName",
            },
          },
        },
      ];

      const result = await Attendance.aggregate(pipeline);
      let todayPresent = await Attendance.countDocuments({
        attendanceDate: today,
        companyId: companyId,
        status: "Present",
      });

      let todayLate = await Attendance.countDocuments({
        attendanceDate: today,
        companyId: companyId,
        status: "Late",
      });

      let todayAbsent = await Attendance.countDocuments({
        attendanceDate: today,
        companyId: companyId,
        status: "Absent",
      });

      let wfhToday = await Request.countDocuments({
        startDate: today,
        companyId: companyId,
        requestType: "wfh",
      });

      // paginateOptions
      if (!result) {
        return res.status(200).json({
          Attendance: {},
          success: true,
        });
      }

      return res.status(200).json({
        Attendance: result,
        todayPresent: todayPresent + todayLate,
        todayLate: todayLate,
        todayAbsent: todayAbsent,
        wfhToday: wfhToday,
        success: true,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        msg: "Failed to get All Employees Attendance",
        error: error.message,
        success: false,
      });
    }
  },

  MobileAttendance: async (req, res) => {
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
        isAllowed = services.checkPermissions(checkPermission, "attendanceManagement", "attendanceManagement");
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

      let today = new Date(Date.now()); // Use the current date
      today = moment(today).format("YYYY-MM-DD");
      let attendanceMonth = req.query?.attendanceMonth;
      let attendanceYear = req.query?.attendanceYear;
      let attendanceDate = req.query?.attendanceDate;
      const search = req.query?.search;

      const check = await User.findOne({ _id: _id, deleted: false });

      if (!check) {
        return res.status(404).json({
          msg: "User does not exist",
          success: false,
        });
      }

      const companyId = check.companyId;

      const attendanceFilter = {};
      let currentMonth = new Date(moment(Date.now()));
      currentMonth = currentMonth.toLocaleString("default", {
        month: "long",
      });

      let currentYear = moment(Date.now()).year().toString();

      if (!attendanceMonth) {
        attendanceMonth = currentMonth;
      }

      if (!attendanceYear) {
        attendanceYear = currentYear;
      }

      if (attendanceMonth) {
        attendanceFilter.attendanceMonth = attendanceMonth;
      }
      if (attendanceYear) {
        attendanceFilter.attendanceYear = attendanceYear;
      }

      const pipeline = [
        {
          $match: {
            companyId: companyId,
            deleted: false
          }
        },
        {
          $lookup: {
            from: "attendances",
            let: { userId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$userId", "$$userId"] },
                      { $eq: ["$deleted", false] },
                      { $eq: ["$attendanceMonth", attendanceMonth] },
                      { $eq: ["$attendanceYear", attendanceYear] },
                      ...(attendanceDate ? [{ $eq: ["$attendanceDate", attendanceDate] }] : [])
                    ]
                  }
                }
              }
            ],
            as: "attendances"
          }
        },
        {
          $unwind: {
            path: "$attendances",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: "designations",
            localField: "designationId",
            foreignField: "_id",
            as: "designation"
          }
        },
        {
          $unwind: {
            path: "$designation",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $match: {
            ...(search ? { "fullName": { $regex: new RegExp(search, "i") } } : {})
          }
        },
        {
          $group: {
            _id: "$_id",
            fullName: { $first: "$fullName" },
            imageUrl: { $first: "$imageUrl" },
            createdAt: { $first: "$createdAt" },
            designationName: { $first: "$designation.designationName" },
            attendances: {
              $push: {
                note: "$attendances.note",
                attendanceDate: "$attendances.attendanceDate",
                attendanceMonth: "$attendances.attendanceMonth",
                attendanceYear: "$attendances.attendanceYear",
                attendanceRecords: "$attendances.attendanceRecords",
                hoursWorked: "$attendances.hoursWorked",
                lateArrival: "$attendances.lateArrival",
                overTime: "$attendances.overTime",
                status: "$attendances.status"
              }
            }
          }
        },
        {
          $sort: {
            createdAt: 1
          }
        },
        {
          $project: {
            _id: 1,
            fullName: 1,
            imageUrl: 1,
            createdAt: 1,
            designationName: 1,
            attendances: 1
          }
        }
      ];

      // const pipeline = [
      //   {
      //     $match: {
      //       companyId: companyId,
      //     },
      //   },
      //   {
      //     $lookup: {
      //       from: "users",
      //       localField: "userId",
      //       foreignField: "_id",
      //       as: "user",
      //     },
      //   },
      //   {
      //     $unwind: {
      //       path: "$user",
      //       preserveNullAndEmptyArrays: true,
      //     },
      //   },
      //   {
      //     $match: {
      //       ...attendanceFilter,
      //       deleted: false,
      //       "user.fullName": {
      //         $regex: search ? new RegExp(search, "i") : new RegExp(".*"),
      //       },
      //     },
      //   },
      //   {
      //     $group: {
      //       _id: "$user._id",
      //       fullName: { $first: "$user.fullName" },
      //       imageUrl: { $first: "$user.imageUrl" },
      //       createdAt: { $first: "$user.createdAt" }, 
      //       attendances: {
      //         $push: {
      //           note: "$note",
      //           attendanceDate: "$attendanceDate",
      //           attendanceMonth: "$attendanceMonth",
      //           attendanceYear: "$attendanceYear",
      //           attendanceRecords: "$attendanceRecords",
      //           hoursWorked: "$hoursWorked",
      //           lateArrival: "$lateArrival",
      //           overTime: "$overTime",
      //           status: "$status"
      //         }
      //       }
      //     }
      //   },
      //   {
      //     $sort: {
      //       createdAt: 1, 
      //     },
      //   },
      //   {
      //     $project: {
      //       _id: 1,
      //       fullName: 1,
      //       imageUrl: 1,
      //       createdAt: 1, 
      //       attendances: 1
      //     }
      //   }
      // ];
      
      // const result = await Attendance.aggregatePaginate(
      //   Attendance.aggregate(pipeline),
      //   paginateOptions
      // );
      
      const result = await User.aggregatePaginate(
        User.aggregate(pipeline),
        paginateOptions
      );
      
      let todayPresent = await Attendance.countDocuments({
        attendanceDate: today,
        companyId: companyId,
        status: "Present",
      });

      let todayLate = await Attendance.countDocuments({
        attendanceDate: today,
        companyId: companyId,
        status: "Late",
      });

      let todayAbsent = await Attendance.countDocuments({
        attendanceDate: today,
        companyId: companyId,
        status: "Absent",
      });

      let wfhToday = await Request.countDocuments({
        startDate: today,
        companyId: companyId,
        requestType: "wfh",
      });

      // paginateOptions
      if (!result) {
        return res.status(200).json({
          Attendance: {},
          success: true,
        });
      }

      return res.status(200).json({
        Attendance: result,
        todayPresent: todayPresent + todayLate,
        todayLate: todayLate,
        todayAbsent: todayAbsent,
        wfhToday: wfhToday,
        success: true,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        msg: "Failed to get All Employees Attendance",
        error: error.message,
        success: false,
      });
    }
  },

  updateAttendance: async (req, res) => {
    try {
      let data = req.body;
      let today = new Date(Date.now());
      let todayDate = moment(today).format("YYYY-MM-DD");
      console.log(todayDate);
      let attendanceId = data._id;
      let attendanceRecordId = data.attendanceRecordId;
      if (!attendanceId) {
        return res.status(400).json({
          msg: "Provide the id of attendance record to update",
          success: false,
        });
      }
      console.log(data);

      let findAttendance = await Attendance.findOne({
        _id: attendanceId,
      }).populate("userId");

      if (!findAttendance) {
        return res.status(404).json({
          msg: "No record found on given id",
          success: false,
        });
      }

      let findAttendanceRecords = await Attendance.findOne({
        _id: attendanceId
      }).select("attendanceRecords");
      
      if (!findAttendanceRecords) {
        return res.status(404).json({
          msg: "No attendance record with this ID found",
          success: false
        });
      }
      let totalHoursWorked = 0;
      findAttendanceRecords?.attendanceRecords?.forEach(record => {
        totalHoursWorked += parseFloat(record?.hoursWorked) || 0;
      });

      let checkOut = findAttendance.checkOutTime;

      //totalHoursWorked = totalHoursWorked.toFixed(3)
      if (!checkOut) {
        let shiftId = findAttendance.userId.shiftId;

        let findShift = await Shift.findOne({ _id: shiftId });

        if (!findShift) {
          return res.status(404).json({
            msg: "No shift Found",
            success: false,
          });
        }

        // if (!findShift) {
        //   return res.status(404).json({

        //   })
        // }
        let findAttendanceRecord = await Attendance.findOne(
          {
            _id: attendanceId,
            "attendanceRecords._id": attendanceRecordId
          },
          {
            "attendanceRecords.$": 1
          }
        );
        
        if (!findAttendanceRecord) {
          return res.status(404).json({
            msg: "No attendance record with this ID found",
            success: false
          });
        }
        
        let checkInTime = findAttendanceRecord.attendanceRecords[0].checkInTime;

        let endingTime = findShift.endTime;

        //let checkInTime = findAttendance.checkInTime;
        let checkOutTime = data.checkOutTime;

        if (!checkOutTime || !checkOutTime.trim()) {
          return res.status(400).json({
            msg: "checkOutTime can't be an empty string or contain only white space",
          });
        }

        let end = moment(endingTime, "HH:mm");
        let attendanceCheckOut = moment(checkOutTime, "HH:mm");
        let attendanceCheckIn = moment(checkInTime, "HH:mm");

        end = new Date(end).getTime();

        let employeeCheckingOutTime = new Date(attendanceCheckOut).getTime();
        // out = new Date(out).getTime();

        let result = (employeeCheckingOutTime - end) / 60000;

        result = result.toFixed(3);

        if (result > 0) {
          findAttendance.overTime = result;
        }

        let hoursWorked = (new Date(attendanceCheckOut).getTime() - new Date(attendanceCheckIn).getTime()) / 60000;
        totalHoursWorked = totalHoursWorked + hoursWorked

        hoursWorked = hoursWorked.toFixed(3);

        if (hoursWorked < 0) {
          hoursWorked = "0";
        }

        totalHoursWorked = totalHoursWorked.toFixed(3)
        let updateAttendance = await Attendance.findOneAndUpdate(
          {
            _id: attendanceId,
            "attendanceRecords._id": attendanceRecordId,
          },
          {
            $set: {
              "attendanceRecords.$.checkOutTime": data.checkOutTime,
              "attendanceRecords.$.hoursWorked": hoursWorked,
              hoursWorked: totalHoursWorked , // assuming hoursWorked is calculated properly
              overTime: findAttendance.overTime,
            }
          },
          {
            new: true,
          }
        );

        if (!updateAttendance) {
          return res.status(404).json({
            msg: "No attendance record with this ID found",
            success: false,
          });
        }
        return res.status(200).json({
          Attendance: updateAttendance,
          success: true,
        });
      } else {
        res.status(200).json({
          msg: "CheckIn First",
          success: true,
        });
      }
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to update Attendance",
        error: error.message,
        success: false,
      });
    }
  },

  updateEmployeeAttendance: async (req, res) => {
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
        isAllowed = services.checkPermissions(checkPermission, "attendanceManagement", "attendanceManagement");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }
      let data = req.body;

      let today = new Date(Date.now());

      let todayDate = moment(today).format("YYYY-MM-DD");

      let attendanceId = data._id;

      if (!attendanceId) {
        return res.status(400).json({
          msg: "Provide the id of attendance record to update",

          success: false,
        });
      }

      let findAttendance = await Attendance.findOne({
        _id: attendanceId,
      }).populate("userId");

      if (!findAttendance) {
        return res.status(404).json({
          msg: "No record found on given id",

          success: false,
        });
      }

      let checkOut = findAttendance.checkOutTime;

      let shiftId = findAttendance.userId.shiftId;

      let findShift = await Shift.findOne({ _id: shiftId });

      if (!findShift) {
        return res.status(404).json({
          msg: "No shift Found",
          success: false,
        });
      }

      let endingTime = findShift.endTime;

      let checkInTime = data?.checkInTime;

      let checkOutTime = data?.checkOutTime;
      console.log("this is",checkOutTime)

      let end = moment(endingTime, "HH:mm");

      let attendanceCheckOut = moment(checkOutTime, "HH:mm");

      let attendanceCheckIn = moment(checkInTime, "HH:mm");

      end = new Date(end).getTime();

      let employeeCheckingOutTime = new Date(attendanceCheckOut).getTime();

      // out = new Date(out).getTime();

      let result = (employeeCheckingOutTime - end) / 60000;

      result = result.toFixed(3);

      if (result > 0) {
        findAttendance.overTime = result;
      }

      let hoursWorked = (new Date(attendanceCheckOut).getTime() - new Date(attendanceCheckIn).getTime()) / 60000;

      hoursWorked = hoursWorked.toFixed(3);

      if (hoursWorked < 0) {
        hoursWorked = "0";
      }

      let updateAttendance = await Attendance.findOneAndUpdate(
        { _id: attendanceId },

        //data

        {
          attendanceRecords: [
            {
              checkInTime: data.checkInTime,
              checkOutTime: data.checkOutTime,
              hoursWorked: data?.checkOutTime ? hoursWorked : "0",
            }
          ],
          hoursWorked: data?.checkOutTime ? hoursWorked : "0",
          overTime: findAttendance.overTime,
          status: data.status,
        },
        {
          new: true,
        }
      );

      if (!updateAttendance) {
        return res.status(404).json({
          msg: "No attendance record with this ID found",
          success: false,
        });
      }

      return res.status(200).json({
        Attendance: updateAttendance,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to update Attendance",
        error: error.message,
        success: false,
      });
    }
  },

  deleteAttendance: async (req, res) => {
    try {
      let _id = req.body._id;
      if (!_id) {
        return res.status(400).json({
          msg: "Provide the id attendance record to set record status to deleted",
          success: false,
        });
      }
      let attendance = await Attendance.findOne({ _id });
      if (!attendance) {
        return res.status(404).json({
          msg: "Attendance with this id not found",
          success: false,
        });
      } else {
        if (attendance.deleted == true) {
          return res.status(200).json({
            msg: "Attendance with this id already deleted",
            success: true,
          });
        }
        await Attendance.updateOne({ _id }, { deleted: true });
        return res.status(200).json({
          msg: "Attendance with this id status updated to deleted",
          success: true,
        });
      }
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to Delete Attendance",
        error: error.message,
        success: false,
      });
    }
  },
  graphAttendance: async (req, res) => {
    try {
      let userId = req.query._id;
      let companyID = req.token.companyID;

      let limit = req.query.limit;
      if (!limit || limit <= 0) {
        limit = 7;
      }

      let findUser = await User.findOne({ _id: userId, companyID: companyID }).populate("shiftId").populate("team");

      if (!findUser) {
        return res.status(404).json({
          msg: "User with this ID not found",
          success: false,
        });
      }

      let teamLeadName;

      if (findUser.teamLead == null) {
        teamLeadName = "";
      } else {
        let teamLeadId = findUser.teamLead;
        let teamLeadProfile = (await User.findOne({ _id: teamLeadId })) || (await Admin.findOne({ _id: teamLeadId }));
        if (!teamLeadProfile) {
          teamLeadName = "";
        } else {
          teamLeadName = teamLeadProfile.employeeName || teamLeadProfile.name;
        }
      }
      let starting = findUser?.shiftId?.startTime ? findUser?.shiftId?.startTime : "";
      if (starting) {
        starting = starting.slice(0, 5);
      } else {
        starting = "";
      }

      let ending = findUser?.shiftId?.endTime ? findUser?.shiftId?.endTime : "";
      if (ending) {
        ending = ending.slice(0, 5);
      } else {
        ending = "";
      }

      let today = new Date(Date.now());
      let todayDate = moment(today).format("YYYY-MM-DD");

      let todayAttendance = await Attendance.findOne({
        userId: userId,
        attendanceDate: todayDate,
      }).sort({
        createdAt: -1,
      });

      if (!todayAttendance) {
        todayAttendance = "";
      }

      let todayCheckIn = todayAttendance.checkInTime;

      if (!todayCheckIn) {
        todayCheckIn = "";
      }

      let todayCheckOut = todayAttendance.checkOutTime;

      if (!todayCheckOut) {
        todayCheckOut = "";
      }

      let findAttendance = await Attendance.find({
        userId: userId,
        attendanceDate: { $lte: todayDate },
      })
        .select("hoursWorked")
        .select("status")
        .select("attendanceDate")
        .sort({ attendanceDate: -1 })
        .limit(limit);

      if (!findAttendance) {
        findAttendance = "";
      }
      let sortedData = findAttendance.sort(function (a, b) {
        return new Date(a.attendanceDate) - new Date(b.attendanceDate);
      });
      return res.status(200).json({
        GraphAttendance: sortedData,
        userAttendance: {
          checkIn: todayCheckIn,
          checkOut: todayCheckOut,
        },

        User: {
          userName: findUser.employeeName ? findUser.employeeName : "--",
          teamName: findUser?.team?.teamName ? findUser.team.teamName : "--",
          teamLead: teamLeadName ? teamLeadName : "--",
          position: findUser.positionName ? findUser.positionName : "--",
          shift: starting + "-" + ending,
        },

        Month: {
          leavesAlloted: findUser.totalLeaves,
          sickLeaves: findUser.sickLeaves,
          casualLeaves: findUser.casualLeaves,
          remainingLeaves: findUser.remainingLeaves,
        },
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to get overview screen data",
        error: error.message,
        success: false,
      });
    }
  },
};

module.exports = methods;
