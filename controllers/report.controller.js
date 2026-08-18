const Attendance = require('../models/attendance.model');
const Permission = require('../models/permissions.model');
const Shift = require('../models/shift.model');
let services = require('../utils/services');
let Team = require('../models/team.model');
let User = require('../models/user.model');
let Holiday = require('../models/holidays.model');
const moment = require('moment');
const { default: mongoose } = require('mongoose');
const companyModel = require('../models/company.model');

let methods = {
  viewReport: async (req, res) => {
    try {
      let { _id } = req.token;
      let findUser = await User.findOne({ _id });
      let roleId = findUser.roleId;
      let isAllowed;

      if (findUser.role === 'admin') {
        isAllowed = true;
      } else {
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, 'reportManagement', 'reportManagement');
      }

      if (!isAllowed) {
        return res.status(401).json({
          msg: 'Unauthorized User',
          success: false,
        });
      }
      let companyId = req.token.companyId;
      let allEmployees = await User.find({
        companyId: companyId,
        deleted: false,
      });
      let totalEmployees = await User.find({
        companyId: companyId,
      });
      let maleEmployees = allEmployees.filter((user) => user.gender === 'Male');
      let femaleEmployees = allEmployees.filter((user) => user.gender === 'Female');
      let otherGenderEmployees = allEmployees.filter((user) => user.gender === 'Other');
      let totalContractor = allEmployees.filter((user) => user.employeeType === 'Contract');
      let totalIntern = allEmployees.filter((user) => user.employeeType === 'Intern');

      totalMale = maleEmployees.length;
      totalFemale = femaleEmployees.length;
      totalOtherGender = otherGenderEmployees.length;
      totalIntern = totalIntern.length;
      totalContractor = totalContractor.length;

      // Find non-tech teams and retrieve users in those teams
      const techFilter = {
        $match: {
          companyId: new mongoose.Types.ObjectId(companyId),
          isTech: true,
        },
      };
      const nonTechFilter = {
        $match: {
          companyId: new mongoose.Types.ObjectId(companyId),
          isTech: false,
        },
      };
      const totalUsersPipeline = [
        // {
        //   $match: techFilter,
        // },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: 'teamId',
            as: 'users',
          },
        },
        {
          $unwind: {
            path: '$users',
          },
        },
        {
          $match: {
            'users.deleted': false,
          },
        },

        {
          $group: {
            _id: 'companyId',
            totalUsers: { $addToSet: '$users' },
          },
        },
        {
          $project: {
            totalUsers: { $size: '$totalUsers' },
          },
        },
      ];
      const techResult = await Team.aggregate([techFilter, ...totalUsersPipeline]);
      const nonTechResult = await Team.aggregate([nonTechFilter, ...totalUsersPipeline]);
      if (!techResult && !nonTechResult) {
        return res.status(404).json({
          success: false,
        });
      }

      const totalTechEmployees = techResult.length ? techResult[0].totalUsers : 0;
      const totalNonTechEmployees = nonTechResult.length ? nonTechResult[0].totalUsers : 0;

      let teamDictionary = {}; // Initialize as an object

      // Iterate over each team and find users associated with the team ID
      let teams = await Team.find({
        companyId: companyId,
      });
      for (let i = 0; i < teams.length; i++) {
        let team = teams[i];
        let teamId = team._id;

        // Find users associated with the team ID
        let usersInTeam = await User.find({ teamId: teamId, deleted: false });

        // Update the teamDictionary with department and totalEmployees
        teamDictionary[team.teamName] = {
          department: team.teamName,
          totalEmployees: usersInTeam.length,
        };
      }

      // Convert the values of the teamDictionary to an array
      let teamArray = Object.values(teamDictionary);

      // Extract salaries from each employee object
      let totalEmployee = totalEmployees.length;
      let employeeLeft = totalEmployee - allEmployees.length;
      let employeeLeftNow = totalEmployee - employeeLeft;
      let salaries = allEmployees.map((employee) => parseFloat(employee.salary)).filter((salary) => !isNaN(salary));
      // Calculate total salary
      let totalSalary = salaries.reduce((acc, salary) => acc + salary, 0);

      let averageSalary = Math.round(totalSalary / allEmployees.length);

      let birthDates = allEmployees.map((employee) => new Date(employee.dateOfBirth));

      // Billed NonBilled Resources

      const billedPipeline = [
        {
          $match: {
            deleted: false,
            companyId: new mongoose.Types.ObjectId(companyId),
          },
        },
        {
          $lookup: {
            from: 'projectmanagements',
            localField: '_id',
            foreignField: 'assignedDevelopers',
            as: 'projects',
          },
        },
        {
          $project: {
            projects: 1,
            isBilled: {
              $cond: {
                if: {
                  $and: [
                    { $ne: [{ $size: '$projects' }, 0] },
                    {
                      $gt: [
                        {
                          $size: {
                            $filter: {
                              input: '$projects',
                              as: 'project',
                              cond: { $eq: ['Billed', '$$project.projectType'] },
                            },
                          },
                        },
                        0,
                      ],
                    },
                  ],
                },
                then: true,
                else: false,
              },
            },
            isAssignedProject: {
              $cond: {
                if: {
                  $eq: [{ $size: '$projects' }, 0],
                },
                then: false,
                else: true,
              },
            },
          },
        },

        {
          $group: {
            _id: null,
            billedCount: {
              $sum: {
                $cond: [{ $eq: ['$isBilled', true] }, 1, 0],
              },
            },
            nonBilledCount: {
              $sum: {
                $cond: [{ $eq: ['$isBilled', false] }, 1, 0],
              },
            },
            projectAssignedCount: {
              $sum: {
                $cond: [
                  {
                    $eq: ['$isAssignedProject', true],
                  },
                  1,
                  0,
                ],
              },
            },
            projectUnassignedCount: {
              $sum: {
                $cond: [{ $eq: ['$isAssignedProject', false] }, 1, 0],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            billedCount: 1,
            nonBilledCount: 1,
            projectAssignedCount: 1,
            projectUnassignedCount: 1,
          },
        },
      ];
      const billedResult = await User.aggregate(billedPipeline);
      if (!billedResult) {
        return res.status(200).json({
          result: {},
          success: true,
        });
      }
      const billedResources = billedResult[0].billedCount;
      const nonBilledResources = billedResult[0].nonBilledCount;
      const assignedProjectResources = billedResult[0].projectAssignedCount;
      const notAssignedProjectResources = billedResult[0].projectUnassignedCount;

      function getShortMonthName(date) {
        return date.toLocaleString('en-us', { month: 'short' });
      }

      // Employee Progress
      const lastTwelveMonths = [];
      const employeeProgress = [];

      // Initialize employeeProgress object with zero counts for each month
      for (let i = 0; i < 12; i++) {
        const today = new Date();
        today.setMonth(today.getMonth() - i);
        const splitArr = today.toISOString().split('-');
        lastTwelveMonths.push(`${splitArr[0]}-${splitArr[1]}`);

        employeeProgress.push({
          employeeJoined: 0,
          employeeExited: 0,
          totalEmployee: 0,
          monthName: getShortMonthName(today),
          month: `${splitArr[0]}-${splitArr[1]}`,
        });
      }

      // Loop through each employee
      totalEmployees.forEach((employee) => {
        const joinDateParts = employee.joiningDate.trim().split('-');
        const joinMonth = `${joinDateParts[0]}-${joinDateParts[1]}`;

        // Check if the employee joined within the last twelve months
        if (lastTwelveMonths.includes(joinMonth)) {
          const index = lastTwelveMonths.indexOf(joinMonth);
          employeeProgress[index].employeeJoined++;
        }

        // Check if the employee has an exit date
        if (employee.employeeExitDate) {
          const exitDateParts = employee.employeeExitDate.trim().split('-');
          const exitMonth = `${exitDateParts[0]}-${exitDateParts[1]}`;

          employeeProgress.forEach((monthObj) => {
            // const index = lastTwelveMonths.indexOf(exitMonth);
            if (monthObj.month <= exitMonth && monthObj.month >= joinMonth) {
              monthObj.totalEmployee++;
            }
          });
          // Check if the employee exited within the last twelve months
          if (lastTwelveMonths.includes(exitMonth)) {
            const index = lastTwelveMonths.indexOf(exitMonth);
            employeeProgress[index].employeeExited++;
          }
        } else {
          employeeProgress.forEach((monthObj) => {
            if (monthObj.month >= joinMonth) {
              monthObj.totalEmployee++;
            }
            //  for no exit date
          });
          // const index = lastTwelveMonths.indexOf(exitMonth);
        }
      });

      // Get the current date
      let currentDate = new Date();

      // Calculate ages
      let ages = birthDates.map((birthdate) => {
        let ageDiffMs = currentDate - birthdate;
        let ageDate = new Date(ageDiffMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
      });

      const ageRanges = [
        { min: 20, max: 25 },
        { min: 25, max: 30 },
        { min: 30, max: 35 },
        { min: 35, max: 40 },
        { min: 40, max: 45 },
        { min: 45, max: Infinity }, // "Infinity" represents 45+
      ];

      const ageResults = ageRanges.map((range) => {
        const { min, max } = range;
        const bracketKey = max === Infinity ? `${min}+` : `${min} - ${max}`;
        const totalEmployees = ages.filter((age) => age >= min && (max === Infinity ? true : age < max)).length;

        return {
          age: bracketKey,
          totalEmployees: totalEmployees,
        };
      });

      // Step 1: Find shift-wise total employees
      let shiftWiseTotalEmployees = {};

      for (const employee of allEmployees) {
        const { shiftId } = employee;

        try {
          // Use await to wait for the shift to be found
          const shift = await Shift.findById(shiftId);

          if (shift) {
            const shiftTitle = shift.title;
            shiftWiseTotalEmployees[shiftTitle] = (shiftWiseTotalEmployees[shiftTitle] || 0) + 1;
          } else {
            console.error(`Shift not found for shiftId: ${shiftId}`);
            // Handle the error as needed, e.g., set a default title or skip the employee
          }
        } catch (error) {
          console.error(`Error finding shift for shiftId: ${shiftId}`, error);
          // Handle the error as needed
        }
      }

      // Convert the shiftWiseTotalEmployees object to an array of objects
      const shiftResults = Object.entries(shiftWiseTotalEmployees).map(([shiftTitle, totalEmployees]) => ({
        shiftTitle: shiftTitle,
        totalEmployees: totalEmployees,
      }));

      //////experience of employee

      const experienceResults = allEmployees.reduce((result, user) => {
        const experienceArr = user.experience.map((exp) => exp.duration.split('-'));

        const cleanedArray = experienceArr.flat().filter((e) => e !== '');
        const max = (cleanedArray.length && cleanedArray.reduce((acc, curr) => (acc < curr ? curr : acc))) || 0;
        const min = (cleanedArray.length && cleanedArray.reduce((acc, curr) => (acc > curr ? curr : acc))) || 0;
        const totalExperience = max - min;

        // Define experience ranges
        const experienceRanges = [
          { min: 0, max: 2 },
          { min: 2, max: 4 },
          { min: 4, max: 6 },
          { min: 6, max: 8 },
          { min: 8, max: 10 },
          { min: 10, max: Infinity },
        ];

        const experienceRange = experienceRanges.find(
          (range) => totalExperience >= range.min && totalExperience < range.max
        );

        if (experienceRange) {
          const rangeKey = experienceRange.max === Infinity ? '10+' : `${experienceRange.min} - ${experienceRange.max}`;

          // Check if the range key exists in the result
          if (!result[rangeKey]) {
            result[rangeKey] = {
              experience: rangeKey,
              totalEmployees: 0,
            };
          }

          // Increment the totalEmployees count for the current range
          result[rangeKey].totalEmployees++;
        }

        return result;
      }, {});

      // Convert the result object to an array
      const finalExperienceResults = Object.values(experienceResults);

      return res.status(200).json({
        totalEmployees: employeeLeftNow,
        // employeeLeft: employeeLeftNow,
        totalMale: totalMale,
        totalFemale: totalFemale,
        totalOtherGender,
        totalIntern: totalIntern,
        totalContractor: totalContractor,
        averageSalary: averageSalary,
        // notAssignedProjectResources: notAssignedProjectResources,
        // assignedProjectResources: assignedProjectResources,
        nonBilledResources: nonBilledResources,
        billedResources: billedResources,
        totalTechEmployees: totalTechEmployees,
        totalNonTechEmployees: totalNonTechEmployees,
        departWiseEmployees: teamArray,
        shiftWiseTotalEmployees: shiftResults,
        ageWiseEmployees: ageResults,
        experienceWiseEmployees: finalExperienceResults,
        annualEmployeeReview: employeeProgress,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: 'Failed to view all users',
        error: error.message,
        success: false,
      });
    }
  },

  ///////////////

  employeesAttendance: async (req, res) => {
    try {
      const monthNameMap = {
        january: 1,
        february: 2,
        march: 3,
        april: 4,
        may: 5,
        june: 6,
        july: 7,
        august: 8,
        september: 9,
        october: 10,
        november: 11,
        december: 12,
      };

      let { _id } = req.token;
      let findUser = await User.findOne({ _id });
      let roleId = findUser.roleId;
      let isAllowed;

      if (findUser.role === 'admin') {
        isAllowed = true;
      } else {
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, 'reportManagement', 'reportManagement');
      }

      if (!isAllowed) {
        return res.status(401).json({
          msg: 'Unauthorized User',
          success: false,
        });
      }

      const companyId = findUser.companyId;
      const attendanceMonth = req.query?.attendanceMonth;
      const attendanceYear = req.query?.attendanceYear;
      const employeeName = req.query?.employeeName;
      const dateFrom = req.query?.dateFrom;
      const dateTo = req.query?.dateTo;

      let company = await companyModel.findOne({
        _id: companyId,
        deleted: false,
      });
      if (!company) {
        return res.status(404).send({ message: "Company not found" });
      }

      let workingDays = company?.workingDays;

      let totalHolidays = 0;
      let totalWorkingDays = 0;

      function getWeekendDays(startDate, endDate) {
        const weekendDays = [];
        totalWorkingDays = 0;

        const dayMap = {
          "sunday": 0,
          "monday": 1,
          "tuesday": 2,
          "wednesday": 3,
          "thursday": 4,
          "friday": 5,
          "saturday": 6
        };

        const workingDaysNumbers = workingDays?.map(day => dayMap[day.toLowerCase()]);
        
        let currentDate = new Date(startDate);
        let lastDate = new Date(endDate);

        while (currentDate <= lastDate) {
          const dayOfWeek = currentDate.getDay();
          totalWorkingDays++;

          // if (dayOfWeek === 6 || dayOfWeek === 0) {
          //   weekendDays.push(new Date(currentDate));
          // }

          if (!workingDaysNumbers.includes(dayOfWeek)) {
            weekendDays.push(new Date(currentDate));
          }

          currentDate.setDate(currentDate.getDate() + 1);
        }

        //totalWorkingDays = totalWorkingDays - 1;

        return weekendDays;
      }

      const check = await User.findOne({ _id: _id, deleted: false });
      let allActiveEmployees = await User.countDocuments({
        companyId: companyId,
        deleted: false,
      });

      let startDate, endDate;
      if (attendanceMonth) {
        const requestedMonth = monthNameMap[attendanceMonth.toLowerCase()];

        if (requestedMonth >= 1 && requestedMonth <= 12) {
          startDate = new Date(`${attendanceYear}-${requestedMonth.toString().padStart(2, '0')}-01T00:00:00.000Z`);

          const nextMonth = requestedMonth === 12 ? 1 : requestedMonth + 1;
          const nextYear = requestedMonth === 12 ? parseInt(attendanceYear) + 1 : attendanceYear;

          endDate = new Date(`${nextYear}-${nextMonth.toString().padStart(2, '0')}-01T00:00:00.000Z`);
        } else {
          console.error('Invalid month name');
        }
      }

      if (dateFrom && dateTo) {
        startDate = new Date(dateFrom);
        endDate = new Date(dateTo);
      }

      if (startDate && endDate) {
        const weekendDays = getWeekendDays(startDate, endDate);
        var startWfhDate = startDate.toISOString().slice(0, 10);
        var endWfhDate = endDate.toISOString().slice(0, 10);

        let holidaysQuery = await Holiday.countDocuments({
          companyId: companyId,
          holidayDate: {
            $gte: startDate,
            $lt: endDate,
          },
        });

        if (holidaysQuery) {
          totalHolidays = holidaysQuery + weekendDays?.length;
        } else {
          console.error('Error querying holidays');
          totalHolidays = weekendDays?.length;
        }
      }

      if (!check) {
        return res.status(404).json({
          msg: 'User does not exist',
          success: false,
        });
      }

      const attendanceFilter = {
        companyId: companyId,
        deleted: false,
      };

      if (attendanceMonth) {
        attendanceFilter.attendanceMonth = attendanceMonth;
      }

      if (attendanceYear) {
        attendanceFilter.attendanceYear = attendanceYear;
      }
      if (dateFrom && dateTo) {
        attendanceFilter.attendanceDate = {
          $gte: dateFrom,
          $lte: dateTo,
        };
      }

      const pipeline = [
        {
          $match: attendanceFilter,
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $unwind: {
            path: '$user',
          },
        },
        {
          $match: {
            'user.fullName': {
              $regex: employeeName ? new RegExp(employeeName, 'i') : new RegExp('.*'),
            },
            'user.deleted': false,
          },
        },
        {
          $group: {
            _id: '$user._id',
            user: { $first: '$user' },
            totalPresent: {
              $sum: {
                $cond: [{ $in: ['$status', ['Present', 'Late']] }, 1, 0],
              },
            },
            totalAbsent: {
              $sum: {
                $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0],
              },
            },
            totalLate: {
              $sum: {
                $cond: [{ $eq: ['$status', 'Late'] }, 1, 0],
              },
            },
            totalLeave: {
              $sum: {
                $cond: [{ $eq: ['$status', 'On-Leave'] }, 1, 0],
              },
            },
          },
        },
        {
          $lookup: {
            from: 'requests',
            localField: 'user._id',
            foreignField: 'userId',
            as: 'requests',
          },
        },
        { $sort: { 'user.fullName': 1 } },
        {
          $project: {
            user: 1,
            totalPresent: 1,
            totalAbsent: 1,
            totalLeave: 1,
            totalLate: 1,
            totalWFH: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$requests',
                      as: 'request',
                      cond: {
                        $and: [
                          { $eq: ['$$request.requestType', 'wfh'] },
                          { $eq: ['$$request.status', 'Approved'] },
                          { $gte: ['$$request.startDate', startWfhDate] },
                          { $lte: ['$$request.endDate', endWfhDate] },
                        ],
                      },
                    },
                  },
                  as: 'filteredRequest',
                  in: {
                    $toInt: '$$filteredRequest.totalDays',
                  },
                },
              },
            },
          },
        },
      ];
      const paginateOptions =
        req.query.page && req.query.limit
          ? { page: req.query.page, limit: req.query.limit }
          : {
              page: 1,
              limit: 5,
            };

      const result = await Attendance.aggregatePaginate(Attendance.aggregate(pipeline), paginateOptions);

      if (!result) {
        return res.status(200).json({
          Attendance: {},
          success: true,
        });
      }

      const attendanceInfo = result.docs.map((employee) => ({
        employeeName: employee.user.fullName || 'N/A',
        totalPresents: employee.totalPresent,
        totalAbsents: employee.totalAbsent,
        totalLeaves: employee.totalLeave,
        totalLates: employee.totalLate,
        totalWFH: employee.totalWFH,
        imageUrl: employee.user.imageUrl,
      }));
      delete result.docs;
      return res.status(200).json({
        Attendance: attendanceInfo,
        success: true,
        totalEmployees: allActiveEmployees,
        totalHolidays: totalHolidays,
        totalWorkingDays: totalWorkingDays - totalHolidays,
        ...result,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        msg: 'Failed to get Employees Attendance',
        error: error.message,
        success: false,
      });
    }
  },
};

module.exports = methods;
