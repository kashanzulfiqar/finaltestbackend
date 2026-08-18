const Attendance = require("../models/attendance.model");
const user = require("../models/user.model");
let shift = require("../models/shift.model");
const holidays = require("../models/holidays.model");
const moment = require("moment");
const cronJob = require("node-cron");
const companyModel = require("../models/company.model");

attendanceCheckingOutScenario = async () => {
  let todayDate = new Date(Date.now());
  todayDate = moment(todayDate).format("YYYY-MM-DD");
  //todayDate = JSON.stringify(todayDate);
  //todayDate = todayDate.split(`"`)[1].split("T")[0];
  //console.log("this is",todayDate)
  let attendance = await Attendance?.aggregate([
    {
      $match: {
        attendanceDate: todayDate
      }
    },
    {
      $addFields: {
        firstRecordCheckInTime: { $arrayElemAt: ["$attendanceRecords.checkInTime", 0] },
        lastRecordCheckOutTime: { $arrayElemAt: ["$attendanceRecords.checkOutTime", -1] }
      }
    },
    {
      $match: {
        firstRecordCheckInTime: { $ne: null },
        lastRecordCheckOutTime: null
      }
    }
  ]);
  
  //console.log(todayDate)
  //console.log(attendance)

  for (let i = 0; i < attendance.length; i++) {
    let userId = await attendance[i].userId;
    let attendanceUser = await user.findOne({ _id: userId }).populate("shiftId");
    let shiftEndingTime = attendanceUser.shiftId.endTime;
    shiftEndingTime = moment(shiftEndingTime, "HH:mm:ss");
    shiftEndingTime = new Date(shiftEndingTime).getTime();
    let currentTime = new Date(Date.now()).getTime();
    //console.log(currentTime, shiftEndingTime);
    if (shiftEndingTime <= currentTime) {
      let checkAttendance = await Attendance.findOne({
        attendanceDate: todayDate,
        userId: userId,
      });

      let totalHoursWorked = 0;
      let len = checkAttendance?.attendanceRecords?.length;
      let checkingInTime = moment(checkAttendance?.attendanceRecords[len-1]?.checkInTime, "HH:mm");
      let inTime = checkAttendance?.attendanceRecords[len-1]?.checkInTime;
      //let checkingOutTime = moment(checkAttendance?.attendanceRecords[len-1]?.checkOutTime, "HH:mm");
      checkingInTime = new Date(checkingInTime).getTime();

      let hoursWorked = (shiftEndingTime - checkingInTime) / 60000;
      
      let outTime = attendanceUser.shiftId.endTime;
      if (shiftEndingTime <= checkingInTime) {
        outTime = inTime
        hoursWorked = 0.000;
        //console.log(inTime)
      }
        
      //console.log("hekllo")
      checkAttendance?.attendanceRecords?.forEach(record => {
        totalHoursWorked += parseFloat(record?.hoursWorked) || 0;
      });

      totalHoursWorked = totalHoursWorked + hoursWorked;
      //console.log(hoursWorked)
      //console.log(totalHoursWorked)

      let findAttendance = await Attendance.findOne({ attendanceDate: todayDate, userId: userId });

      if (findAttendance && findAttendance.attendanceRecords[len-1].checkInTime && !findAttendance.attendanceRecords[len-1].checkOutTime) {
        const lastIndex = findAttendance?.attendanceRecords?.length - 1;
  
        //findAttendance.attendanceRecords[lastIndex].checkOutTime = attendanceUser.shiftId.endTime;
        findAttendance.attendanceRecords[lastIndex].checkOutTime = outTime;
        findAttendance.attendanceRecords[lastIndex].hoursWorked = hoursWorked;
        findAttendance.hoursWorked = totalHoursWorked;

        await findAttendance.save();
    }

      // let findAttendance = await Attendance.findOneAndUpdate(
      //   {
      //     attendanceDate: todayDate,
      //     userId: userId,
      //   },
      //   {
          
      //       "attendanceRecords.-1.checkOutTime": attendanceUser.shiftId.endTime,
      //       "attendanceRecords.-1.hoursWorked": hoursWorked,
      //       hoursWorked: totalHoursWorked,
        
      //   },
      //   { new: true }
      // );
    }
  }
};

