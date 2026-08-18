require('dotenv').config();
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
let User = require('../models/user.model');
let Company = require('../models/company.model');
let Request = require('../models/requests.model');
let Permission = require('../models/permissions.model');
let Project = require('../models/projectManagement.model');
let Attendance = require('../models/attendance.model');
let Client = require('../models/client.model');
let FocalPerson = require('../models/focalPerson.model');
let Invoices = require('../models/invoices.model');
let Expenses = require('../models/expenses.model');
let ProfitLoss = require('../models/profitLoss.model');
let Holidays = require('../models/holidays.model');
let Tasks = require('../models/tasks.model');
let services = require('../utils/services');
let utils = require('../utils/index');
let moment = require('moment');
let bcrypt = require('bcrypt');
const randomstring = require('randomstring');
const focalPersonModel = require('../models/focalPerson.model');
const userQueue = require('../queues/userQueue');
const { excelToJson } = require('../utils/excelFunctions');
const superAdminModel = require('../models/superAdmin.model');

const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

const generateOTP = async (user) => {
  try {
    let otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationToken = otp;
    user.verificationTokenExpires = Date.now() + 5 * 60 * 1000;

    await user.save();

    services.sendOTP(user.email, otp)

    setTimeout(async () => {
      let currentUser = await superAdminModel.findById(user._id);

      if (currentUser && currentUser.verificationToken === otp) {
        currentUser.verificationToken = null;
        currentUser.verificationTokenExpires = null;
        await currentUser.save();
      }
    }, 5 * 60 * 1000);
  }
  catch (error) {
    console.error("Error generating OTP: ", error.message);
    throw error; 
  }
}

