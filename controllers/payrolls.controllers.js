const payrolls = require("../models/payrolls.model");
const attendance = require("../models/attendance.model");
const user = require("../models/user.model");
const taxSlab = require("../models/taxSlabs.model");
// const XLSX = require("xlsx");
// const pdfmake = require("pdfmake/build/pdfmake");
// const pdfFonts = require("pdfmake/build/vfs_fonts");
const services = require("../utils/services");
const Permission = require("../models/permissions.model");
const timesheetModel = require("../models/timesheet.model");
const profitLossModel = require("../models/profitLoss.model");
const companyModel = require("../models/company.model");
// pdfmake.vfs = pdfFonts.pdfMake.vfs;

let methods = {
  generatePayrolls: async (req, res) => {
    try {
      let _id = req.token._id;
      let checkUserIfExist = await user.findOne({ _id: _id }, { deleted: false });

      if (!checkUserIfExist) {
        return res.status(404).json({
          msg: "User does not exist",
          success: false,
        });
      }

      let isAllowed = false;

      if (checkUserIfExist.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({
          roleId: checkUserIfExist.roleId,
        });
        isAllowed = services.checkPermissions(checkPermission, "financeManagement", "managePayrolls");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }

      let companyId = req.token.companyId;

      let companyInfo = await companyModel.findOne({ _id: companyId });

      if (companyInfo.absentDeduction === undefined) {
        return res.status(400).json({
          msg: "Absent deduction policy is not set. Please configure the policy in company settings.",
          success: false,
        });
      }

      let isAbsentDeduction = companyInfo?.absentDeduction === true ? true : false;

      let data = req.body;

      let payrollMonth = req.query.payrollMonth;
      let payrollYear = req.query.payrollYear;

      function getMonthNumber(monthName) {
        const months = {
            January: 0,
            February: 1,
            March: 2,
            April: 3,
            May: 4,
            June: 5,
            July: 6,
            August: 7,
            September: 8,
            October: 9,
            November: 10,
            December: 11
        };
    
        return months[monthName];
    }
    
    const monthNumber = getMonthNumber(payrollMonth);

      // let checkIfPayrollExist = await payrolls.find({
      //   companyId: companyId,
      //   payMonth: payrollMonth,
      //   payYear: payrollYear,
      // });
      // if (checkIfPayrollExist.length) {
      //   return res.status(400).json({
      //     msg: "Payrolls for month already exist",

      //     success: false,
      //   });
      // }

      const payrollMonthNumber = new Date(Date.parse(`${payrollMonth} 1, ${payrollYear}`)).getMonth() + 1;

      const MonthStartDate = new Date(Date.UTC(payrollYear, monthNumber, 1));
      const MonthEndDate = new Date(Date.UTC(payrollYear, monthNumber + 1, 0, 23, 59, 59, 999));

      let currentMonth = new Date(Date.now()).getMonth() + 1;
      let checkDate = new Date();
      let lastDayOfMonth = new Date(checkDate.getFullYear(), checkDate.getMonth() + 1, 0).getDate();
      let currentDate = new Date(Date.now()).getDate();
      let currentYear = new Date(Date.now()).getFullYear();
      if (
        +payrollYear > currentYear ||
        (+payrollYear == currentYear && payrollMonthNumber > currentMonth) ||
        +payrollYear > currentYear + 1
      ) {
        return res.status(400).json({
          msg: "Payroll of future cannot be generated",
          success: false,
        });
      } else if (+payrollYear < currentYear || (+payrollYear == currentYear && payrollMonthNumber < currentMonth)) {
        data.companyId = companyId;

        const formatDate = (date) => date.toISOString().split('T')[0]; // Convert to 'YYYY-MM-DD'
        const formattedMonthStartDate = formatDate(MonthStartDate); // '2024-01-01'
        const formattedMonthEndDate = formatDate(MonthEndDate);  
        //console.log(formattedMonthStartDate, formattedMonthEndDate)
        
        let findEmployees = await user
          .find({
            companyId: companyId,
            $or: [
              { deleted: false },
              { deleted: true, employeeExitDate: { $gte: formattedMonthStartDate, $lte: formattedMonthEndDate } }
            ],
          })
          ?.populate("taxSlabId");
        // let findEmployees = await user
        //   .find({
        //     companyId: companyId,
        //     deleted: false,
        //   })
        //   ?.populate("taxSlabId");

        //console.log("findEmployees",findEmployees)
        const taxSlabs = await taxSlab?.find({ companyId: companyId, deleted: false });

        if (!taxSlabs?.length) {
          return res.status(400).json({
            msg: "No tax slabs found for the company",
            success: false,
          });
        }

        function getApplicableTaxSlab(yearlyEarnings) {
          return taxSlabs?.find(slab => yearlyEarnings >= parseFloat(slab.yearlyPayLowerLimit) && yearlyEarnings <= parseFloat(slab.yearlyPayUpperLimit));
        }

        let addedPayrolls = [];

        for (let i = 0; i < findEmployees.length; i++) {
          let employee = findEmployees[i];
          let joining = new Date(employee?.joiningDate)
          //console.log('joining', joining);

          if (joining > MonthEndDate) {
            continue;
          }

          let checkIfEmployeePayrollExists = await payrolls?.findOne({
            companyId: companyId,
            userId: employee._id,
            payMonth: payrollMonth,
            payYear: payrollYear,
          });
  
          if (checkIfEmployeePayrollExists) {
            continue;  // Skip employee if payroll already exists
          }
          
          if (employee.salaryType === 'Monthly') {
            console.log("in the first scenario!!!!")

            let absentCountQuery = {
              companyId: companyId,
              userId: findEmployees[i]._id,
              status: "Absent",
              attendanceMonth: payrollMonth,
              attendanceYear: payrollYear,
            };

            if ((joining > MonthStartDate) && (joining <= MonthEndDate)) {
              let formatJoining = formatDate(joining);
              absentCountQuery.attendanceDate = { $gte: formatJoining };
              //let formatJoining = formatDate(joining);

              // let daysCount = await attendance.countDocuments({
              //   userId: employee?._id,
              //   companyId: employee?.companyId, 
              //   attendanceDate: { 
              //     $gte: formatJoining, 
              //     $lte: formattedMonthEndDate  
              //   },
              //   status: { 
              //     $nin: ["Holiday"] 
              //   }
              // });
              let joiningDay = parseInt(formatJoining?.split('-')[2]); 
              let daysCount = (30 - joiningDay) + 1;
              
              if (daysCount <= 0) {
                daysCount = 1;
              }
              //let daysCount = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
              let data = {};
              data.payMonth = payrollMonth;
              data.payYear = payrollYear;

              let tempPay = findEmployees[i]?.salary;
              let perDaySalary = tempPay / 30;

              let userPay = perDaySalary * daysCount;

              let userYearlyPay = +userPay * 12;

              let applicableTaxSlab = getApplicableTaxSlab(userYearlyPay);

              let userTax = applicableTaxSlab?.monthlyTaxInPercent;
              if (userTax == undefined) {
                userTax = 0;
              }
              console.log("tax",userTax);
              
              console.log('name',findEmployees[i]?.fullName);
              console.log('tax',applicableTaxSlab?.title);

              if (!applicableTaxSlab) {
                return res.status(400).json({
                  msg: `Some payrolls were not generated due to no applicable tax slabs`,
                  success: false,
                });
              }

              let userFixedTaxAmount = applicableTaxSlab?.fixedYearlyTax;
              if (userFixedTaxAmount == undefined) {
                userFixedTaxAmount = 0;
              }
              let userTaxSlabLowerLimit = applicableTaxSlab?.yearlyPayLowerLimit;
              if (userTaxSlabLowerLimit == undefined) {
                userTaxSlabLowerLimit = 0;
              }

              let taxableYearlyPay = +userYearlyPay - +userTaxSlabLowerLimit;
              let yearlyTaxAmount = userTax * +taxableYearlyPay;
              yearlyTaxAmount = +yearlyTaxAmount / 100;
              let monthlyTaxAmount = +yearlyTaxAmount / 12;
              let fixedMonthlyTax = +userFixedTaxAmount / 12;
              data.companyId = companyId;
              data.userId = findEmployees[i]._id;
              data.deduction = "0";
              data.tax = (+monthlyTaxAmount + +fixedMonthlyTax).toFixed(2);
              data.totalDeduction = (+data.tax + +data.deduction).toFixed(2);
              data.firstSalaryDeduction = "0";
              data.bonus = "0";
              data.extraPayment = "0";
              data.basicSalary = +userPay?.toFixed(2);
              data.totalAddition = (+data.bonus + +data.extraPayment).toFixed(2);
              let salaryAfterDeductions = (+userPay - +data.totalDeduction).toFixed(2);
              data.creditSalary = (+data.totalAddition + +salaryAfterDeductions).toFixed(2);

              let absentCount = await attendance.countDocuments(absentCountQuery);

              if (isAbsentDeduction) {
                data.absentFine = (+perDaySalary * +absentCount).toFixed(2);
              } else {
                data.absentFine = "0";
              }

              data.totalDeduction = (+data.totalDeduction + +data.absentFine).toFixed(2);

              data.creditSalary = (+data.creditSalary - +data.absentFine).toFixed(2);

              let newPayroll = new payrolls(data);
              let addPayrolls = await newPayroll.save();
              addedPayrolls.push(addPayrolls);
            }

            else if (employee.deleted && new Date(employee?.employeeExitDate) >= MonthStartDate && new Date(employee?.employeeExitDate) <= MonthEndDate ) {
              let exitDate = new Date(employee?.employeeExitDate);
              let formatExit = employee?.employeeExitDate;
              absentCountQuery.attendanceDate = { $lte: formatExit };
              //let formatExit = employee?.employeeExitDate;

              // let daysCount = await attendance.countDocuments({
              //   userId: employee?._id,
              //   companyId: employee?.companyId, 
              //   attendanceDate: { 
              //     $gte: formattedMonthStartDate, 
              //     $lte: formatExit  
              //   },
              //   status: { 
              //     $nin: ["Holiday"] 
              //   }
              // });
              exitDate?.setUTCHours(23, 59, 59, 999);
              let timeDifference = exitDate - MonthStartDate;
              let daysCount = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
              let data = {};
              data.payMonth = payrollMonth;
              data.payYear = payrollYear;

              let tempPay = findEmployees[i]?.salary;
              let perDaySalary = tempPay / 30;

              console.log("daysCount",daysCount)
              let userPay = (exitDate === MonthEndDate) ? tempPay : (perDaySalary * daysCount);
              console.log("userPay",userPay)
              let userYearlyPay = +userPay * 12;

              let applicableTaxSlab = getApplicableTaxSlab(userYearlyPay);

              let userTax = applicableTaxSlab?.monthlyTaxInPercent;
              if (userTax == undefined) {
                userTax = 0;
              }
              console.log("tax",userTax);
              
              console.log('name',findEmployees[i]?.fullName);
              console.log('tax',applicableTaxSlab?.title);

              if (!applicableTaxSlab) {
                return res.status(400).json({
                  msg: `Some payrolls were not generated due to no applicable tax slabs`,
                  success: false,
                });
              }

              let userFixedTaxAmount = applicableTaxSlab?.fixedYearlyTax;
              if (userFixedTaxAmount == undefined) {
                userFixedTaxAmount = 0;
              }
              let userTaxSlabLowerLimit = applicableTaxSlab?.yearlyPayLowerLimit;
              if (userTaxSlabLowerLimit == undefined) {
                userTaxSlabLowerLimit = 0;
              }

              let taxableYearlyPay = +userYearlyPay - +userTaxSlabLowerLimit;
              let yearlyTaxAmount = userTax * +taxableYearlyPay;
              yearlyTaxAmount = +yearlyTaxAmount / 100;
              let monthlyTaxAmount = +yearlyTaxAmount / 12;
              let fixedMonthlyTax = +userFixedTaxAmount / 12;
              data.companyId = companyId;
              data.userId = findEmployees[i]._id;
              data.deduction = "0";
              data.tax = (+monthlyTaxAmount + +fixedMonthlyTax).toFixed(2);
              data.totalDeduction = (+data.tax + +data.deduction).toFixed(2);
              data.firstSalaryDeduction = "0";
              data.bonus = "0";
              data.extraPayment = "0";
              data.basicSalary = +userPay?.toFixed(2);
              data.totalAddition = (+data.bonus + +data.extraPayment).toFixed(2);
              let salaryAfterDeductions = (+userPay - +data.totalDeduction).toFixed(2);
              data.creditSalary = (+data.totalAddition + +salaryAfterDeductions).toFixed(2);

              let absentCount = await attendance.countDocuments(absentCountQuery);
              console.log("absentCount",absentCount)

              if (isAbsentDeduction) {
                data.absentFine = (+perDaySalary * +absentCount).toFixed(2);
              } else {
                data.absentFine = "0";
              }

              data.totalDeduction = (+data.totalDeduction + +data.absentFine).toFixed(2);

              data.creditSalary = (+data.creditSalary - +data.absentFine).toFixed(2);

              let newPayroll = new payrolls(data);
              let addPayrolls = await newPayroll.save();
              addedPayrolls.push(addPayrolls);
            }

            else {
              let data = {};
              data.payMonth = payrollMonth;
              data.payYear = payrollYear;
              let userTax = findEmployees[i]?.taxSlabId?.monthlyTaxInPercent;
              if (userTax == undefined) {
                userTax = 0;
              }
              console.log("userTax",userTax);
              let userPay = findEmployees[i]?.salary;
              console.log("userPay",userPay);
              let userFixedTaxAmount = findEmployees[i]?.taxSlabId?.fixedYearlyTax;
              if (userFixedTaxAmount == undefined) {
                userFixedTaxAmount = 0;
              }
              console.log("userFixedTaxAmount",userFixedTaxAmount);
              let userTaxSlabLowerLimit = findEmployees[i]?.taxSlabId?.yearlyPayLowerLimit;
              if (userTaxSlabLowerLimit == undefined) {
                userTaxSlabLowerLimit = 0;
              }
              console.log("userTaxSlabLowerLimit",userTaxSlabLowerLimit);
              let userYearlyPay = +userPay * 12;
              console.log("userYearlyPay",userYearlyPay);
              let taxableYearlyPay = +userYearlyPay - +userTaxSlabLowerLimit;
              console.log("taxableYearlyPay",taxableYearlyPay);
              let yearlyTaxAmount = userTax * +taxableYearlyPay;
              console.log("yearlyTaxAmount",yearlyTaxAmount);
              yearlyTaxAmount = +yearlyTaxAmount / 100;
              let monthlyTaxAmount = +yearlyTaxAmount / 12;
              console.log("monthlyTaxAmount",monthlyTaxAmount);
              let fixedMonthlyTax = +userFixedTaxAmount / 12;
              console.log("fixedMonthlyTax",fixedMonthlyTax);
              data.companyId = companyId;
              data.userId = findEmployees[i]._id;
              data.deduction = "0";
              data.tax = (+monthlyTaxAmount + +fixedMonthlyTax).toFixed(2);
              console.log("tax deduction",data.tax);
              data.totalDeduction = (+data.tax + +data.deduction).toFixed(2);
              data.firstSalaryDeduction = "0";
              data.bonus = "0";
              data.extraPayment = "0";
              data.basicSalary = userPay;
              data.totalAddition = (+data.bonus + +data.extraPayment).toFixed(2);
              let salaryAfterDeductions = (+userPay - +data.totalDeduction).toFixed(2);
              data.creditSalary = (+data.totalAddition + +salaryAfterDeductions).toFixed(2);
  
              let absentCount = await attendance.countDocuments({
                companyId: companyId,
                userId: findEmployees[i]._id,
                status: "Absent",
                attendanceMonth: data.payMonth,
                attendanceYear: data.payYear,
              });
  
              let perDaySalary = userPay / 30;
  
              if (isAbsentDeduction) {
                data.absentFine = (+perDaySalary * +absentCount).toFixed(2);
              } else {
                data.absentFine = "0";
              }
  
              data.totalDeduction = (+data.totalDeduction + +data.absentFine).toFixed(2);
  
              data.creditSalary = (+data.creditSalary - +data.absentFine).toFixed(2);
  
              let newPayroll = new payrolls(data);
              let addPayrolls = await newPayroll.save();
              addedPayrolls.push(addPayrolls);
            }
          }

          else if (employee.salaryType === 'Hourly') {
            let data = {};
            data.payMonth = payrollMonth;
            data.payYear = payrollYear;
            
            console.log('MonthStartDate',MonthStartDate)
            console.log('MonthEndDate',MonthEndDate)

            let endDate = MonthEndDate;

            if (employee.deleted) {
              const employeeExitDate = new Date(employee.employeeExitDate);
      
              if (employeeExitDate < MonthEndDate) {
                endDate = employeeExitDate;
              }
          }

            let timesheets = await timesheetModel.find({
              userId: findEmployees[i]._id,
              status: "Approved",
              date: { $gte: MonthStartDate, $lte: endDate }  // startDate and endDate need to be defined based on payrollMonth and payrollYear
            });

            //console.log('timesheets',timesheets)

            let totalHours = 0;
            timesheets?.forEach(sheet => {
                let [hours, minutes] = sheet?.hoursWorked?.split(':')?.map(Number);
                totalHours += hours + (minutes / 60);
            });

            let formattedHoursWorked = (() => {
              let hours = Math.floor(totalHours);
              let minutes = Math.round((totalHours - hours) * 60);
              
              // Pad the minutes with leading zeros if necessary
              let formattedMinutes = minutes.toString().padStart(2, '0');
              // Pad the hours with leading zeros if necessary
              let formattedHours = hours.toString().padStart(2, '0');
              
              return `${formattedHours}h ${formattedMinutes}m`;
            })();

            console.log('totalHours',totalHours)
            data.hoursWorked = formattedHoursWorked;

            let userPay = findEmployees[i]?.salary;
            let monthlySalary = parseFloat((totalHours * userPay).toFixed(2));

            // let userFixedTaxAmount = findEmployees[i]?.taxSlabId?.fixedYearlyTax;
            // if (userFixedTaxAmount == undefined) {
            //   userFixedTaxAmount = 0;
            // }
            // let userTaxSlabLowerLimit = findEmployees[i]?.taxSlabId?.yearlyPayLowerLimit;
            // if (userTaxSlabLowerLimit == undefined) {
            //   userTaxSlabLowerLimit = 0;
            // }
            let userYearlyPay = +monthlySalary * 12;
            let applicableTaxSlab = getApplicableTaxSlab(userYearlyPay);

            let userTax = applicableTaxSlab?.monthlyTaxInPercent;
            if (userTax == undefined) {
              userTax = 0;
            }
            console.log("tax",userTax);
            
            console.log('name',findEmployees[i]?.fullName);
            console.log('tax',applicableTaxSlab?.title);

            if (!applicableTaxSlab) {
              return res.status(400).json({
                msg: `Some payrolls were not generated due to no applicable tax slabs`,
                success: false,
              });
            }

            let userFixedTaxAmount = applicableTaxSlab?.fixedYearlyTax;
            if (userFixedTaxAmount == undefined) {
              userFixedTaxAmount = 0;
            }
            let userTaxSlabLowerLimit = applicableTaxSlab?.yearlyPayLowerLimit;
            if (userTaxSlabLowerLimit == undefined) {
              userTaxSlabLowerLimit = 0;
            }
            console.log('fixedTax',userFixedTaxAmount)
            console.log('lowerlimit',userTaxSlabLowerLimit)
            let taxableYearlyPay = +userYearlyPay - +userTaxSlabLowerLimit;

            console.log('taxableYearlyPay',taxableYearlyPay)
            let yearlyTaxAmount = userTax * +taxableYearlyPay;
            console.log('yearlyTaxAmount',yearlyTaxAmount)
            yearlyTaxAmount = +yearlyTaxAmount / 100;
            console.log('yearlyTaxAmount',yearlyTaxAmount)
            let monthlyTaxAmount = +yearlyTaxAmount / 12;
            console.log('monthlyTaxAmount',monthlyTaxAmount)
            let fixedMonthlyTax = +userFixedTaxAmount / 12;
            console.log('fixedMonthlyTax',fixedMonthlyTax)
            data.companyId = companyId;
            data.userId = findEmployees[i]._id;
            data.deduction = "0";
            data.tax = (+monthlyTaxAmount + +fixedMonthlyTax).toFixed(2);
            data.totalDeduction = (+data.tax + +data.deduction).toFixed(2);
            data.firstSalaryDeduction = "0";
            data.bonus = "0";
            data.extraPayment = "0";
            data.basicSalary = monthlySalary;
            data.totalAddition = (+data.bonus + +data.extraPayment).toFixed(2);
            let salaryAfterDeductions = (+monthlySalary - +data.totalDeduction).toFixed(2);
            data.creditSalary = (+data.totalAddition + +salaryAfterDeductions).toFixed(2);

            // let absentCount = await attendance.countDocuments({
            //   companyId: companyId,
            //   userId: findEmployees[i]._id,
            //   status: "Absent",
            //   attendanceMonth: data.payMonth,
            //   attendanceYear: data.payYear,
            // });

            //let perDaySalary = monthlySalary / 30;

            //data.absentFine = (+perDaySalary * +absentCount).toFixed(2);

            //data.totalDeduction = (+data.totalDeduction + +data.absentFine).toFixed(2);

            //data.creditSalary = (+data.creditSalary - +data.absentFine).toFixed(2);

            let newPayroll = new payrolls(data);
            let addPayrolls = await newPayroll.save();
            addedPayrolls.push(addPayrolls);
          }

          else{
            console.log('No payrolls for Unpaid Employees')
          }
        }

        if (!addedPayrolls.length) {
          return res.status(404).json({
            msg: "Payrolls for month already exist",
            success: false,
          });
        }

        res.status(200).json({
          payrolls: addedPayrolls,
          msg: "Payrolls Generated",
          success: true,
        });
      } else {
        if (currentDate < lastDayOfMonth) {
          return res.status(400).json({
            msg: "Payroll cannot be generated before end of month",
            success: false,
          });
        }
        data.companyId = companyId;

        const formatDate = (date) => date.toISOString().split('T')[0]; // Convert to 'YYYY-MM-DD'
        const formattedMonthStartDate = formatDate(MonthStartDate); // '2024-01-01'
        const formattedMonthEndDate = formatDate(MonthEndDate);  
        //console.log(formattedMonthStartDate, formattedMonthEndDate)
        
        let findEmployees = await user
          .find({
            companyId: companyId,
            $or: [
              { deleted: false },
              { deleted: true, employeeExitDate: { $gte: formattedMonthStartDate, $lte: formattedMonthEndDate } }
            ],
          })
          ?.populate("taxSlabId");
        // let findEmployees = await user
        //   .find({
        //     companyId: companyId,
        //     deleted: false,
        //   })
        //   ?.populate("taxSlabId");

        //console.log("findEmployees",findEmployees)
        const taxSlabs = await taxSlab?.find({ companyId: companyId, deleted: false });

        if (!taxSlabs?.length) {
          return res.status(400).json({
            msg: "No tax slabs found for the company",
            success: false,
          });
        }

        function getApplicableTaxSlab(yearlyEarnings) {
          return taxSlabs?.find(slab => yearlyEarnings >= parseFloat(slab.yearlyPayLowerLimit) && yearlyEarnings <= parseFloat(slab.yearlyPayUpperLimit));
        }

        let addedPayrolls = [];

        for (let i = 0; i < findEmployees.length; i++) {
          let employee = findEmployees[i];
          let joining = new Date(employee?.joiningDate)
          //console.log('joining', joining);

          if (joining > MonthEndDate) {
            continue;
          }

          let checkIfEmployeePayrollExists = await payrolls?.findOne({
            companyId: companyId,
            userId: employee._id,
            payMonth: payrollMonth,
            payYear: payrollYear,
          });
  
          if (checkIfEmployeePayrollExists) {
            continue;  // Skip employee if payroll already exists
          }
          
          if (employee.salaryType === 'Monthly') {
            console.log("in the second scenario!!!!")

            let absentCountQuery = {
              companyId: companyId,
              userId: findEmployees[i]._id,
              status: "Absent",
              attendanceMonth: payrollMonth,
              attendanceYear: payrollYear,
            };

            if ((joining > MonthStartDate) && (joining <= MonthEndDate)) {
              let formatJoining = formatDate(joining);
              absentCountQuery.attendanceDate = { $gte: formatJoining };
              //let formatJoining = formatDate(joining);

              // let daysCount = await attendance.countDocuments({
              //   userId: employee?._id,
              //   companyId: employee?.companyId, 
              //   attendanceDate: { 
              //     $gte: formatJoining, 
              //     $lte: formattedMonthEndDate  
              //   },
              //   status: { 
              //     $nin: ["Holiday"] 
              //   }
              // });
              let joiningDay = parseInt(formatJoining?.split('-')[2]); 
              let daysCount = (30 - joiningDay) + 1;

              if (daysCount <= 0) {
                daysCount = 1;
              }
              //let daysCount = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
              let data = {};
              data.payMonth = payrollMonth;
              data.payYear = payrollYear;

              let tempPay = findEmployees[i]?.salary;
              let perDaySalary = tempPay / 30;

              let userPay = perDaySalary * daysCount;

              let userYearlyPay = +userPay * 12;

              let applicableTaxSlab = getApplicableTaxSlab(userYearlyPay);

              let userTax = applicableTaxSlab?.monthlyTaxInPercent;
              if (userTax == undefined) {
                userTax = 0;
              }
              console.log("tax",userTax);
              
              console.log('name',findEmployees[i]?.fullName);
              console.log('tax',applicableTaxSlab?.title);

              if (!applicableTaxSlab) {
                return res.status(400).json({
                  msg: `Some payrolls were not generated due to no applicable tax slabs`,
                  success: false,
                });
              }

              let userFixedTaxAmount = applicableTaxSlab?.fixedYearlyTax;
              if (userFixedTaxAmount == undefined) {
                userFixedTaxAmount = 0;
              }
              let userTaxSlabLowerLimit = applicableTaxSlab?.yearlyPayLowerLimit;
              if (userTaxSlabLowerLimit == undefined) {
                userTaxSlabLowerLimit = 0;
              }

              let taxableYearlyPay = +userYearlyPay - +userTaxSlabLowerLimit;
              let yearlyTaxAmount = userTax * +taxableYearlyPay;
              yearlyTaxAmount = +yearlyTaxAmount / 100;
              let monthlyTaxAmount = +yearlyTaxAmount / 12;
              let fixedMonthlyTax = +userFixedTaxAmount / 12;
              data.companyId = companyId;
              data.userId = findEmployees[i]._id;
              data.deduction = "0";
              data.tax = (+monthlyTaxAmount + +fixedMonthlyTax).toFixed(2);
              data.totalDeduction = (+data.tax + +data.deduction).toFixed(2);
              data.firstSalaryDeduction = "0";
              data.bonus = "0";
              data.extraPayment = "0";
              data.basicSalary = +userPay?.toFixed(2);
              data.totalAddition = (+data.bonus + +data.extraPayment).toFixed(2);
              let salaryAfterDeductions = (+userPay - +data.totalDeduction).toFixed(2);
              data.creditSalary = (+data.totalAddition + +salaryAfterDeductions).toFixed(2);

              let absentCount = await attendance.countDocuments(absentCountQuery);

              if (isAbsentDeduction) {
                data.absentFine = (+perDaySalary * +absentCount).toFixed(2);
              } else {
                data.absentFine = "0";
              }

              data.totalDeduction = (+data.totalDeduction + +data.absentFine).toFixed(2);

              data.creditSalary = (+data.creditSalary - +data.absentFine).toFixed(2);

              let newPayroll = new payrolls(data);
              let addPayrolls = await newPayroll.save();
              addedPayrolls.push(addPayrolls);
            }

            else if (employee.deleted && new Date(employee?.employeeExitDate) >= MonthStartDate && new Date(employee?.employeeExitDate) <= MonthEndDate ) {
              let exitDate = new Date(employee?.employeeExitDate);
              let formatExit = employee?.employeeExitDate;
              absentCountQuery.attendanceDate = { $lte: formatExit };
              //let formatExit = employee?.employeeExitDate;

              // let daysCount = await attendance.countDocuments({
              //   userId: employee?._id,
              //   companyId: employee?.companyId, 
              //   attendanceDate: { 
              //     $gte: formattedMonthStartDate, 
              //     $lte: formatExit  
              //   },
              //   status: { 
              //     $nin: ["Holiday"] 
              //   }
              // });
              exitDate?.setUTCHours(23, 59, 59, 999);
              let timeDifference = exitDate - MonthStartDate;
              let daysCount = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
              let data = {};
              data.payMonth = payrollMonth;
              data.payYear = payrollYear;

              let tempPay = findEmployees[i]?.salary;
              let perDaySalary = tempPay / 30;

              let userPay = (exitDate === MonthEndDate) ? tempPay : (perDaySalary * daysCount);

              let userYearlyPay = +userPay * 12;

              let applicableTaxSlab = getApplicableTaxSlab(userYearlyPay);

              let userTax = applicableTaxSlab?.monthlyTaxInPercent;
              if (userTax == undefined) {
                userTax = 0;
              }
              console.log("tax",userTax);
              
              console.log('name',findEmployees[i]?.fullName);
              console.log('tax',applicableTaxSlab?.title);

              if (!applicableTaxSlab) {
                return res.status(400).json({
                  msg: `Some payrolls were not generated due to no applicable tax slabs`,
                  success: false,
                });
              }

              let userFixedTaxAmount = applicableTaxSlab?.fixedYearlyTax;
              if (userFixedTaxAmount == undefined) {
                userFixedTaxAmount = 0;
              }
              let userTaxSlabLowerLimit = applicableTaxSlab?.yearlyPayLowerLimit;
              if (userTaxSlabLowerLimit == undefined) {
                userTaxSlabLowerLimit = 0;
              }

              let taxableYearlyPay = +userYearlyPay - +userTaxSlabLowerLimit;
              let yearlyTaxAmount = userTax * +taxableYearlyPay;
              yearlyTaxAmount = +yearlyTaxAmount / 100;
              let monthlyTaxAmount = +yearlyTaxAmount / 12;
              let fixedMonthlyTax = +userFixedTaxAmount / 12;
              data.companyId = companyId;
              data.userId = findEmployees[i]._id;
              data.deduction = "0";
              data.tax = (+monthlyTaxAmount + +fixedMonthlyTax).toFixed(2);
              data.totalDeduction = (+data.tax + +data.deduction).toFixed(2);
              data.firstSalaryDeduction = "0";
              data.bonus = "0";
              data.extraPayment = "0";
              data.basicSalary = +userPay?.toFixed(2);
              data.totalAddition = (+data.bonus + +data.extraPayment).toFixed(2);
              let salaryAfterDeductions = (+userPay - +data.totalDeduction).toFixed(2);
              data.creditSalary = (+data.totalAddition + +salaryAfterDeductions).toFixed(2);

              let absentCount = await attendance.countDocuments(absentCountQuery);

              if (isAbsentDeduction) {
                data.absentFine = (+perDaySalary * +absentCount).toFixed(2);
              } else {
                data.absentFine = "0";
              }

              data.totalDeduction = (+data.totalDeduction + +data.absentFine).toFixed(2);

              data.creditSalary = (+data.creditSalary - +data.absentFine).toFixed(2);

              let newPayroll = new payrolls(data);
              let addPayrolls = await newPayroll.save();
              addedPayrolls.push(addPayrolls);
            }

            else {
              let data = {};
              data.payMonth = payrollMonth;
              data.payYear = payrollYear;
              let userTax = findEmployees[i]?.taxSlabId?.monthlyTaxInPercent;
              if (userTax == undefined) {
                userTax = 0;
              }
              console.log("userTax",userTax);
              let userPay = findEmployees[i]?.salary;
              console.log("userPay",userPay);
              let userFixedTaxAmount = findEmployees[i]?.taxSlabId?.fixedYearlyTax;
              if (userFixedTaxAmount == undefined) {
                userFixedTaxAmount = 0;
              }
              console.log("userFixedTaxAmount",userFixedTaxAmount);
              let userTaxSlabLowerLimit = findEmployees[i]?.taxSlabId?.yearlyPayLowerLimit;
              if (userTaxSlabLowerLimit == undefined) {
                userTaxSlabLowerLimit = 0;
              }
              console.log("userTaxSlabLowerLimit",userTaxSlabLowerLimit);
              let userYearlyPay = +userPay * 12;
              console.log("userYearlyPay",userYearlyPay);
              let taxableYearlyPay = +userYearlyPay - +userTaxSlabLowerLimit;
              console.log("taxableYearlyPay",taxableYearlyPay);
              let yearlyTaxAmount = userTax * +taxableYearlyPay;
              console.log("yearlyTaxAmount",yearlyTaxAmount);
              yearlyTaxAmount = +yearlyTaxAmount / 100;
              let monthlyTaxAmount = +yearlyTaxAmount / 12;
              console.log("monthlyTaxAmount",monthlyTaxAmount);
              let fixedMonthlyTax = +userFixedTaxAmount / 12;
              console.log("fixedMonthlyTax",fixedMonthlyTax);
              data.companyId = companyId;
              data.userId = findEmployees[i]._id;
              data.deduction = "0";
              data.tax = (+monthlyTaxAmount + +fixedMonthlyTax).toFixed(2);
              console.log("tax deduction",data.tax);
              data.totalDeduction = (+data.tax + +data.deduction).toFixed(2);
              data.firstSalaryDeduction = "0";
              data.bonus = "0";
              data.extraPayment = "0";
              data.basicSalary = userPay;
              data.totalAddition = (+data.bonus + +data.extraPayment).toFixed(2);
              let salaryAfterDeductions = (+userPay - +data.totalDeduction).toFixed(2);
              data.creditSalary = (+data.totalAddition + +salaryAfterDeductions).toFixed(2);
  
              let absentCount = await attendance.countDocuments({
                companyId: companyId,
                userId: findEmployees[i]._id,
                status: "Absent",
                attendanceMonth: data.payMonth,
                attendanceYear: data.payYear,
              });
  
              let perDaySalary = userPay / 30;
  
              if (isAbsentDeduction) {
                data.absentFine = (+perDaySalary * +absentCount).toFixed(2);
              } else {
                data.absentFine = "0";
              }
  
              data.totalDeduction = (+data.totalDeduction + +data.absentFine).toFixed(2);
  
              data.creditSalary = (+data.creditSalary - +data.absentFine).toFixed(2);
  
              let newPayroll = new payrolls(data);
              let addPayrolls = await newPayroll.save();
              addedPayrolls.push(addPayrolls);
            }
          }

          else if (employee.salaryType === 'Hourly') {
            let data = {};
            data.payMonth = payrollMonth;
            data.payYear = payrollYear;

            let endDate = MonthEndDate;

            if (employee.deleted) {
              const employeeExitDate = new Date(employee.employeeExitDate);
      
              if (employeeExitDate < MonthEndDate) {
                endDate = employeeExitDate;
              }
          }

            let timesheets = await timesheetModel.find({
              userId: findEmployees[i]._id,
              status: "Approved",
              date: { $gte: MonthStartDate, $lte: endDate }  // startDate and endDate need to be defined based on payrollMonth and payrollYear
            });

            console.log('timeshets',timesheets)

            let totalHours = 0;
            timesheets?.forEach(sheet => {
                let [hours, minutes] = sheet?.hoursWorked?.split(':')?.map(Number);
                totalHours += hours + (minutes / 60);
            });

            let formattedHoursWorked = (() => {
              let hours = Math.floor(totalHours);
              let minutes = Math.round((totalHours - hours) * 60);
              
              // Pad the minutes with leading zeros if necessary
              let formattedMinutes = minutes.toString().padStart(2, '0');
              // Pad the hours with leading zeros if necessary
              let formattedHours = hours.toString().padStart(2, '0');
              
              return `${formattedHours}h ${formattedMinutes}m`;
            })();

            console.log('totalHours',totalHours)
            data.hoursWorked = formattedHoursWorked;

            let userPay = findEmployees[i]?.salary;
            let monthlySalary = parseFloat((totalHours * userPay).toFixed(2));

            // let userFixedTaxAmount = findEmployees[i]?.taxSlabId?.fixedYearlyTax;
            // if (userFixedTaxAmount == undefined) {
            //   userFixedTaxAmount = 0;
            // }
            // let userTaxSlabLowerLimit = findEmployees[i]?.taxSlabId?.yearlyPayLowerLimit;
            // if (userTaxSlabLowerLimit == undefined) {
            //   userTaxSlabLowerLimit = 0;
            // }
            let userYearlyPay = +monthlySalary * 12;
            let applicableTaxSlab = getApplicableTaxSlab(userYearlyPay);

            let userTax = applicableTaxSlab?.monthlyTaxInPercent;
            if (userTax == undefined) {
              userTax = 0;
            }
            console.log('name',findEmployees[i]?.fullName);
            console.log('tax',applicableTaxSlab?.title);

            if (!applicableTaxSlab) {
              return res.status(400).json({
                msg: `Some payrolls were not generated due to no applicable tax slabs`,
                success: false,
              });
            }

            let userFixedTaxAmount = applicableTaxSlab?.fixedYearlyTax;
            if (userFixedTaxAmount == undefined) {
              userFixedTaxAmount = 0;
            }
            let userTaxSlabLowerLimit = applicableTaxSlab?.yearlyPayLowerLimit;
            if (userTaxSlabLowerLimit == undefined) {
              userTaxSlabLowerLimit = 0;
            }
            
            let taxableYearlyPay = +userYearlyPay - +userTaxSlabLowerLimit;
            let yearlyTaxAmount = userTax * +taxableYearlyPay;
            yearlyTaxAmount = +yearlyTaxAmount / 100;
            let monthlyTaxAmount = +yearlyTaxAmount / 12;
            let fixedMonthlyTax = +userFixedTaxAmount / 12;
            data.companyId = companyId;
            data.userId = findEmployees[i]._id;
            data.deduction = "0";
            data.tax = (+monthlyTaxAmount + +fixedMonthlyTax).toFixed(2);
            data.totalDeduction = (+data.tax + +data.deduction).toFixed(2);
            data.firstSalaryDeduction = "0";
            data.bonus = "0";
            data.extraPayment = "0";
            data.basicSalary = monthlySalary;
            data.totalAddition = (+data.bonus + +data.extraPayment).toFixed(2);
            let salaryAfterDeductions = (+monthlySalary - +data.totalDeduction).toFixed(2);
            data.creditSalary = (+data.totalAddition + +salaryAfterDeductions).toFixed(2);

            // let absentCount = await attendance.countDocuments({
            //   companyId: companyId,
            //   userId: findEmployees[i]._id,
            //   status: "Absent",
            //   attendanceMonth: data.payMonth,
            //   attendanceYear: data.payYear,
            // });

            //let perDaySalary = monthlySalary / 30;

            //data.absentFine = (+perDaySalary * +absentCount).toFixed(2);

            //data.totalDeduction = (+data.totalDeduction + +data.absentFine).toFixed(2);

            //data.creditSalary = (+data.creditSalary - +data.absentFine).toFixed(2);

            let newPayroll = new payrolls(data);
            let addPayrolls = await newPayroll.save();
            addedPayrolls.push(addPayrolls);
          }

          else{
            console.log('No payrolls for Unpaid Employees')
          }
        }

        if (!addedPayrolls.length) {
          return res.status(404).json({
            msg: "Payrolls for month already exist",
            success: false,
          });
        }

        res.status(200).json({
          payrolls: addedPayrolls,
          msg: "Payrolls generated",
          success: true,
        });
      }
    } catch (error) {
      res.status(500).json({
        msg: "Failed to generate payrolls",
        error: error.message,
        success: false,
      });
    }
  },

  // downloadPayrolls: async (req, res) => {
  //   try {
  //     let id = req.token._id;

  //     let checkUserIfExist =
  //       (await user.findOne({ _id: id }, { deleted: false })) ||
  //       (await admin.findOne({ _id: id }, { deleted: false }));

  //     if (!checkUserIfExist) {
  //       return res.status(404).json({
  //         msg: "User does not exist",
  //         success: false,
  //       });
  //     }

  //     let checkPermission = await Permission.findOne({ userId: id });
  //     let isAllowed = services.checkPermissions(
  //       checkPermission,
  //       "financeManagement",
  //       "managePayrolls"
  //     );
  //     if (!isAllowed) {
  //       return res.status(401).json({
  //         msg: "Unauthorized User",
  //         success: false,
  //       });
  //     }

  //     const findPayrolls = await payrolls
  //       .find({
  //         companyID: checkUserIfExist.companyID,
  //         payMonth: req.query.payMonth,
  //         payYear: req.query.payYear,
  //         processed: req.query.processed === "true" ? true : false,
  //       })
  //       .populate("userId");

  //     let payrollData = [];
  //     if (findPayrolls.length > 0) {
  //       payrollData = findPayrolls.map((payroll) => ({
  //         userId: payroll.userId.cnicNumber,
  //         employeeName: payroll.userId.employeeName,
  //         pay: payroll.pay,
  //         deduction: payroll.deduction,
  //         deductionReason: payroll.deductionReason,
  //         tax: payroll.tax,
  //         totalDeduction: payroll.totalDeduction,
  //         firstSalaryDeduction: payroll.firstSalaryDeduction,
  //         bonus: payroll.bonus,
  //         bonusReason: payroll.bonusReason,
  //         totalAddition: payroll.totalAddition,
  //         creditSalary: payroll.creditSalary,
  //         modeOfPayment: payroll.modeOfPayment,
  //         transactionId: payroll.transactionId,
  //         extraPayment: payroll.extraPayment,
  //         extraPaymentReason: payroll.extraPaymentReason,
  //         payMonth: payroll.payMonth,
  //         payYear: payroll.payYear,
  //         processed: payroll.processed,
  //         employeeSalary: payroll.userId.salary,
  //         bankName: payroll.userId.bankName,
  //         accountNo: payroll.userId.accountNo,
  //       }));
  //     }

  //     if (req.query.downloadType === "csv") {
  //       const worksheet = XLSX.utils.json_to_sheet(payrollData);
  //       const workbook = XLSX.utils.book_new();
  //       XLSX.utils.book_append_sheet(workbook, worksheet, "Payrolls");

  //       const excelData = XLSX.write(workbook, {
  //         bookType: "xlsx",
  //         type: "buffer",
  //         cellStyles: true,
  //         cellDates: true,
  //         bookSST: true,
  //       });

  //       res.setHeader(
  //         "Content-disposition",
  //         `attachment; filename=payrolls.xlsx`
  //       );
  //       res.set(
  //         "Content-Type",
  //         "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  //       );
  //       res.send(excelData);
  //     } else if (req.query.downloadType === "pdf") {
  //       const tableBody = payrollData.map((item) =>
  //         [
  //           item.userId,
  //           item.employeeName,
  //           item.employeeSalary,
  //           item.tax,
  //           item.creditSalary,
  //           item.bankName,
  //           item.accountNo,
  //           // rest of your data fields...
  //         ].map((i) => (i === undefined ? "" : i))
  //       );

  //       const docDefinition = {
  //         content: [
  //           { text: "Payrolls", style: "header" },
  //           {
  //             layout: "lightHorizontalLines",
  //             table: {
  //               widths: [
  //                 "auto",
  //                 "auto",
  //                 "auto",
  //                 "auto",
  //                 "auto",
  //                 "auto",
  //                 "auto",
  //               ], // define each column width
  //               headerRows: 1,
  //               body: [
  //                 [
  //                   "User ID",
  //                   "Employee Name",
  //                   "Employee Salary",
  //                   "Employee Tax",
  //                   "Credit Salary",
  //                   "Bank",
  //                   "Account No",
  //                   // rest of your header fields...
  //                 ],
  //                 ...tableBody,
  //               ],
  //             },
  //           },
  //         ],
  //         // Specify the page margins [left, top, right, bottom] or [horizontal, vertical]
  //         pageMargins: [40, 80, 40, 80],
  //         // Specify the default style
  //         defaultStyle: {
  //           fontSize: 8, // set default font size
  //         },
  //       };

  //       const pdfDoc = pdfmake.createPdf(docDefinition);
  //       pdfDoc.getBuffer((buffer) => {
  //         res.setHeader(
  //           "Content-disposition",
  //           `attachment; filename=payrolls.pdf`
  //         );
  //         res.set("Content-Type", "application/pdf");
  //         res.send(Buffer.from(buffer, "binary"));
  //       });
  //     } else {
  //       return res.status(400).json({
  //         msg: `Download type ${req.query.downloadType} is not supported format`,
  //         success: false,
  //       });
  //     }
  //   } catch (error) {
  //     res.status(500).json({
  //       msg: "Failed to download payrolls",
  //       error: error.message,
  //       success: false,
  //     });
  //   }
  // },

  viewEmployeesPayrolls: async (req, res) => {
    try {
      const _id = req.token._id;
      let checkUserIfExist = await user.findOne({ _id: _id }, { deleted: false });

      if (!checkUserIfExist) {
        return res.status(404).json({
          msg: "User does not exist",
          success: false,
        });
      }

      let isAllowed = false;

      if (checkUserIfExist.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({
          roleId: checkUserIfExist.roleId,
        });
        isAllowed = services.checkPermissions(checkPermission, "financeManagement", "managePayrolls");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }

      const paginateOptions = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
      };

      const companyId = checkUserIfExist.companyId;

      let matchOptions = {
        companyId,
        processed: req.query.processed === "true" ? true : false,
      };

      if (req.query.payMonth && req.query.payYear) {
        matchOptions.payMonth = req.query.payMonth;
        matchOptions.payYear = req.query.payYear;
      }

      if (req.query.employeeName) {
        matchOptions["user.fullName"] = {
          $regex: new RegExp(req.query.employeeName, "i"),
        };
      }

      if (req.query.employeeId) {
        matchOptions["user.employeeId"] = {
          $regex: new RegExp(req.query.employeeId, "i"),
        };
      }

      const aggregateOptions = [
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
              from: "designations",
              localField: "user.designationId",
              foreignField: "_id",
              as: "designation",
          },
        },
        {
            $unwind: {
                path: "$designation",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $lookup: {
                from: "companies",
                localField: "companyId",
                foreignField: "_id",
                as: "company",
            },
        },
        {
            $unwind: {
                path: "$company",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
          $match: matchOptions,
        },
        {
          $project: {
            companyID: 1,
            pay: 1,
            deduction: 1,
            deductionReason: 1,
            tax: 1,
            totalDeduction: 1,
            bonus: 1,
            bonusReason: 1,
            totalAddition: 1,
            creditSalary: 1,
            basicSalary: 1,
            hoursWorked: 1,
            modeOfPayment: 1,
            transactionId: 1,
            extraPayment: 1,
            extraPaymentReason: 1,
            payMonth: 1,
            payYear: 1,
            absentFine: 1,
            processed: 1,
            status: 1,
            createdAt: 1,
            updatedAt: 1,
            user: {
              _id: 1,
              fullName: "$user.fullName",
              employeeId: "$user.employeeId",
              imageUrl: "$user.imageUrl",
              salary: "$user.salary",
              salaryType: "$user.salaryType",
              nationalIdentityNumber: "$user.nationalIdentityNumber",
              email: "$user.email",
              bankName: "$user.bankName",
              bankAccountNumber: "$user.bankAccountNumber",
              designationName: "$designation.designationName",
            },
            companyName: "$company.companyName",
            imageUrl: "$company.imageUrl",
            preferredCurrency: "$company.preferredCurrency",
          },
        },
        {
          $sort: { createdAt: -1 },  
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            data: { $push: "$$ROOT" },
          },
        },
        {
          $project: {
            _id: 0,
            count: 1,
            data: {
              $slice: ["$data", (paginateOptions.page - 1) * paginateOptions.limit, paginateOptions.limit],
            },
          },
        },
      ];

      const [result] = await payrolls.aggregate(aggregateOptions).exec();
      const resultData = result ? result.data : [];
      const totalCount = result ? result.count : 0;

      const response = {
        payrolls: resultData,
        totalCount: totalCount,
        totalPages: Math.ceil(totalCount / paginateOptions.limit),
        currentPage: paginateOptions.page,
        success: true,
      };

      return res.status(200).json(response);
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to view payrolls",
        error: error.message,
        success: false,
      });
    }
  },
  processPayroll: async (req, res) => {
    try {
      let _id = req.token._id;
      let companyId = req.token.companyId;
      let checkUserIfExist = await user.findOne({ _id: _id }, { deleted: false });

      if (!checkUserIfExist) {
        return res.status(404).json({
          msg: "User does not exist",
          success: false,
        });
      }

      let isAllowed = false;

      if (checkUserIfExist.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({
          roleId: checkUserIfExist.roleId,
        });
        isAllowed = services.checkPermissions(checkPermission, "financeManagement", "managePayrolls");
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
          msg: "tax slab id is required",
          success: false,
        });
      }

      const monthNumberToString = {
        January: 1,
        February: 2,
        March: 3,
        April: 4,
        May: 5,
        June: 6,
        July: 7,
        August: 8,
        September: 9,
        October: 10,
        November: 11,
        December: 12
      };

      let findPayroll = await payrolls.findOne({ _id: id });

      let payrollYear = findPayroll?.payYear;

      const profitLossMonth = monthNumberToString[findPayroll?.payMonth];

      let currentCreditSalary = parseFloat(findPayroll?.creditSalary);
      let originalTotalAddition = parseFloat(findPayroll?.totalAddition);
      let originalTotalDeduction = parseFloat(findPayroll?.totalDeduction);
      let originalTemp = parseFloat(findPayroll?.tempDeduction);

      // let totalDeduction = (+data.deduction).toFixed(2);
      // let totalAddition = (+data.bonus + +data.extraPayment).toFixed(2);

      // let newCreditableSalary = +currentCreditSalary + +originalTotalDeduction - +data.deduction;
      //.log("old", newCreditableSalary)

      let newValue= !originalTemp ? 0 : +originalTemp;
      
      let totalDeduction = (+originalTotalDeduction - +newValue + +data.deduction).toFixed(2);
      let totalAddition = (+data.bonus + +data.extraPayment).toFixed(2);

      

      let newCreditableSalary = +currentCreditSalary + +newValue - +data.deduction;
      
      newCreditableSalary = +newCreditableSalary - +originalTotalAddition + +totalAddition;

      if (data.processed === false) {
        let updatePayroll = await payrolls.findOneAndUpdate(
          { _id: id },
          {
            ...data,
            totalAddition: totalAddition,
            totalDeduction: totalDeduction,
            tempDeduction: data.deduction,
            creditSalary: newCreditableSalary.toFixed(2),
          },
          {
            new: true,
          }
        );
        console.log(companyId,profitLossMonth,payrollYear)

        let profitLossDoc = await profitLossModel.findOne({
          companyId: companyId,
          month: profitLossMonth,
          year: payrollYear
        });

        if (profitLossDoc) {
          await profitLossModel.findByIdAndUpdate(profitLossDoc._id, { isValueChanged: true });
        }
        
        return res.status(200).json({
          payroll: updatePayroll,
          success: true,
        });
      } else {
        let updatePayroll = await payrolls.findOneAndUpdate(
          { _id: id },
          {
            ...data,
            totalAddition: totalAddition,
            totalDeduction: totalDeduction,
            tempDeduction: data.deduction,
            creditSalary: newCreditableSalary.toFixed(2),
            status: "Paid",
          },
          {
            new: true,
          }
        );
        console.log(companyId,profitLossMonth,payrollYear)

        let profitLossDoc = await profitLossModel.findOne({
          companyId: companyId,
          month: profitLossMonth,
          year: payrollYear
        });

        if (profitLossDoc) {
          await profitLossModel.findByIdAndUpdate(profitLossDoc._id, { isValueChanged: true });
        }

        return res.status(200).json({
          payroll: updatePayroll,
          success: true,
        });
      }
    } catch (error) {
      res.status(500).json({
        msg: "Failed to update payroll",
        error: error.message,
        success: false,
      });
    }
  },
  employeePayrolls: async (req, res) => {
    try {
      let _id = req.token._id;
      let checkUserIfExist = await user.findOne({ _id: _id }, { deleted: false });

      if (!checkUserIfExist) {
        return res.status(404).json({
          msg: "User does not exist",
          success: false,
        });
      }

      let isAllowed = false;

      if (checkUserIfExist.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({
          roleId: checkUserIfExist.roleId,
        });
        isAllowed = services.checkPermissions(checkPermission, "financeManagement", "viewSelfPayrolls");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }

      const paginateOptions = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
      };
      var options = {
        ...paginateOptions,
        populate: [
          {
            path: 'userId',
            select: 'employeeId fullName designationId salary salaryType',
            populate: {
              path: 'designationId',
              select: 'designationName',
            },
          },
          {
            path: 'companyId',
            select: 'imageUrl companyName preferredCurrency',
          },
        ],
        sort: { createdAt: -1 },
      };

      let filter = {};

      filter.userId = req.token._id;
      filter.processed = true;

      if (req.query.payMonth) {
        filter.payMonth = req.query.payMonth;
      }

      if (req.query.payYear) {
        filter.payYear = req.query.payYear;
      }

      let findPayrolls = await payrolls.paginate(filter, { ...options });

      return res.status(200).json({
        payrolls: findPayrolls,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to view employee Payrolls",
      });
    }
  },
  viewPayroll: async (req, res) => {
    try {
      let findPayroll = await payrolls.findOne({ _id: req.body._id });

      if (!findPayroll) {
        return res.status(404).json({
          msg: "No payroll found",
          success: false,
        });
      }
      return res.status(200).json({
        payroll: findPayroll,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to show payroll",
        success: false,
      });
    }
  },

  deletePayroll: async (req, res) => {
    try {
      let id = req.token._id;
      let checkUserIfExist = await user.findOne({ _id: id }, { deleted: false });

      if (!checkUserIfExist) {
        return res.status(404).json({
          msg: "User does not exist",
          success: false,
        });
      }

      let checkPermission = await Permission.findOne({
        roleId: checkUserIfExist.roleId,
      });
      let isAllowed = services.checkPermissions(checkPermission, "financeManagement", "managePayrolls");
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: false,
        });
      }

      let _id = req.body._id;
      if (!_id) {
        return res.status(400).json({
          msg: "payroll id is required",
          success: false,
        });
      }

      let payroll = await payrolls.findOneAndUpdate({ _id }, { deleted: true });

      if (!payroll) {
        return res.status(404).json({
          msg: "no record found",
        });
      }

      return res.status(200).json({
        msg: "payroll deleted Successfully",
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to delete payroll",
        error: error.message,
        success: false,
      });
    }
  },
};
module.exports = methods;