// const absentScenario = async () => {
//   let today = new Date(Date.now());
//   let todayDate = moment(today).format("YYYY-MM-DD");
//   let attendance = await Attendance.find({
//     attendanceDate: todayDate,
//     $and: [
//       { checkInTime: { $ne: null, $ne: "" } },
//       {
//         $or: [{ checkOutTime: { $ne: null, $ne: "" } }, { checkOutTime: null }],
//       },
//     ],
//   });

//   let arr1 = [];
//   for (let i = 0; i < attendance.length; ++i) {
//     let employeesId = await attendance[i].userId;
//     arr1.push(employeesId);
//   }

//   let findUser = await user.find({
//     deleted: false,
//     shiftId: { $ne: null } || { $ne: "" },
//   });
//   let arr = [];
//   for (let i = 0; i < findUser.length; ++i) {
//     let employeesId = await findUser[i]._id;
//     arr.push(employeesId);
//   }

//   let absentEmployee = [];
//   for (let i = 0; i < arr.length; i++) {
//     if (!arr1.includes(arr[i])) {
//       // Check if employee already has attendance record for today
//       let hasAttendance = await Attendance.exists({
//         userId: arr[i],
//         attendanceDate: todayDate,
//       });
//       if (!hasAttendance) {
//         absentEmployee.push(arr[i]);
//       }
//     }
//   }

//   let attendanceMonth = new Date(new Date());
//   attendanceMonth = attendanceMonth.toLocaleString("default", {
//     month: "long",
//   });

//   let attendanceYear = moment(new Date()).year().toString();

