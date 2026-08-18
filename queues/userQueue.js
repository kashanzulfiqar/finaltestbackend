require('dotenv').config();
const mongoose = require('mongoose');
let User = require('../models/user.model');
let services = require('../utils/services');
let moment = require('moment');
let bcrypt = require('bcrypt');
const randomstring = require('randomstring');
const path = require("path");

const Queue = require('bull');
const { jsonToExcel, deleteExcelFile } = require('../utils/excelFunctions');
const shiftModel = require('../models/shift.model');
const teamModel = require('../models/team.model');
const designationModel = require('../models/designation.model');
const { addShiftExcel } = require('../controllers/shift.controller');
const { addTeamExcel } = require('../controllers/team.controller');
const { addDesignationExcel } = require('../controllers/designation.controller');
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

let failedRows = [];
let userPassword = '';
let recipientEmail = ''
let shiftCounter = 1;

const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

const userQueue = new Queue('userRegistration', {
  redis: redisUrl
});

userQueue.process(async (job, done) => {
  
  try {
    let data = job.data;
    console.log("queue called",data)
    data.email = data.email.toLowerCase();

    recipientEmail = data.recipientEmail;
    userPassword = data.password
    let companyId = data.companyId;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        console.log('Invalid email format');
        failedRows.push({ ...data, reason: 'Invalid email format' });
        return done();
    }

    let userExist = await User.findOne({ email: data.email, companyId });

    if (userExist) {  
    console.log('User already exist with this email')
    failedRows.push({ ...data, reason: 'User already exist with this email' });
    return done();
    }

    let userExistWithSameId = await User.findOne({
      employeeId: data.employeeId,
      companyId,
    });

    if (userExistWithSameId) {
      console.log('User already exist with same user id')
      failedRows.push({ ...data, reason: 'User already exist with same user id' });
      return done();
    }

    data.password = await bcrypt.hash(data.password, 10);
    let randomString = randomstring.generate();
    data.verificationToken = randomString;

    let number = data.phoneNo;
    let parsedNumber = phoneUtil.parse(number);

    if (parsedNumber == false) {
      console.log('Input Valid Number with Country Code')
      failedRows.push({ ...data, reason: 'Input Valid Number with Country Code' });
      return done();
    }

    let validNumber = phoneUtil.isValidNumber(phoneUtil.parse(number));

    if (validNumber === false) {
      console.log('Input Valid Number')
      failedRows.push({ ...data, reason: 'Invalid Phone Number' });
      return done();
    }

    if (data.teamLead == '') {
      data.teamLead = null;
    }
    
    try {
      data.shiftStartTime = formatTime(data.shiftStartTime);
      data.shiftEndTime = formatTime(data.shiftEndTime);
    } catch (error) {
      failedRows.push({ ...data, reason: `invalid entry for shift time` });
      return done();
    }

    // Check if a shift exists with the same startTime and endTime
    let existingShift = await shiftModel.findOne({
      startTime: data.shiftStartTime,
      endTime: data.shiftEndTime,
      companyId,
    });

    if (existingShift) {
      data.shiftId = existingShift._id;
    } else {
      try {
      let shiftName = `Shift ${shiftCounter++}`;
      console.log('No matching shift found');
      let newShift = await addShiftExcel(data.shiftStartTime, data.shiftEndTime, companyId, shiftName);
      console.log(newShift._id)
      data.shiftId = newShift?._id;
      //failedRows.push({ ...data, reason: 'No matching shift found' });
      //return done();
      } catch (error) {
        failedRows.push({ ...data, reason: `${error.message}` });
        return done();
      }
    }

    let department = data.department.trim().replace(/\s+/g, ' ');
  
    let isTech = data.departmentType == 'Technical';
    let modifiedDepartment = isTech ? `${department}-Technical` : `${department}-NonTechnical`;
    let existingDeprtment = await teamModel.findOne({
      $or: [
        { teamName: { $regex: new RegExp(`^${department}$`, 'i') } },
        { teamName: modifiedDepartment }
      ],
      isTech: isTech,
      companyId: companyId
    });

    if (existingDeprtment) {
      data.teamId = existingDeprtment._id;
    } else {
      try {
      console.log('No matching Team found');
      let newTeam = await addTeamExcel(data.department, isTech, companyId);
      data.teamId = newTeam?._id;
      //failedRows.push({ ...data, reason: 'No matching Team found' });
      //return done();
      } catch (error) {
        failedRows.push({ ...data, reason: `${error.message}` });
        return done();
      }
    }
    console.log("here")

    let existingDesignation = await designationModel.findOne({
      designationName: { $regex: new RegExp(`^${data.designation}$`, 'i') },
      companyId,
    });

    if (existingDesignation) {
      data.designationId = existingDesignation._id;
    } else {
      try {
      console.log('No matching Designation found');
      let newDesig = await addDesignationExcel(data.designation, companyId);
      data.designationId = newDesig?._id;
      //failedRows.push({ ...data, reason: 'No matching Designation found' });
      //return done();
      }
      catch (error) {
        failedRows.push({ ...data, reason: `${error.message}` });
        return done();
      }
    }

    data.roleId = '66c5b020d9bfa5dfdbb07d0b';

    console.log("here1")
    let user = new User({ ...data, companyId: companyId });
    console.log("here2")
    try {
      console.log("here3")
      let addUser = await user.save();
      console.log("User saved successfully:", addUser);
    } catch (error) {
      failedRows.push({ ...data, reason: `Failed to save user: ${error.message}` });
      return done(new Error(`Failed to save user: ${error.message}`));
    }
    
    await services.sendVerificationMail(data.email, randomString);
    console.log("After saving user to the database");
    //await services.sendVerificationMail(data.email, randomString);

    // if (!addUser) {
    //   console.log('Bad Reqeust! Fill out the required fields to Add User')
    // }
    done();

  } catch (error) {

    done(new Error(`Failed to process user registration: ${error.message}`));
  }
});

userQueue.on('completed', async (job, result) => {
  try {
    let waitingCount = await userQueue.getWaitingCount();
    let activeCount = await userQueue.getActiveCount();

    if (waitingCount === 0 && activeCount === 0) {
      console.log("hello");

      if (failedRows?.length > 0) {

        let cleanedFailedRows = failedRows.map(row => {
          row.password = userPassword;
          const { companyId, __EMPTY, recipientEmail, verificationToken, shiftId, teamId, designationId, roleId, ...rest } = row;
          return rest;
        });
        const filePath = path.join(__dirname, "FailedEntries.xlsx");

        console.log("Sending failed rows to JSON to Excel conversion");
        await jsonToExcel(cleanedFailedRows, filePath);

        await services.sendExcelFailEmail(recipientEmail, filePath);
        failedRows = [];
        shiftCounter = 1;
      
        await deleteExcelFile(filePath);
      }
      else {
        await services.sendExcelSuccessEmail(recipientEmail);
        failedRows = [];
        shiftCounter = 1;
      }
    }
  } catch (error) {
    console.error(`Failed to handle 'completed' event: ${error.message}`);
  }
});

function formatTime(time) {
  if (time && time.match(/^\d{2}:\d{2}:\d{2}$/)) {
    return time;
  }
  
  let date = new Date(time);
  let hours = String(date.getHours()).padStart(2, '0');
  let minutes = String(date.getMinutes()).padStart(2, '0');
  let seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
}

module.exports = userQueue;