let methods = {
  addUser: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = await User.findOne({ _id: userId });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === 'admin') {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, 'employeeManagement', 'addUser');
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: 'Unauthorized User',
          success: true,
        });
      }
      let data = req.body;

      data.email = data.email.toLowerCase();

      let companyId = data.companyId;

      let userExist = await User.findOne({ email: data.email, companyId });

      if (userExist) {
        return res.status(409).json({
          msg: 'User already exist with this email',
        });
      }

      let userExistWithSameId = await User.findOne({
        employeeId: data.employeeId,
        companyId,
      });

      if (userExistWithSameId) {
        return res.status(409).json({
          msg: 'User already exist with same user id',
        });
      }

      data.password = await bcrypt.hash(data.password, 10);

      let randomString = randomstring.generate();
      data.verificationToken = randomString;

      let number = data.phoneNo;

      let parsedNumber = phoneUtil.parse(number);

      if (parsedNumber == false) {
        return res.status(400).json({
          msg: 'Input Valid Number with Country Code',
          success: false,
        });
      }

      let validNumber = phoneUtil.isValidNumber(phoneUtil.parse(number));

      if (validNumber === false) {
        return res.status(400).json({
          msg: 'Input Valid Number',
          success: false,
        });
      }

      if (data.teamLead == '') {
        data.teamLead = null;
      }

      data.remainingSickLeaves = data.sickLeaves
      data.remainingCasualLeaves = data.casualLeaves
      data.remainingWorkFromHomeLeaves = data.workFromHomeLeaves
      data.remainingBereavementLeaves = data.bereavementLeaves
      data.remainingUnpaidLeaves = data.unpaidLeaves
      data.remainingPaternityLeaves = data.paternityLeaves
      data.remainingMaternityLeaves = data.maternityLeaves
      data.remainingMarriageLeaves = data.marriageLeaves
      data.remainingHalfDayLeaves = data.halfDayLeaves
      data.remainingAnnualLeaves = data.annualLeaves

      data.allotedLeaves =
        +data.sickLeaves +
        +data.casualLeaves +
        // +data.workFromHomeLeaves +
        +data.bereavementLeaves +
        +data.unpaidLeaves +
        +data.paternityLeaves +
        +data.maternityLeaves +
        +data.marriageLeaves +
        +data.halfDayLeaves +
        +data.annualLeaves;

      data.remainingLeaves = data.allotedLeaves;

      let user = new User({ ...data, companyId: companyId });

      let addUser = await user.save();
      await services.sendVerificationMail(data.email, randomString);

      if (!addUser) {
        return res.status(400).json({
          msg: 'Bad Reqeust! Fill out the required fields to Add User',
          success: false,
        });
      }

      return res.status(200).json({
        User: {
          _id: user._id,
          name: user.employeeName,
          email: user.email,
        },
        msg: 'User added',
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: `Failed to create new User`,
        error: error.message,
        success: false,
      });
    }
  },

  viewAllEmployees: async (req, res) => {
    try {
      let companyId = req.token.companyId;
      let allEmployees = await User.find({
        companyId: companyId,
        deleted: false,
      })
        .select('_id fullName imageUrl startTime maxStartTime endTime')
        .populate({
          path: 'shiftId',
          select: 'startTime maxStartTime endTime', // Add the specific fields you want to select here
        }); 
      return res.status(200).json({
        User: allEmployees,
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

  viewUser: async (req, res) => {
    try {
      let userId = req.token._id;
      let designationId = req.query.designation;
      let employeeName = req.query.employeeName;
      let employeeId = req.query.employeeId;
      let userStatus = req.query.userStatus;
      let userRole = req.query.userRole;

      let findUser = await User.findOne({ _id: userId });
      let roleId = findUser.roleId;
      let isAllowed;

      if (findUser.role === 'admin') {
        isAllowed = true;
      } else {
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, 'employeeManagement', 'viewAllUsers');
      }

      if (!isAllowed) {
        return res.status(401).json({
          msg: 'Unauthorized User',
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

      var options = {
        ...paginateOptions,
        populate: [{ path: 'designationId' }, { path: 'teamId' }, { path: 'reportsTo' }],
        sort: { userStatus: 1, createdAt: -1 }, // Sort by status and createdAt
      };

      let companyId = req.token.companyId;
      let findCompany = await Company.findOne({
        _id: companyId,
        deleted: false,
      });

      if (!findCompany) {
        return res.status(404).json({
          msg: 'No Company Found',
          success: false,
        });
      }

      let activeCompanyId = findCompany._id;
      let filter = { companyId: activeCompanyId };

      let preferredCurrency = findCompany?.preferredCurrency;

      if (employeeName) {
        filter.fullName = { $regex: employeeName, $options: 'i' };
      }

      if (designationId) {
        try {
          // Convert designationId to ObjectId
          filter.designationId = new ObjectId(`${designationId}`);
        } catch (error) {
          console.error(error);
        }
      }

      if (employeeId) {
        filter.employeeId = employeeId;
      }

      if (userStatus) {
        filter.userStatus = userStatus;
      }
      
      if (userRole) {
        filter.roleId = userRole;
      }

      let users = await User.paginate(filter, options);
      const usersToReturn = users.docs.map((us) => {
        return {
          ...us?.toObject(),
          designationName: us?.designationId?.designationName,
          teamLead: us?.reportsTo?.fullName,
          team: us?.teamId?.teamName,
          designationId: us?.designationId?._id,
          teamId: us?.teamId?._id,
          currency: preferredCurrency,
          reportsTo: us?.reportsTo?._id,
        };
      });

      return res.status(200).json({
        users: { ...users, docs: usersToReturn },
        currency: preferredCurrency,
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

  viewAllocation: async (req, res) => {
    try {
      let companyId = req.token.companyId;

      const paginateOptions =
        req.query.page && req.query.limit
          ? { page: req.query.page, limit: req.query.limit }
          : {
              page: 1,
              limit: 10,
            };

      let allEmployeesPaginated = await User.paginate({
          companyId: companyId,
          deleted: false,
      }, {
          ...paginateOptions,
          select: '_id fullName imageUrl employeeType',
          populate: [
              { path: 'shiftId', select: 'startTime maxStartTime endTime' },
              { path: 'teamId', select: 'teamName' },
              { path: 'designationId', select: 'designationName' },
          ]
      });

      //console.log(allEmployeesPaginated)

    let allEmployees = allEmployeesPaginated.docs;

        const currentYear = new Date().getFullYear();
        let Month = new Date().getMonth();
        let startOfMonth = new Date(Date.UTC(currentYear, Month, 1));
        startOfMonth = startOfMonth.toISOString().slice(0, 10)

        const targetMonth = (Month + 6) % 12;
        const targetYear = currentYear + Math.floor((Month + 6) / 12);
        let endOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0, 23, 59, 59, 999));

        endOfTargetMonth = endOfTargetMonth.toISOString().slice(0, 10)

        let userIds = allEmployees?.map(user => user._id);
        let projects = await Project?.find({
          $or: [
            { assignedDevelopers: { $in: userIds } },
            { projectLead: { $in: userIds } }
          ],
          endDate: { $gte: startOfMonth },
          deleted: false,
          status: "On-Going",
          _id: { $ne: '663b1d99591b5aa4e1478073' }
        }).populate('projectLead', 'fullName imageUrl').populate('clientId', 'clientName logo');

        let userToAccountManagers = {};
        let userToBilledStatus = {};
        let userToProjectsIn6Months = {};
        let userProjectCount = {}; 
        let userBilledProjectCount = {}; 
        let userNonBilledProjectCount = {};
        let userBilledUntil = {};

        projects?.forEach(project => {
          const isBilled = project.projectType === 'Billed';

          const endDate = new Date(project.endDate);
          const startDate = new Date(project.startDate);
          const startMonthName = startDate.toLocaleString('default', { month: 'long' });
          const startYear = startDate.toLocaleString('default', { year: 'numeric' });
          const monthName = endDate.toLocaleString('default', { month: 'long' });
          const year = endDate.toLocaleString('default', { year: 'numeric' });
          const projectStart = project?.startDate;
          const projectEnd = project?.endDate;
          const projectType = project?.projectType;
          const projectLeadName = project?.projectLead?.fullName;
          const clientName = project.clientId?.clientName;
          const projectLeadImage = project?.projectLead?.imageUrl;
          const clientImage = project.clientId?.logo;
          
          const projectInfo = { 
            _id: project._id,
            projectName: project.projectName,
            startMonthName: startMonthName,
            startYear: startYear,
            monthName: monthName,
            year: year,
            projectStart: projectStart,
            projectEnd: projectEnd,
            projectType: projectType,
            projectLead: projectLeadName,
            clientName: clientName,
            projectLeadImage: projectLeadImage,
            clientImage: clientImage,
          };
          // Combine assignedDevelopers and projectlead into a single array
          const combinedDevelopersAndLead = [
            ...(project.assignedDevelopers || []),
            project.projectLead?._id || project.projectLead
          ];
          console.log("Combined Developer and Lead IDs", combinedDevelopersAndLead);
          // Eliminate duplicates using Set
          const uniqueDevelopersAndLeads = combinedDevelopersAndLead.reduce((unique, current) => {
            // Normalize to string for comparison
            const id = (current._id || current).toString();
            if (!unique.some(item => (item._id || item).toString() === id)) {
              unique.push(current);
            }
            return unique;
          }, []);
          console.log("Normalized Developer and Lead IDs", uniqueDevelopersAndLeads);
          
          uniqueDevelopersAndLeads?.forEach(developerId => {

            if (!userProjectCount[developerId]) {
              userProjectCount[developerId] = 0;
            }
            if (!userBilledProjectCount[developerId]) {
              userBilledProjectCount[developerId] = 0;
            }
            if (!userNonBilledProjectCount[developerId]) {
              userNonBilledProjectCount[developerId] = 0;
            }

            userProjectCount[developerId]++;
            if (isBilled) {
              userBilledProjectCount[developerId]++;
              if (!userBilledUntil[developerId] || new Date(project.endDate) > new Date(userBilledUntil[developerId])) {
                userBilledUntil[developerId] = project.endDate;
            }
            } else {
              userNonBilledProjectCount[developerId]++;
            }
            

            if (!userToAccountManagers[developerId]) {
              userToAccountManagers[developerId] = new Set();
            }
            userToAccountManagers[developerId].add(project.projectLead);
            if (isBilled) {
              userToBilledStatus[developerId] = true;
            } else if (userToBilledStatus[developerId] === undefined) {
              userToBilledStatus[developerId] = false;
            }
            if (!userToProjectsIn6Months[developerId]) {
              userToProjectsIn6Months[developerId] = [];
            }
            userToProjectsIn6Months[developerId].push(projectInfo);
          });

          if (userIds.includes(project.projectLead._id)) {

            if (!userProjectCount[project.projectLead._id]) {
              userProjectCount[project.projectLead._id] = 0;
            }
            if (!userBilledProjectCount[project.projectLead._id]) {
              userBilledProjectCount[project.projectLead._id] = 0;
            }
            if (!userNonBilledProjectCount[project.projectLead._id]) {
              userNonBilledProjectCount[project.projectLead._id] = 0;
            }

            userProjectCount[project.projectLead._id]++;
            if (isBilled) {
              userBilledProjectCount[project.projectLead._id]++;
              if (!userBilledUntil[project.projectLead._id] || new Date(project.endDate) > new Date(userBilledUntil[project.projectLead._id])) {
                userBilledUntil[project.projectLead._id] = project.endDate;
            }
            } else {
              userNonBilledProjectCount[project.projectLead._id]++;
            }


            if (!userToAccountManagers[project.projectLead._id]) {
              userToAccountManagers[project.projectLead._id] = new Set();
            }
            userToAccountManagers[project.projectLead._id].add(project.projectLead);
    
            if (isBilled) {
              userToBilledStatus[project.projectLead._id] = true;
            } else if (userToBilledStatus[project.projectLead._id] === undefined) {
              userToBilledStatus[project.projectLead._id] = false;
            }
            if (!userToProjectsIn6Months[project.projectLead._id]) {
              userToProjectsIn6Months[project.projectLead._id] = [];
            }
            userToProjectsIn6Months[project.projectLead._id].push(projectInfo);
            }
        });

        // Embed the account managers within each user object
        allEmployees = allEmployees?.map(user => {
          return {
            ...user._doc,
            accountManagers: Array.from(userToAccountManagers[user._id] || []),
            billed: userToBilledStatus[user._id] || false,
            projectsIn6Months: userToProjectsIn6Months[user._id] || [],
            totalAssignedProjects: userProjectCount[user._id] || 0,
            billedProjects: userBilledProjectCount[user._id] || 0,
            nonBilledProjects: userNonBilledProjectCount[user._id] || 0,
            billedUntil: userBilledUntil[user._id] || null
          };
        });

      return res.status(200).json({
        User: allEmployees,
        totalDocs: allEmployeesPaginated.totalDocs,
        limit: allEmployeesPaginated.limit,
        totalPages: allEmployeesPaginated.totalPages,
        page: allEmployeesPaginated.page,
        pagingCounter: allEmployeesPaginated.pagingCounter,
        hasPrevPage: allEmployeesPaginated.hasPrevPage,
        hasNextPage: allEmployeesPaginated.hasNextPage,
        prevPage: allEmployeesPaginated.prevPage,
        nextPage: allEmployeesPaginated.nextPage,
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

  loginAdmin: async (req, res) => {
    try {
      let data = req.body;
      let token = data.token;
      let email = data?.email.toLowerCase();
      let password = data.password;

      // const allowedEmails = ['qazi@devgate.ca', 'aqib@devgate.ca'];

      // // Check if the email is in the allowedEmails array
      // if (!allowedEmails.includes(email)) {
      //   return res.status(403).json({
      //     msg: 'This email is not allowed to access the admin panel',
      //     success: false,
      //   });
      // }

      if (!token) {
        if (!email || !password) {
          return res.status(401).json({
            msg: 'Please enter right Credentials!',
            success: false,
          });
        }

        let user = await superAdminModel.findOne({ email });

        if (!user || user.superAdmin === false) {
          return res.status(404).json({
            msg: 'User with this email not found',
            success: false,
          });
        }

        // let isVerified = user.verified;
        // if (isVerified == false) {
        //   return res.status(400).json({
        //     msg: 'User not verified! Go and check your mail for email verification',
        //     verified: user.verified,
        //     success: false,
        //   });
        // }
        let userDeletedStatus = user.deleted;
        if (userDeletedStatus == true) {
          return res.status(400).json({
            msg: 'This User have been disabled by Admin! Not Allowed to Login',
            success: false,
          });
        }

        let match = await utils.comparePassword(password, user.password);

        if (!match) {
          return res.status(401).json({
            msg: 'Wrong Password Entered',
            success: false,
          });
        }
        if (user?.superAdmin == true) {
          await generateOTP(user);
          return res.status(200).json({ msg: 'A 6 digit OTP has been sent to your email', success: true });
        } else{
          return res.status(400).json({
            msg: 'Unauthorized user',
            success: false,
          });
        }

      } else {
        let user = await superAdminModel.findOne({ email: email });

        if (!user || user.superAdmin === false) {
          return res.status(404).json({
            msg: 'user not found!',
            success: false,
          });
        }

        if (Date.now() > user.verificationTokenExpires) {
          user.verificationToken = null;
          user.verificationTokenExpires = null;
          await user.save();
          throw new Error('OTP has expired');
        }

        if (user.verificationToken !== token) {
          return res.status(404).json({
            msg: 'invalid otp entered!',
            success: false,
          });
        }

        let tokenEmail = user.email;
        let tokenPassword = user.password;

        if (!email || !password) {
          return res.status(401).json({
            msg: 'Please enter right Credentials!',
            success: false,
          });
        }

        if (tokenEmail != email) {
          return res.status(400).json({
            msg: 'Invalid Token or Invalid User trying with Token',
            success: false,
          });
        }
        let match = await utils.comparePassword(password, tokenPassword);

        if (!match) {
          return res.status(400).json({
            msg: 'Wrong Password Entered',
            success: false,
          });
        }

        let updateUser = await superAdminModel.findOneAndUpdate(
          { email: email },
          { $set: { verificationToken: '', verificationTokenExpires: null} }
        );

        let access_token = await utils.adminToken({
          _id: user._id,
          companyId: user.companyId,
        }); //companyId:user.companyId(to be placed after id)

        let result = {
          user: {
            _id: updateUser._id,
            email: updateUser.email,
            fullName: updateUser.fullName || updateUser.employeeName,
            role: updateUser?.role,
            image: updateUser?.imageUrl,
            roleId: updateUser?.roleId,
            companyId: updateUser.companyId,
            superAdmin: updateUser.superAdmin,
            access_token,
          },
          access_token,
        };

        if (user?.superAdmin == true) {
          return res.status(200).json({ success: true, result });
        } else{
          return res.status(400).json({
            msg: 'Unauthorized user',
            success: false,
          });
        }
        //return res.status(200).json({ success: true, result });
      }
    } catch (error) {
      return res.status(500).json({
        msg: 'Login Failed',
        error: error.message,
        success: false,
      });
    }
  },

  resendOTP: async (req, res) => {
    try {
      let data = req.body;
      let email = data?.email.toLowerCase();

      if (!email) {
        return res.status(401).json({
          msg: 'Please enter email!',
          success: false,
        });
      }

      let user = await superAdminModel.findOne({ email });

      if (!user || user.superAdmin === false) {
        return res.status(404).json({
          msg: 'User with this email not found',
          success: false,
        });
      }

      let userDeletedStatus = user.deleted;
      if (userDeletedStatus == true) {
        return res.status(400).json({
          msg: 'This User have been disabled by Admin! Not Allowed to Login',
          success: false,
        });
      }

      if (user?.superAdmin == true) {
        await generateOTP(user);
        return res.status(200).json({ msg: 'A 6 digit OTP has been sent to your email', success: true });
      } else{
        return res.status(400).json({
          msg: 'Unauthorized user',
          success: false,
        });
      }
    } catch (error) {
      return res.status(500).json({
        msg: 'Error sending otp',
        error: error.message,
        success: false,
      });
    }
  },

  loginUser: async (req, res) => {
    try {
      let data = req.body;
      let token = req.query.token;
      let email = data?.email.toLowerCase();
      let password = data.password;

      if (!token) {
        if (!email || !password) {
          return res.status(401).json({
            msg: 'Please enter right Credentials!',
            success: false,
          });
        }

        let user = await User.findOne({ email });

        if (!user) {
          return res.status(404).json({
            msg: 'User with this email not found',
            success: false,
          });
        }

        let findCompany = await Company.findById(user?.companyId)

        if (findCompany?.disabled === true) {
          console.log("disabled here")
          return res.status(404).json({
            msg: 'Company Not Found',
            success: false,
          }); 
        }

        let isVerified = user.verified;
        if (isVerified == false) {
          return res.status(400).json({
            msg: 'User not verified! Go and check your mail for email verification',
            verified: user.verified,
            success: false,
          });
        }
        let userDeletedStatus = user.deleted;
        if (userDeletedStatus == true) {
          return res.status(400).json({
            msg: 'This User have been disabled by Admin! Not Allowed to Login',
            success: false,
          });
        }

        let match = await utils.comparePassword(password, user.password);

        if (!match) {
          return res.status(401).json({
            msg: 'Wrong Password Entered',
            success: false,
          });
        }
        let access_token = await utils.issueToken({
          _id: user._id,
          companyId: user.companyId,
          role: user.role
        }); //companyId:user.companyId(to be placed after id)

        let result = {
          user: {
            _id: user._id,
            email: email,
            fullName: user?.fullName,
            role: user?.role,
            roleId: user?.roleId,
            companyId: user?.companyId,
            image: user.imageUrl || '',
            firstTimeLogin: user?.firstTimeLogin,
            languagePreference: user?.languagePreference,
          },
          access_token,
        };
        return res.status(200).json({ success: true, result });
      } else {
        let user = await User.findOne({ verificationToken: token });

        if (!user) {
          return res.status(404).json({
            msg: 'The verification mail have expired!',
            success: false,
          });
        }

        let tokenEmail = user.email;
        let tokenPassword = user.password;

        if (!email || !password) {
          return res.status(401).json({
            msg: 'Please enter right Credentials!',
            success: false,
          });
        }

        if (tokenEmail != email) {
          return res.status(400).json({
            msg: 'Invalid Token or Invalid User trying with Token',
            success: false,
          });
        }
        let match = await utils.comparePassword(password, tokenPassword);

        if (!match) {
          return res.status(400).json({
            msg: 'Wrong Password Entered',
            success: false,
          });
        }

        let updateUser = await User.findOneAndUpdate(
          { email: email },
          { $set: { verificationToken: '', verified: true } }
        );

        let access_token = await utils.issueToken({
          _id: user._id,
          companyId: user.companyId,
          role: user.role
        }); //companyId:user.companyId(to be placed after id)

        let result = {
          user: {
            _id: updateUser._id,
            email: updateUser.email,
            fullName: updateUser.fullName || updateUser.employeeName,
            role: updateUser?.role,
            image: updateUser?.imageUrl,
            roleId: updateUser?.roleId,
            companyId: updateUser.companyId,
            firstTimeLogin: updateUser.firstTimeLogin,
          },
          access_token,
        };
        return res.status(200).json({ success: true, result });
      }
    } catch (error) {
      return res.status(500).json({
        msg: 'Login Failed',
        error: error.message,
        success: false,
      });
    }
  },
  viewTeamLeads: async (req, res) => {
    try {
      let companyId = req.token.companyId;

      let findUser = await User.find({ companyId: companyId, deleted: false });

      if (!findUser.length) {
        findUser = '';
      }

      let arr = [];

      for (let i = 0; i < findUser.length; i++) {
        let uId = findUser[i].roleId;
        arr.push(uId);
      }

      let findPermissions = await Permission.find({
        roleId: { $in: arr },
      });

      let allowedReportsToUser = [];
      findPermissions.map((allUserPermissions) => {
        allUserPermissions.permissions.map((obj) => {
          if (obj.value === 'employeeManagement') {
            obj.subPermissions.map((subObj) => {
              if (subObj.value === 'reportsTo') {
                if (subObj.checked === true) {
                  allowedReportsToUser.push(allUserPermissions.roleId);
                }
              }
            });
          }
        });
      });

      let reportToUser = await User.find({
        deleted: false,
        roleId: { $in: allowedReportsToUser },
      }).select('fullName imageUrl');

      if (!reportToUser.length) {
        reportToUser = [];
      }

      return res.status(200).json({
        User: reportToUser,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: 'Failed to get who can be reported to',
        error: error.message,
        success: false,
      });
    }
  },
  // viewTeamLeads: async (req, res) => {
  //   try {
  //     let companyId = req.token.companyId;

  //     let findUser = await User.find({ companyId: companyId, deleted: false });

  //     if (!findUser.length) {
  //       findUser = "";
  //     }

  //     let arr = [];

  //     for (let i = 0; i < findUser.length; i++) {
  //       let uId = findUser[i]._id;
  //       arr.push(uId);
  //     }

  //     let reportToUser = await User.find({
  //       deleted: false,
  //       _id: { $in: allowedReportsToUser },
  //     });

  //     if (!reportToUser.length) {
  //       reportToUser = [];
  //     }

  //     return res.status(200).json({
  //       User: reportToUser,
  //       success: true,
  //     });
  //   } catch (error) {
  //     return res.status(500).json({
  //       msg: "Failed to get who can be reported to",
  //       error: error.message,
  //       success: false,
  //     });
  //   }
  // },

  // updateUser: async (req, res) => {
  //   try {
  //     let userId = req.token._id;
  //     let findUser = await User.findOne({ _id: userId });
  //     let roleId = findUser?.roleId;
  //     let isAllowed;
  //     if (findUser.role === "admin") {
  //       isAllowed = true;
  //     } else {
  //       // Perform the permission check for non-admin users
  //       let checkPermission = await Permission.findOne({ roleId });
  //       console.log(checkPermission);
  //       isAllowed = services.checkPermissions(
  //         checkPermission,
  //         "employeeManagement",
  //         "updateUser"
  //       );
  //     }
  //     if (!isAllowed) {
  //       return res.status(401).json({
  //         msg: "Unauthorized User",
  //         success: true,
  //       });
  //     }
  //     let data = req.body;
  //     let id = data._id;
  //     if (!id) {
  //       return res.status(400).json({
  //         msg: "Please provide the id of user to update the user record",
  //         success: false,
  //       });
  //     }

  //     if (data.password && data.password !== "") {
  //       data.password = await bcrypt.hash(data.password, 10);
  //     } else {
  //       delete data.password;
  //     }

  //     let number = data.phoneNo;

  //     let parsedNumber = phoneUtil.parse(number);

  //     if (parsedNumber == false) {
  //       return res.status(400).json({
  //         msg: "Input Valid Number with Country Code",
  //         success: false,
  //       });
  //     }

  //     let validNumber = phoneUtil.isValidNumber(phoneUtil.parse(number));

  //     if (validNumber === false) {
  //       return res.status(400).json({
  //         msg: "Input Valid Number",
  //         success: false,
  //       });
  //     }
  //     data.remainingLeaves =
  //       +data.sickLeaves +
  //       +data.sickLeaves +
  //       // +data.workFromHomeLeaves +
  //       +data.bereavementLeaves +
  //       +data.unpaidLeaves +
  //       +data.paternityLeaves +
  //       +data.maternityLeaves +
  //       +data.marriageLeaves +
  //       +data.halfDayLeaves +
  //       +data.annualLeaves;

  //     data.email = data.email.toLowerCase();

  //     let userExist = await User.findOne({
  //       email: data.email,
  //       companyId: req.token.companyId,
  //     });

  //     if (userExist) {
  //       return res.status(409).json({
  //         msg: "User already exist with this email",
  //       });
  //     }

  //     let UpdateUser = await User.updateOne({ _id: id }, { ...data });

  //     res.status(200).json({
  //       data: UpdateUser,
  //       msg: "User updated",
  //       success: true,
  //     });
  //   } catch (error) {
  //     res.status(500).json({
  //       msg: "Failed to update user",
  //       error: error.message,
  //       success: false,
  //     });
  //   }
  // },
  updateUser: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = await User.findOne({ _id: userId });
      let roleId = findUser?.roleId;
      let isAllowed;

      const allowedFields = [
        '_id', 'emergencyContacts',
        'education', 'experience', 'imageUrl'
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
          isAllowed = services.checkPermissions(checkPermission, 'employeeManagement', 'updateUser');
        }
  
        if (!isAllowed) {
          return res.status(401).json({
            msg: 'Unauthorized User',
            success: true,
          });
        }
      }

      // if (findUser.role === 'admin') {
      //   isAllowed = true;
      // } else {
      //   let checkPermission = await Permission.findOne({ roleId });
      //   console.log(checkPermission);
      //   isAllowed = services.checkPermissions(checkPermission, 'employeeManagement', 'updateUser');
      // }

      // if (!isAllowed) {
      //   return res.status(401).json({
      //     msg: 'Unauthorized User',
      //     success: true,
      //   });
      // }

      let data = req.body;
      let id = data._id;
      let existingUser = await User.findOne({ _id: id });

      // Check if the email is being updated
      if (data.email && data.email.toLowerCase() !== existingUser.email) {
        let userExist = await User.findOne({
          email: data.email.toLowerCase(),
          companyId: req.token.companyId,
        });

        if (userExist && userExist._id.toString() !== id) {
          return res.status(409).json({
            msg: 'User already exists with this email',
          });
        }
      }

      // Check if the employee ID is being updated
      if (data.employeeId && data.employeeId !== existingUser.employeeId) {
        let userExistByEmployeeId = await User.findOne({
          employeeId: data.employeeId,
          companyId: req.token.companyId,
        });

        if (userExistByEmployeeId && userExistByEmployeeId._id.toString() !== id) {
          return res.status(409).json({
            msg: 'User already exists with this employee ID',
          });
        }
      }

      if (data.password && data.password !== '') {
        data.password = await bcrypt.hash(data.password, 10);
      } else {
        delete data.password;
      }

      if (data.phoneNo && data.phoneNo !== '') {
        let number = data.phoneNo;
        let parsedNumber = phoneUtil.parse(number);
  
        if (parsedNumber == false) {
          return res.status(400).json({
            msg: 'Input Valid Number with Country Code',
            success: false,
          });
        }
  
        let validNumber = phoneUtil.isValidNumber(parsedNumber);
  
        if (validNumber === false) {
          return res.status(400).json({
            msg: 'Input Valid Number',
            success: false,
          });
        }
      }

      if (
        data.sickLeaves ||
        data.casualLeaves ||
        data.bereavementLeaves ||
        data.unpaidLeaves ||
        data.paternityLeaves ||
        data.maternityLeaves ||
        data.marriageLeaves ||
        data.halfDayLeaves ||
        data.annualLeaves
      ) {
          data.allotedLeaves =
          +data.sickLeaves +
          +data.casualLeaves +
          +data.bereavementLeaves +
          +data.unpaidLeaves +
          +data.paternityLeaves +
          +data.maternityLeaves +
          +data.marriageLeaves +
          +data.halfDayLeaves +
          +data.annualLeaves;

          data.remainingSickLeaves = (data.sickLeaves - existingUser?.takenSickLeaves) < 0 ? 0 : (data.sickLeaves - existingUser?.takenSickLeaves)
          data.remainingCasualLeaves = (data.casualLeaves - existingUser?.takenCasualLeaves) < 0 ? 0 : (data.casualLeaves - existingUser?.takenCasualLeaves)
          data.remainingWorkFromHomeLeaves = (data.workFromHomeLeaves - existingUser?.takenWorkFromHomeLeaves) < 0 ? 0 : (data.workFromHomeLeaves - existingUser?.takenWorkFromHomeLeaves)
          data.remainingBereavementLeaves = (data.bereavementLeaves - existingUser?.takenBereavementLeaves) < 0 ? 0 : (data.bereavementLeaves - existingUser?.takenBereavementLeaves)
          data.remainingUnpaidLeaves = (data.unpaidLeaves - existingUser?.takenUnpaidLeaves) < 0 ? 0 : (data.unpaidLeaves - existingUser?.takenUnpaidLeaves)
          data.remainingPaternityLeaves = (data.paternityLeaves - existingUser?.takenPaternityLeaves) < 0 ? 0 : (data.paternityLeaves - existingUser?.takenPaternityLeaves)
          data.remainingMaternityLeaves = (data.maternityLeaves - existingUser?.takenMaternityLeaves) < 0 ? 0 : (data.maternityLeaves - existingUser?.takenMaternityLeaves)
          data.remainingMarriageLeaves = (data.marriageLeaves - existingUser?.takenMarriageLeaves) < 0 ? 0 : (data.marriageLeaves - existingUser?.takenMarriageLeaves)
          data.remainingHalfDayLeaves = (data.halfDayLeaves - existingUser?.takenHalfDayLeaves) < 0 ? 0 : (data.halfDayLeaves - existingUser?.takenHalfDayLeaves)
          data.remainingAnnualLeaves = (data.annualLeaves - existingUser?.takenAnnualLeaves) < 0 ? 0 : (data.annualLeaves - existingUser?.takenAnnualLeaves)

          data.remainingLeaves =
          +data.remainingSickLeaves +
          +data.remainingCasualLeaves +
          +data.remainingBereavementLeaves +
          +data.remainingUnpaidLeaves +
          +data.remainingPaternityLeaves +
          +data.remainingMaternityLeaves +
          +data.remainingMarriageLeaves +
          +data.remainingHalfDayLeaves +
          +data.remainingAnnualLeaves;
        }
      
      if (data.email && data.email !== '') {
        data.email = data.email.toLowerCase();

        let userExist = await User.findOne({
          email: data.email,
          companyId: req.token.companyId,
        });
  
        if (userExist && userExist._id.toString() !== id) {
          return res.status(409).json({
            msg: 'User already exists with this email',
          });
        }
      }
      
      let UpdateUser = await User.updateOne({ _id: id }, { ...data });

      res.status(200).json({
        data: UpdateUser,
        msg: 'User updated',
        success: true,
      });
    } catch (error) {
      console.log(error)
      res.status(500).json({
        msg: 'Failed to update user',
        error: error.message,
        success: false,
      });
    }
  },

  deleteUser: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = await User.findOne({ _id: userId });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === 'admin') {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, 'employeeManagement', 'updateStatusOfEmployee');
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: 'Unauthorized User',
          success: true,
        });
      }
      let _id = req.body._id;
      let employeeExitDateBody = req.body.employeeExitDate;
      if (!_id) {
        return res.status(400).json({
          msg: 'Provide the user id to disable the employee',
          success: false,
        });
      }
      if (_id == userId) {
        return res.status(400).json({
          msg: 'You cannot delete yourself',
          success: false,
        });
      }

      let user = await User.findOne({ _id });
      if (!user) {
        res.status(404).json({
          msg: 'id not found',
        });
      } else {
        if (user.deleted == true) {
          return res.status(200).json({
            msg: 'This user is already In-Active',
            success: true,
          });
        }
        const employeeExitDate = new Date(employeeExitDateBody).toISOString().split('T')[0];
        await User.findOneAndUpdate(
          { _id },
          { deleted: true, userStatus: 'In-Active', employeeExitDate },
          { new: true }
        );
        res.status(200).json({
          msg: 'User with this id deleted',
          success: true,
        });
      }
    } catch (error) {
      res.status(500).json({
        msg: 'Failed to disable employee',
        error: error.message,
        success: false,
      });
    }
  },

  addAdmin: async (req, res) => {
    try {
      let data = req.body;

      data.email = data.email.toLowerCase();

      let email = data.email;

      let companyId = data.companyId;

      let userExist = await User.findOne({ email, companyId });

      if (userExist) {
        return res.status(409).json({
          msg: 'User already exist with this email',
        });
      }

      const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,}$/;

      if (!passwordRegex.test(data.password)) {
        return res.status(400).json({
          msg: 'Password does not meet the required criteria.',
          success: false,
        });
      }

      data.password = await bcrypt.hash(data.password, 10);

      let randomString = randomstring.generate();
      data.verificationToken = randomString;

      let number = data.phoneNo;

      let parsedNumber = phoneUtil.parse(number);

      if (parsedNumber == false) {
        return res.status(400).json({
          msg: 'Input Valid Number with Country Code',
          success: false,
        });
      }

      let validNumber = phoneUtil.isValidNumber(phoneUtil.parse(number));

      if (validNumber === false) {
        return res.status(400).json({
          msg: 'Input Valid Number',
          success: false,
        });
      }

      let user = new User({ ...data, companyId: companyId });

      let addUser = await user.save();
      await services.sendVerificationMail(data.email, randomString);

      if (!addUser) {
        return res.status(400).json({
          msg: 'Bad Reqeust! Fill out the required fields to Add User',
          success: false,
        });
      }

      return res.status(200).json({
        User: {
          _id: user._id,
          name: user.employeeName,
          email: user.email,
        },
        msg: 'User added',
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: `Failed to create new User`,
        error: error.message,
        success: false,
      });
    }
  },

  enableUser: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = await User.findOne({ _id: userId });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === 'admin') {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, 'employeeManagement', 'updateStatusOfEmployee');
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: 'Unauthorized User',
          success: true,
        });
      }
      let _id = req.body._id;
      if (!_id) {
        return res.status(400).json({
          msg: 'Please provide the user id to enable the user',
          success: false,
        });
      }

      let user = await User.findOne({ _id });
      if (!user) {
        res.status(404).json({
          msg: 'user with this id not found',
        });
      } else {
        if (user.deleted == false) {
          return res.status(200).json({
            msg: 'This user is already active',
            success: true,
          });
        }
        let newDate = new Date(Date.now());
        newDate = JSON.stringify(newDate);
        newDate = newDate.split(`"`)[1].split('T')[0];
        await User.findOneAndUpdate(
          { _id },
          {
            deleted: false,
            userStatus: 'Active',
            joiningDate: newDate,
          }
        );
        return res.status(200).json({
          msg: 'User with this id Enabled',
          success: true,
        });
      }
    } catch (error) {
      return res.status(500).json({
        msg: 'Failed to enable employee',
        error: error.message,
        success: false,
      });
    }
  },

  updateLanguagePreference: async (req, res) => {
    try {
      let userId = req.token._id;
      let foundUser = await User.findOne({ _id: userId });
      let currentUserLanguage = foundUser.languagePreference;

      const allowedLanguages = ['arabic', 'english'];

      if (!req.body.languagePreference) {
        return res.status(400).json({
          success: false,
          msg: 'Missing parameter. Language is required.',
        });
      }

      if (!allowedLanguages.includes(req.body.languagePreference.toLowerCase())) {
        return res.status(400).json({
          success: false,
          msg: 'Invalid language selected.',
        });
      }

      if (req.body.languagePreference !== currentUserLanguage) {
        const updatedUser = await User.findOneAndUpdate(
          { _id: userId },
          { languagePreference: req.body.languagePreference },
          {
            new: true,
          }
        );
        return res.status(200).json({
          success: true,
          msg: '1.Language has been updated successfully.',
          user: {
            _id: userId,
            language: updatedUser.languagePreference,
          },
        });
      }

      return res.status(200).json({
        success: true,
        msg: 'Language has been updated successfully.',
        user: {
          _id: userId,
          language: foundUser.languagePreference,
        },
      });
    } catch (error) {
      console.log('LANGUAGE_UPDATE_FAILED', error.message);
      return res.status(500).json({
        msg: 'Failed to update the language.',
        error: error.message,
        success: false,
      });
    }
  },

  getUserInfo: async (req, res) => {
    try {
      let _id = req.query._id;
      if (!_id) {
        return res.status(400).json({
          msg: 'Please provide the id of user to get the user info',
          success: false,
        });
      }
      let findUser = (await User.findOne({ _id, deleted: false })) || (await Admin.findOne({ _id, deleted: false }));
      if (!findUser) {
        return res.status(404).json({
          msg: 'No record exist',
          success: false,
        });
      }
      res.status(200).json({
        User: findUser,
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: 'Failed to get user info',
        //eslint-disable-next-line
        error: error.message,
        success: false,
      });
    }
  },

  employeeOverviewDashboard: async (req, res) => {
    try {
      let { _id, companyId } = req.token;
      let currentDate = new Date(Date.now());
      todayDate = moment(currentDate).format("YYYY-MM-DD");
      
      // Calculate the start and end of the current year
      let yearStart = moment(currentDate).startOf("year").format("YYYY-MM-DD");
      let yearEnd = moment(currentDate).endOf("year").format("YYYY-MM-DD");

      console.log("current year",yearStart,yearEnd)
      let findWfhRequests = await Request.find({
        startDate: todayDate,
        companyId: companyId,
        requestType: "wfh",
        deleted: false,
      })
        .select("requestType startDate status")
        .populate({
          path: "userId",
          select: "fullName imageUrl", // Move the select option here
        });

      let attendenceStatus = await Attendance.find({
        userId: _id,
        attendanceDate: { $gte: yearStart, $lte: yearEnd },
      });

      let totalAbsence = 0;
      let totalWorkingDays = 0;
      for (const record of attendenceStatus) {
        const status = record.status;
        if (status == "Absent") {
          totalAbsence += 1;
        } else if (status == "Present" || status == "Late") {
          totalWorkingDays += 1;
        }
      }

      const upcomingHoliday = await Holidays.findOne({
        companyId: companyId,
        holidayDate: { $gte: currentDate },
      }).sort({ holidayDate: 1 });

      // Fetch leave data for the specified month (if applicable)

      let findMonthlyPendingLeaveRequests = await Request.find({
        userId: _id,
        startDate: { $gte: yearStart, $lte: yearEnd },
        status: "Pending",
        deleted: false,
      });

      let findLeaveRequests = await Request.find({
        startDate: todayDate,
        companyId: companyId,
        requestType: "leave",
        deleted: false,
      })
        .select("requestType startDate status")
        .populate({
          path: "userId",
          select: "fullName imageUrl", // Move the select option here
        });

        
      let leaveRequest = await Request.find(
        {
          userId: _id,
          startDate: { $gte: yearStart, $lte: yearEnd },
          requestType: "leave",
          deleted: false,
        }
      )
      let findUser = await User.findOne({ _id: _id });

      let allotedLeaves = findUser?.allotedLeaves;
      let takenLeaves = findUser?.takenLeaves;
      let remainingLeaves = findUser?.remainingLeaves;

      let pendingApprovel = findMonthlyPendingLeaveRequests.length;
      console.log("count",pendingApprovel)
      if (pendingApprovel <0){
        pendingApprovel = "0";
      }
      
      res.status(200).json({
        employeeOnWfh: findWfhRequests,
        employeeOnLeave: findLeaveRequests,
        leave: {
          pendingApprovel: pendingApprovel,
          totalLeaves: allotedLeaves,
          takenLeaves: takenLeaves,
          remainingLeaves: remainingLeaves,
        },
        attendence: {
          workingDays: totalWorkingDays,
          totalAbsence: totalAbsence,
        },
        upcomingHoliday: upcomingHoliday,
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to get user info",
        //eslint-disable-next-line
        error: error.message,
        success: false,
      });
    }
  },

  getSevenDays: async (req, res) => {
    try {
      let { _id, companyId } = req.token;

      const dayLabels = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa']; // Days of the week, starting from Sunday

      let lastSevenDaysAttendance = await Attendance.find({ userId: _id, companyId: companyId })
        .sort({ attendanceDate: -1 }) // Sort by attendance date in descending order
        .limit(7);
      
      let hoursWorkedPerDay = [];
      
      for (const record of lastSevenDaysAttendance) {
        const attendanceDate = new Date(record.attendanceDate); // Parse the attendanceDate
        const dayOfWeek = attendanceDate.getDay(); // Get the day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
        const dayLabel = dayLabels[dayOfWeek]; // Get the corresponding label
      
        const hoursWorked = parseFloat(record.hoursWorked);
      
        if (!isNaN(hoursWorked)) {
          // Add the day label and the hours worked into an object
          hoursWorkedPerDay.unshift({ [dayLabel]: hoursWorked });
        } else {
          console.error(`Invalid hoursWorked value for record with ID ${record._id}`);
          hoursWorkedPerDay.unshift({ [dayLabel]: 0 });
        }
      }
      
      // Output the array of objects with day labels and hours worked
      console.log(hoursWorkedPerDay);
      
      res.status(200).json({
        hoursWorked: hoursWorkedPerDay,
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to get hours worked",
        //eslint-disable-next-line
        error: error.message,
        success: false,
      });
    }
  },

  employeeOverview: async (req, res) => {
    try {
      let { _id, companyId } = req.token;
      let currentDate = new Date(Date.now());
      todayDate = moment(currentDate).format('YYYY-MM-DD');
      const todayFormatted = moment(currentDate).format('-MM-DD');

      let todayBirthdays = await User.find({
        companyId: companyId,
        deleted: false,
        dateOfBirth: { $regex: todayFormatted },
      }).select('fullName dateOfBirth imageUrl');

      let findWfhRequests = await Request.find({
        startDate: todayDate,
        companyId: companyId,
        requestType: 'wfh',
        deleted: false,
      })
        .select('requestType startDate status')
        .populate({
          path: 'userId',
          select: 'fullName imageUrl', // Move the select option here
        });

      let todayAttendance = await Attendance.findOne({
        userId: _id,
        attendanceDate: todayDate,
      });

      let lastFiveDaysAttendance = await Attendance.find({ userId: _id }).sort({ createdAt: -1 }).limit(5);

      // Step 2: Calculate the total hoursWorked from these records
      let totalHoursWorked = 0;

      for (const record of lastFiveDaysAttendance) {
        const hoursWorked = parseFloat(record.hoursWorked);

        if (!isNaN(hoursWorked)) {
          totalHoursWorked += hoursWorked;
        } else {
          console.error(`Invalid hoursWorked value for record with ID ${record._id}`);
        }
      }

      let userProjects = await Project.countDocuments({
        companyId: companyId,
        $or: [
          {
            projectLead: new mongoose.Types.ObjectId(_id),
          },
          {
            assignedDevelopers: new mongoose.Types.ObjectId(_id),
          },
        ],
      });

      const upcomingHoliday = await Holidays.findOne({
        companyId: companyId,
        holidayDate: { $gte: currentDate },
      }).sort({ holidayDate: 1 });

      let findLeaveRequests = await Request.find({
        startDate: todayDate,
        companyId: companyId,
        requestType: 'leave',
        deleted: false,
      })
        .select('requestType startDate status')
        .populate({
          path: 'userId',
          select: 'fullName imageUrl', // Move the select option here
        });

      let findUser = await User.findOne({ _id, deleted: false }).populate('designationId teamId reportsTo');

      let workAnniversary = await User.find({
        companyId: companyId,
        deleted: false,
        joiningDate: { $regex: todayFormatted },
      }).select('fullName joiningDate imageUrl');

      let remainingLeaves = findUser?.remainingLeaves;
      let leavesTaken = +findUser?.allotedLeaves - +remainingLeaves;
      if (leavesTaken < 0) {
        leavesTaken = '0';
      }

      if (!findUser) {
        return res.status(404).json({
          msg: 'No record exist',
          success: false,
        });
      }
      res.status(200).json({
        user: {
          ...findUser?.toObject(),
          designationName: findUser?.designationId?.designationName,
          teamLead: findUser?.reportsTo?.fullName,
          team: findUser?.teamId?.teamName,
          designationId: findUser?.designationId?._id,
          teamId: findUser?.teamId?._id,
          reportsTo: findUser?.reportsTo?._id,
        },
        hoursWorked: {
          today: todayAttendance?.hoursWorked,
          lastFiveDays: totalHoursWorked,
        },
        employeeOnWfh: findWfhRequests,
        employeeOnLeave: findLeaveRequests,
        leave: {
          remainingLeaves: remainingLeaves,
          leavesTaken: leavesTaken,
        },
        upcomingHoliday: upcomingHoliday,
        workAnniversary: workAnniversary,
        todayBirthdays: todayBirthdays,
        userProjects: userProjects,
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: 'Failed to get user info',
        //eslint-disable-next-line
        error: error.message,
        success: false,
      });
    }
  },

  adminOverview: async (req, res) => {
    try {
      let { _id, companyId } = req.token;
      let currentDate = new Date(Date.now());
      todayDate = moment(currentDate).format('YYYY-MM-DD');
      let findUser = await User.findOne({ _id });
      let isAllowed;
      if (findUser.role === 'admin') {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({
          roleId: findUser.roleId,
        });
        isAllowed = services.checkPermissions(checkPermission, 'companyManagement', 'companyManagement');
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: 'Unauthorized User',
          success: true,
        });
      }

      const formatDate = (date) => date.toISOString().split('T')[0];

      let findCompany = await Company.findOne({
        _id: companyId,
        deleted: false,
      });

      let preferredCurrency = findCompany?.preferredCurrency;

      let projectsCount = await Project.countDocuments({
        companyId: companyId,
        deleted: false,
      });
      let clientsCount = await Client.countDocuments({
        companyId: companyId,
        deleted: false,
      });
      let tasksCount = await Tasks.countDocuments({
        companyId: companyId,
      });

      let employeeCount = await User.countDocuments({
        companyId: companyId,
        deleted: false,
      });

      const currentYear = new Date().getFullYear();
      const Month = new Date().getMonth();

      const startOfMonth = new Date(Date.UTC(currentYear, Month, 1));

      const endOfMonth = new Date(Date.UTC(currentYear, Month + 1, 0, 23, 59, 59, 999));

      let empStart = formatDate(startOfMonth);
      let empEnd = formatDate(endOfMonth);

      const employeesAddedThisMonth = await User.countDocuments({
        companyId: companyId,
        deleted: false,
        joiningDate: {
          $gte: empStart,
          $lte: empEnd,
        },
      });

      let percentageIncreaseThisMonth = (employeesAddedThisMonth / employeeCount) * 100;

      percentageIncreaseThisMonth = percentageIncreaseThisMonth > 0 ? percentageIncreaseThisMonth.toFixed(2) : percentageIncreaseThisMonth; 

      let todayLeaves = await Request.countDocuments({
        companyId: companyId,
        startDate: todayDate,
        requestType: 'leave',
        status: { $ne: 'Cancelled' },
      });

      const revenue = await Invoices.find({ companyId: companyId });

      function parseConvertedAmount(value) {
        const parsedValue = parseFloat(value);
        return !isNaN(parsedValue) ? parsedValue : 0;
      }

      function calculateTotalRevenue(invoiceList) {
        return invoiceList.reduce(
          (total, invoice) => total + parseConvertedAmount(invoice.paidAmountInPreferredCurrency),
          0
        );
      }

      const result = [];

      revenue.forEach((invoice) => {
        const invoiceEndDate = new Date(invoice?.invoiceEndDate);
        const year = invoiceEndDate.getFullYear();
        const month = invoiceEndDate.toLocaleString('en-US', { month: 'short' });

        // Check if the result already contains the year
        const existingYear = result.find((entry) => entry.year === year);

        if (existingYear) {
          // Check if the month exists within the year
          const existingMonth = existingYear.months.find((m) => m.month === month);

          if (existingMonth) {
            existingMonth['totalRevenue'] += parseConvertedAmount(invoice.paidAmountInPreferredCurrency);
          } else {
            existingYear.months.push({
              month,
              totalRevenue: parseConvertedAmount(invoice.paidAmountInPreferredCurrency),
            });
          }

          existingYear.totalRevenue += parseConvertedAmount(invoice.paidAmountInPreferredCurrency);
        } else {
          result.push({
            year,
            totalRevenue: parseConvertedAmount(invoice.paidAmountInPreferredCurrency),
            months: [
              {
                month,
                totalRevenue: parseConvertedAmount(invoice.paidAmountInPreferredCurrency),
              },
            ],
          });
        }
      });

      // const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      // const currentYear = currentDate.getFullYear();
      const currentMonthStartDate = new Date(Date.UTC(currentYear, currentMonth, 1));
      const currentMonthEndDate = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));
      const previousMonthStartDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
      const previousMonthEndDate = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59, 999));
      // const currentMonthInvoices = await Invoices.find({
      //   companyId: companyId,
      //   invoiceDate: { $gte: currentMonthStartDate, $lte: currentMonthEndDate },
      // });

      // const previousMonthInvoices = await Invoices.find({
      //   companyId: companyId,
      //   invoiceDate: {
      //     $gte: previousMonthStartDate,
      //     $lte: previousMonthEndDate,
      //   },
      // });

      // const totalPaidAmountCurrentMonth = currentMonthInvoices.reduce(
      //   (total, invoice) => total + +invoice.paidAmountInPreferredCurrency,
      //   0
      // );

      // const totalPaidAmountPreviousMonth = previousMonthInvoices.reduce(
      //   (total, invoice) => total + +invoice.paidAmountInPreferredCurrency,
      //   0
      // );

      // const percentageChange =
      //   ((totalPaidAmountCurrentMonth - totalPaidAmountPreviousMonth) /
      //     totalPaidAmountPreviousMonth) *
      //   100;

      // const currentMonthExpenses = await Expenses.find({
      //   companyId: companyId,
      //   purchaseDate: {
      //     $gte: currentMonthStartDate,
      //     $lte: currentMonthEndDate,
      //   },
      // });

      // const previousMonthExpenses = await Expenses.find({
      //   companyId: companyId,
      //   purchaseDate: {
      //     $gte: previousMonthStartDate,
      //     $lte: previousMonthEndDate,
      //   },
      // });

      // const totalExpenseCurrentMonth = currentMonthExpenses.reduce(
      //   (total, expense) => total + +expense.convertedAmount,
      //   0
      // );

      // const totalExpensePreviousMonth = previousMonthExpenses.reduce(
      //   (total, expense) => total + +expense.convertedAmount,
      //   0
      // );

      // const expensePercentageChange =
      //   ((totalExpenseCurrentMonth - totalExpensePreviousMonth) /
      //     totalExpensePreviousMonth) *
      //   100;

      // const thisMonth = currentDate.getMonth() + 1; // Adding 1 to match the format you described.
      // const thisYear = currentDate.getFullYear();

      // const previousMonth = thisMonth === 1 ? 12 : thisMonth - 1;
      // const previousYear = thisMonth === 1 ? thisYear - 1 : thisYear;

      // const currentMonthProfitLoss = await ProfitLoss.findOne({
      //   companyId: companyId,
      //   month: currentMonth,
      //   year: currentYear,
      // });

      // const previousMonthProfitLoss = await ProfitLoss.findOne({
      //   companyId: companyId,
      //   month: previousMonth,
      //   year: previousYear,
      // });

      // // Calculate the percentage increase or decrease
      // const profitLossPercentComparison =
      //   ((+currentMonthProfitLoss?.profitLoss -
      //     +previousMonthProfitLoss?.profitLoss) /
      //     Math.abs(+previousMonthProfitLoss?.profitLoss)) *
      //   100;

      const previousMonthInvoices = await Invoices.find({
        companyId: companyId,
        invoiceEndDate: {
          $gte: previousMonthStartDate,
          $lte: previousMonthEndDate,
        },
        // invoiceEndDate: {
        //   //$gte: previousMonthStartDate,
        //   $lte: previousMonthEndDate,
        // },
      });

      const currentMonthInvoices = await Invoices.find({
        companyId: companyId,
        invoiceEndDate: {
          $gte: currentMonthStartDate,
          $lte: currentMonthEndDate,
        },
        // invoiceEndDate: {
        //   //$gte: currentMonthStartDate,
        //   $lte: currentMonthEndDate,
        // },
      });

      const totalPaidAmountCurrentMonth = currentMonthInvoices.reduce((total, invoice) => {
        const paidAmount = +invoice.paidAmountInPreferredCurrency;
        return isNaN(paidAmount) ? total : total + paidAmount;
      }, 0);

      const totalPaidAmountPreviousMonth = previousMonthInvoices.reduce((total, invoice) => {
        const paidAmount = +invoice.paidAmountInPreferredCurrency;
        return isNaN(paidAmount) ? total : total + paidAmount;
      }, 0);

      const percentageChange =
        totalPaidAmountPreviousMonth !== 0
          ? (((totalPaidAmountCurrentMonth - totalPaidAmountPreviousMonth) / totalPaidAmountPreviousMonth) * 100).toFixed(2)
          : 0;

      const currentMonthExpenses = await Expenses.find({
        companyId: companyId,
        purchaseDate: {
          $gte: currentMonthStartDate,
          $lte: currentMonthEndDate,
        },
      });

      const previousMonthExpenses = await Expenses.find({
        companyId: companyId,
        purchaseDate: {
          $gte: previousMonthStartDate,
          $lte: previousMonthEndDate,
        },
      });

      const totalExpenseCurrentMonth = currentMonthExpenses.reduce((total, expense) => {
        const convertedAmount = +expense.convertedAmount;
        return isNaN(convertedAmount) ? total : total + convertedAmount;
      }, 0);

      const totalExpensePreviousMonth = previousMonthExpenses.reduce((total, expense) => {
        const convertedAmount = +expense.convertedAmount;
        return isNaN(convertedAmount) ? total : total + convertedAmount;
      }, 0);

      const expensePercentageChange =
        totalExpensePreviousMonth !== 0
          ? (((totalExpenseCurrentMonth - totalExpensePreviousMonth) / totalExpensePreviousMonth) * 100).toFixed(2)
          : 0;

      const thisMonth = currentDate.getMonth() + 1; // Adding 1 to match the format you described.
      const thisYear = currentDate.getFullYear();

      const previousMonth = thisMonth === 1 ? 12 : thisMonth - 1;
      const previousYear = thisMonth === 1 ? thisYear - 1 : thisYear;

      const currentMonthProfitLoss = await ProfitLoss.findOne({
        companyId: companyId,
        month: thisMonth,
        year: currentYear,
      });

      const previousMonthProfitLoss = await ProfitLoss.findOne({
        companyId: companyId,
        month: previousMonth,
        year: previousYear,
      });

      // Calculate the percentage increase or decrease
      const currentProfitLoss = +currentMonthProfitLoss?.profitLoss;
      const previousProfitLoss = +previousMonthProfitLoss?.profitLoss;

      const profitLossPercentComparison =
        !isNaN(currentProfitLoss) && !isNaN(previousProfitLoss) && previousProfitLoss !== 0
          ? (((currentProfitLoss - previousProfitLoss) / Math.abs(previousProfitLoss)) * 100).toFixed(2)
          : 0;

      let pendingInvoices = await Invoices.countDocuments({
        companyId: companyId,
        status: 'Pending',
      });

      let totalInvoices = await Invoices.countDocuments({
        companyId: companyId,
      });

      let completedProject = await Project.countDocuments({
        companyId: companyId,
        status: 'Completed',
        deleted: false
      });

      let onGoingProject = await Project.countDocuments({
        companyId: companyId,
        status: 'On-Going',
        deleted: false
      });

      let pausedProject = await Project.countDocuments({
        companyId: companyId,
        status: 'Paused',
        deleted: false
      });

      let scheduledProject = await Project.countDocuments({
        companyId: companyId,
        status: 'Scheduled',
        deleted: false
      });

      let archivedProject = await Project.countDocuments({
        companyId: companyId,
        status: 'Archived',
        deleted: false
      });

      let completedTasks = await Tasks.countDocuments({
        companyId: companyId,
        lane: 'Completed',
      });

      const percentCompletedTasks = ((completedTasks / tasksCount) * 100).toFixed(0);

      let inProgressTasks = await Tasks.countDocuments({
        companyId: companyId,
        lane: 'In Progress',
      });

      const percentInProgressTasks = ((inProgressTasks / tasksCount) * 100).toFixed(0);

      let toDoTasks = await Tasks.countDocuments({
        companyId: companyId,
        lane: 'Todo',
      });

      const percentToDoTasks = ((toDoTasks / tasksCount) * 100).toFixed(0);

      let backlogTasks = await Tasks.countDocuments({
        companyId: companyId,
        lane: "Backlog",
      });

      // let noStatusTasks = await Tasks.countDocuments({
      //   companyId: companyId,
      //   lane: "",
      // });

      let pendingTasks = await Tasks.countDocuments({
        companyId: companyId,
        $or: [
          { lane: { $eq: "" } }, // lane is empty
          { lane: { $nin: ["Completed"] } } // lane not in specified statuses
        ]
      });

      const percentBacklogTasks = ((backlogTasks / tasksCount) * 100).toFixed(0);

      return res.status(200).json({
        projectsCount: projectsCount,
        clientsCount: clientsCount,
        tasksCount: tasksCount,
        employeeCount: employeeCount,
        employeesAdded: employeesAddedThisMonth,
        employeeIncreaseRate: percentageIncreaseThisMonth,
        currentMonthEarning: totalPaidAmountCurrentMonth,
        previousMonthEarning: totalPaidAmountPreviousMonth,
        earningPercentComparison: percentageChange,
        currentMonthExpense: totalExpenseCurrentMonth,
        previousMonthExpense: totalExpensePreviousMonth,
        expensePercentComparison: expensePercentageChange,
        currentMonthProfitLoss: currentMonthProfitLoss?.profitLoss || 0,
        previousMonthProfitLoss: previousMonthProfitLoss?.profitLoss || 0,
        profitLossPercentComparison: profitLossPercentComparison,
        revenue: result,
        statistics: {
          todayLeaves: todayLeaves,
          pendingInvoices: pendingInvoices,
          totalInvoices: totalInvoices,
          completedProject: completedProject,
          onGoingProject: onGoingProject,
          pausedProject: pausedProject,
          scheduledProject: scheduledProject,
          archivedProject: archivedProject,
          completedTasks : completedTasks,
          inProgressTasks: inProgressTasks,
          toDoTasks: toDoTasks,
          backlogTasks: backlogTasks,
          pendingTasks: pendingTasks,
          percentCompletedTasks: percentCompletedTasks,
          percentInProgressTasks: percentInProgressTasks,
          percentToDoTasks: percentToDoTasks,
          percentBacklogTasks: percentBacklogTasks,
        },
        preferredCurrency: preferredCurrency,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        msg: 'Failed to get user info',
        //eslint-disable-next-line
        error: error.message,
        success: false,
      });
    }
  },

  addFileTos3: async (req, res) => {
    console.log('Upload file to local server api Called');

    try {
      let file = req.files;

      console.log(`req ====> is ${req.body}`);

      // console.log('file is ' , file)

      console.log(`file length is ${file.length}`);

      if (!file) throw ' File Not found !';

      console.log('file is --->', file);

      let upfile = await utils.uploadFileto3(file[0]);

      let link = upfile.Location;

      return res

        .status(200)

        .json({
          success: true,
          msg: 'File Uploaded successfully',

          link,
        });
    } catch (error) {
      console.log(error);

      return res

        .status(501)

        .json({
          success: false,
          msg: 'Failed to add file',
          error: error.message,
        });
    }
  },

  UploadFile: async (req, res) => {
    try {
      console.log('uplaode file controller called');
      let file = req.files;
      if (!file) throw ' File Not found !';
      let cloudStorageType = process.env.CLOUD_STORAGE_TYPE;
      if (!cloudStorageType) throw 'No cloud storage type found !';

      //   console.log("file is --->", file);
      var uploadFile;
      if (cloudStorageType.toLowerCase() == 'cloudinary') {
        uploadFile = await utils.uploadFileToCloudinary(file[0]);
      }

      if (cloudStorageType.toLowerCase() == 'amazonbucket') {
        uploadFile = utils.uploadFileToS3(file);
      }
      if (cloudStorageType.toLowerCase() == 'ftps') {
        uploadFile = utils.uploadFileToFtp();
      }

      res.status(200).json({
        msg: 'file uploaded succsessfully !',
        result: uploadFile,
      });
    } catch (error) {
      console.log('  --> ', error);
      res.status(500).json({
        msg: '~~ can not uplaod File !~',
        error: error.message,
      });
    }
  },

  addUserFromExcel: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = await User.findOne({ _id: userId });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === 'admin') {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, 'employeeManagement', 'addUser');
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: 'Unauthorized User',
          success: true,
        });
      }
      let data = req.body;

      data.email = data.email.toLowerCase();

      let companyId = data.companyId;

      let userExist = await User.findOne({ email: data.email, companyId });

      if (userExist) {
        return res.status(409).json({
          msg: 'User already exist with this email',
        });
      }

      let userExistWithSameId = await User.findOne({
        employeeId: data.employeeId,
        companyId,
      });

      if (userExistWithSameId) {
        return res.status(409).json({
          msg: 'User already exist with same user id',
        });
      }

      data.password = await bcrypt.hash(data.password, 10);

      let randomString = randomstring.generate();
      data.verificationToken = randomString;

      let number = data.phoneNo;

      let parsedNumber = phoneUtil.parse(number);

      if (parsedNumber == false) {
        return res.status(400).json({
          msg: 'Input Valid Number with Country Code',
          success: false,
        });
      }

      let validNumber = phoneUtil.isValidNumber(phoneUtil.parse(number));

      if (validNumber === false) {
        return res.status(400).json({
          msg: 'Input Valid Number',
          success: false,
        });
      }

      if (data.teamLead == '') {
        data.teamLead = null;
      }

      data.remainingLeaves =
        +data.sickLeaves +
        +data.casualLeaves +
        // +data.workFromHomeLeaves +
        +data.bereavementLeaves +
        +data.unpaidLeaves +
        +data.paternityLeaves +
        +data.maternityLeaves +
        +data.marriageLeaves +
        +data.halfDayLeaves +
        +data.annualLeaves;

      data.allotedLeaves = data.remainingLeaves;

      let user = new User({ ...data, companyId: companyId });

      let addUser = await user.save();
      await services.sendVerificationMail(data.email, randomString);

      if (!addUser) {
        return res.status(400).json({
          msg: 'Bad Reqeust! Fill out the required fields to Add User',
          success: false,
        });
      }

      return res.status(200).json({
        User: {
          _id: user._id,
          name: user.employeeName,
          email: user.email,
        },
        msg: 'User added',
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: `Failed to create new User`,
        error: error.message,
        success: false,
      });
    }
  },

  ImportExcel: async (req, res) => {
    try {
      console.log('uplaode file controller called',req.files);
      let file = req.files;
      let companyId = req?.body?.companyId;
      let user_email = req?.body?.user_email;
      console.log('body',req?.body);
      if (!file) throw ' File Not found !';

      //console.log("file is --->", file);
      const data = excelToJson(file);
      
      //console.log("Extracted Data: ", data);

      const requiredFields = [
        'fullName', 'employeeId', 'email', 'password', 'phoneNo',
        'dateOfBirth', 'nationalIdentityNumber', 'gender', 'address',
        'joiningDate', 'employeeType', 'salaryType', 'shiftStartTime',
        'shiftEndTime', 'department', 'departmentType', 'designation'
      ];

      for (const row of data) {
        for (const field of requiredFields) {
          if (!row[field]) {
            return res.status(400).json({
              msg: 'Uploaded file contains missing entries, please fill them!',
              success: false
            });
          }
        }
      }

      // for (const row of data) {
      //   row.companyId = companyId;
      //   row.recipientEmail = user_email;
      //   userQueue.add(row);
      // }
      
      res.status(200).json({
        msg: 'file uploaded succsessfully !',
        success: true,
      });
    } catch (error) {
      console.log('  --> ', error);
      res.status(500).json({
        msg: '~~ can not uplaod File !~',
        error: error.message,
      });
    }
  },

  DeleteFile: async (req, res) => {
    try {
      console.log('delete file controller called');
      let public_id = req?.body?._id?.public_id;
      let file = req?.body?._id?.secure_url;
      let resource_type = req?.body?._id?.resource_type;
      console.log(public_id);
      console.log(file);
      
      if (!file && !public_id) throw ' File Not found !';
      let cloudStorageType = process.env.CLOUD_STORAGE_TYPE;
      if (!cloudStorageType) throw 'No cloud storage type found !';

      //   console.log("file is --->", file);
      var uploadFile;
      if (cloudStorageType.toLowerCase() == 'cloudinary') {
        if (!public_id){
          uploadFile = await utils.deleteFileFromCloudinary(file, 'secure_url', resource_type);
        }
        else {
          console.log("else called")
          console.log(public_id);
          uploadFile = await utils.deleteFileFromCloudinary(public_id, 'public_id', resource_type);
        }
      }
      res.status(200).json({
        success: true,
        msg: 'file deleted succsessfully !',
        result: uploadFile,
      });
    } catch (error) {
      console.log('  --> ', error);
      res.status(500).json({
        msg: '~~ can not delete File !~',
        error: error.message,
      });
    }
  },

  forgotPassword: async (req, res) => {
    try {
      let email = req?.body?.email.toLowerCase();

      let findUser = await User.findOne({ email: email });

      if (!findUser) {
        return res.status(404).json({
          msg: 'User with this Email does not exist',
          success: true,
        });
      }

      let randomString = randomstring.generate();

      let updateUser = await User.findOneAndUpdate({ email: email }, { $set: { resetToken: randomString } });
      services.sendResetPasswordMail(findUser.email, randomString);

      res.status(200).json({
        return: {
          msg: 'Reset Email Have been sent',
          success: true,
        },
      });
    } catch (error) {
      res.status(500).json({
        msg: error.message,
        success: false,
      });
    }
  },

  resetPassword: async (req, res) => {
    try {
      let token = req.query.token;
      let findUser = await User.findOne({ resetToken: token });

      if (!findUser) {
        return res.status(200).json({
          msg: 'Link have been expired',
          success: true,
        });
      }
      let userRole = findUser.role;
      let password = req.body.password;
      let match = await utils.comparePassword(password, findUser.password);
      if (match) {
        return res.status(400).json({
          msg: 'Old password cannot be set as new password',
          success: false,
        });
      }

      const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,}$/;

      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          msg: 'Password does not meet the required criteria.',
          success: false,
        });
      }
      let newPassword = await bcrypt.hash(password, 10);

      let user = await User.findByIdAndUpdate(
        { _id: findUser._id },
        { $set: { password: newPassword, resetToken: '' } },
        { new: true }
      );
      return res.status(200).json({
        msg: 'User Password Have been Reset',
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: error.message,
        success: false,
      });
    }
  },

  resendVerificationMail: async (req, res) => {
    try {
      let data = req.body;
      let email = data?.email.toLowerCase();

      let findUser = await User.findOne({ email: email });

      if (!findUser) {
        return res.status(200).json({
          msg: 'User not found with this email',
          success: true,
        });
      }

      let randomString = randomstring.generate();

      let updateUser = await User.updateOne({ email: email }, { $set: { verificationToken: randomString } });

      await services.sendVerificationMail(data.email, randomString);

      res.status(200).json({
        user: updateUser,
        msg: 'Verification Mail resent',
        success: true,
      });
      3;
    } catch (error) {
      res.status(500).json({
        msg: 'Error server error',
        error: error.message,
        success: false,
      });
    }
  },
  changePassword: async (req, res) => {
    try {
      let _id = req.token._id;
      let data = req.body;
      let password = data.password;

      let user =
        (await User.findOne({ _id })) || (await Client.findOne({ _id })) || (await FocalPerson.findOne({ _id }));
      if (!user) {
        return res.status(404).json({
          msg: 'User not found with this id',
          success: false,
        });
      }
      let userId = user._id;

      let match = await utils.comparePassword(password, user.password);

      if (!match) {
        return res.status(400).json({
          msg: 'The password you entered does not match your real password! Input Correct Password',
          success: false,
        });
      }

      const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,}$/;

      if (!passwordRegex.test(data.newPassword)) {
        return res.status(400).json({
          msg: 'Password does not meet the required criteria.',
          success: false,
        });
      }

      // Hash the password
      data.password = await bcrypt.hash(data.newPassword, 10);

      let samePassword = await utils.comparePassword(data.newPassword, user.password);
      if (samePassword) {
        return res.status(400).json({
          msg: 'Old and new password cannot be same',
          success: false,
        });
      }

      let updatePassword =
        (await User.findOneAndUpdate(
          { _id: userId },
          {
            password: data.password,
            newPassword: '',
            firstTimeLogin: false,
          }
        )) ||
        (await Client.findOneAndUpdate(
          { _id: userId },
          {
            password: data.password,
            newPassword: '',
            firstTimeLogin: false,
          }
        )) ||
        (await FocalPerson.findOneAndUpdate(
          { _id: userId },
          {
            password: data.password,
            newPassword: '',
            firstTimeLogin: false,
          }
        ));

      return res.status(200).json({
        data: updatePassword,
        msg: 'Password Updated',
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: 'Failed to Change Password',
        error: error.message,
        success: false,
      });
    }
  },
};

module.exports = methods;