//   for (let i = 0; i < absentEmployee.length; i++) {
//     // console.log("i am here");
//     let userId = await absentEmployee[i]._id;
//     // console.log(userId);
//     let absentUser = await user.findOne({ _id: userId })?.populate("shiftId");
//     // console.log(absentUser);
//     let shiftEndingTime = absentUser?.shiftId?.endTime;
//     // console.log(shiftEndingTime);
//     shiftEndingTime = moment(shiftEndingTime, "HH:mm:ss");
//     shiftEndingTime = new Date(shiftEndingTime).getTime();
//     let currentTime = new Date(Date.now()).getTime();
//     let data = {};
//     data.companyId = data.note = "";
//     data.attendanceDate = todayDate;
//     data.attendanceMonth = attendanceMonth;
//     data.attendanceYear = attendanceYear;
//     data.userId = userId;
//     data.companyId = absentUser.companyId;
//     data.checkInTime = "";
//     data.checkOutTime = "";
//     data.hoursWorked = 0;
//     data.overTime = null;
//     data.status = "Absent";
//     if (shiftEndingTime <= currentTime) {
//       let createAttendance = new Attendance(data);
//       await createAttendance.save();
//     }
//   }
const absentScenario = async (companyId) => {
  let today = new Date(Date.now());
  let todayDate = moment(today).format("YYYY-MM-DD");
  let attendance = await Attendance.find({
    companyId: companyId,
    attendanceDate: todayDate,
    $and: [
      { "attendanceRecords.checkInTime": { $ne: null, $ne: "" } },
      {
        $or: [{ "attendanceRecords.checkOutTime": { $ne: null, $ne: "" } }, { "attendanceRecords.checkOutTime": null }],
      },
    ],
  });

  //console.log(attendance)
  let arr1 = [];
  for (let i = 0; i < attendance.length; ++i) {
    let employeesId = await attendance[i].userId;
    arr1.push(employeesId);
  }

  let findUser = await user.find({
    companyId: companyId,
    deleted: false,
    shiftId: { $ne: null } || { $ne: "" },
  });
  let arr = [];
  for (let i = 0; i < findUser.length; ++i) {
    let employeesId = await findUser[i]._id;
    arr.push(employeesId);
  }

  let absentEmployee = [];
  for (let i = 0; i < arr.length; i++) {
    if (!arr1.includes(arr[i])) {
      // Check if employee already has attendance record for today
      let hasAttendance = await Attendance.exists({
        companyId: companyId,
        userId: arr[i],
        attendanceDate: todayDate,
      });
      if (!hasAttendance) {
        absentEmployee.push(arr[i]);
      }
    }
  }

  let attendanceMonth = new Date(new Date());
  attendanceMonth = attendanceMonth.toLocaleString("default", {
    month: "long",
  });

  let attendanceYear = moment(new Date()).year().toString();

  for (let i = 0; i < absentEmployee.length; i++) {
    // console.log("i am here");
    let userId = await absentEmployee[i]._id;
    // console.log(userId);
    const todayDateObj = new Date(todayDate);
    //console.log(todayDateObj)
    const tomorrowDateObj = new Date(todayDate);
    tomorrowDateObj.setDate(tomorrowDateObj.getDate() + 1);
    let absentUser = await user.findOne({ _id: userId, companyId: companyId })?.populate("shiftId");
    let holidayIfExistsForToday = await holidays.findOne({
      companyId: companyId,
      holidayDate: { $gte: todayDateObj, $lt: tomorrowDateObj },
    });

    let newAttendanceRecord = {};
    newAttendanceRecord.checkInTime = "";
    newAttendanceRecord.checkOutTime = "";
    newAttendanceRecord.hoursWorked = 0;

    if (holidayIfExistsForToday) {
      //console.log(holidayIfExistsForToday)
      let shiftEndingTime = absentUser?.shiftId?.endTime;
      // console.log(shiftEndingTime);
      shiftEndingTime = moment(shiftEndingTime, "HH:mm:ss");
      shiftEndingTime = new Date(shiftEndingTime).getTime();
      let currentTime = new Date(Date.now()).getTime();
      let data = {};
      data.companyId = data.note = "";
      data.attendanceDate = todayDate;
      data.attendanceMonth = attendanceMonth;
      data.attendanceYear = attendanceYear;
      data.userId = userId;
      data.companyId = absentUser.companyId;
      data.attendanceRecords = [newAttendanceRecord]
      data.hoursWorked = 0;
      data.overTime = null;
      data.status = "Holiday";
      if (shiftEndingTime <= currentTime) {
        let createAttendance = new Attendance(data);
        await createAttendance.save();
      }
    } else {
      let shiftEndingTime = absentUser?.shiftId?.endTime;
      // console.log(shiftEndingTime);
      shiftEndingTime = moment(shiftEndingTime, "HH:mm:ss");
      shiftEndingTime = new Date(shiftEndingTime).getTime();
      let currentTime = new Date(Date.now()).getTime();
      let data = {};
      data.companyId = data.note = "";
      data.attendanceDate = todayDate;
      data.attendanceMonth = attendanceMonth;
      data.attendanceYear = attendanceYear;
      data.userId = userId;
      data.companyId = absentUser.companyId;
      data.attendanceRecords = [newAttendanceRecord]
      data.hoursWorked = 0;
      data.overTime = null;
      data.status = "Absent";
      if (shiftEndingTime <= currentTime) {
        let createAttendance = new Attendance(data);
        await createAttendance.save();
      }
    }
  }
};

const scheduleCronJobs = async () => {
  try {
    // Fetch all companies and their workingDays
    const companies = await companyModel?.find({ deleted: false });

    companies.forEach(company => {
      let companyId = company?._id?.toString();
      const workingDays = company.workingDays || [];
  
      //console.log(company?.companyName)
      //console.log(workingDays)

      const cronExpression = createCronExpression(workingDays);
      //console.log(cronExpression)

      if (cronExpression) {
        cronJob.schedule(cronExpression, () => {
          absentScenario(companyId);  // Pass the company ID to the absentScenario function
        });
      }
    });
  } catch (err) {
    console.error("Error fetching companies:", err);
  }
}

function createCronExpression(workingDays) {
  if (!Array.isArray(workingDays) || workingDays.length === 0) {
    return null;
  }

  const dayMap = {
    "Sunday": 0,
    "Monday": 1,
    "Tuesday": 2,
    "Wednesday": 3,
    "Thursday": 4,
    "Friday": 5,
    "Saturday": 6
  };

  const days = workingDays.map(day => dayMap[day]).join(",");
  return `0 * * * ${days}`;  
}

module.exports = { attendanceCheckingOutScenario, scheduleCronJobs };
