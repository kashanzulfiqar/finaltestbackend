const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
var aggregatePaginate = require("mongoose-aggregate-paginate-v2");

// Define the User schema
const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: String,
      required: false,
    },
    employeeId: {
      type: String,
      required: false,
      unique: false,
    },
    joiningDate: {
      type: String,
      required: false,
    },
    employeeExitDate: {
      type: String,
      required: false,
    },
    phoneNo: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    level: {
      type: String,
      required: false,
    },
    password: {
      type: String,
      required: true,
    },
    newPassword: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      required: false,
    },
    resetToken: {
      type: String,
      default: '',
    },
    verificationToken: {
      type: String,
      default: '',
      required: false,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    firstTimeLogin: {
      type: Boolean,
      default: true,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: false,
    },
    employeeType: {
      type: String,
      enum: ['Full-Time', 'Part-Time', 'Contract', 'Intern'],
      required: false,
    },
    salaryType: {
      type: String,
      enum: ['Monthly', 'Hourly', 'Unpaid'],
      default: 'Monthly',
      required: false,
    },
    canBeReportedTo: {
      type: Boolean,
      default: false,
    },
    reportsTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: false,
    },
    bankName: {
      type: String,
      required: false,
    },
    bankAccountNumber: {
      type: String,
      required: false,
    },
    salary: {
      type: String,
      required: false,
      default: '0',
    },
    sickLeaves: {
      type: String,
      default: '0',
    },
    casualLeaves: {
      type: String,
      default: '0',
    },
    workFromHomeLeaves: {
      type: String,
      default: '0',
    },
    bereavementLeaves: {
      type: String,
      default: '0',
    },
    unpaidLeaves: {
      type: String,
      default: '0',
    },
    paternityLeaves: {
      type: String,
      default: '0',
    },
    maternityLeaves: {
      type: String,
      default: '0',
    },
    marriageLeaves: {
      type: String,
      default: '0',
    },
    halfDayLeaves: {
      type: String,
      default: '0',
    },
    annualLeaves: {
      type: String,
      default: '0',
    },
    allotedLeaves: {
      type: String,
      default: '0',
    },
    remainingSickLeaves: {
      type: String,
      default: '0',
    },
    remainingCasualLeaves: {
      type: String,
      default: '0',
    },
    remainingWorkFromHomeLeaves: {
      type: String,
      default: '0',
    },
    remainingBereavementLeaves: {
      type: String,
      default: '0',
    },
    remainingUnpaidLeaves: {
      type: String,
      default: '0',
    },
    remainingPaternityLeaves: {
      type: String,
      default: '0',
    },
    remainingMaternityLeaves: {
      type: String,
      default: '0',
    },
    remainingMarriageLeaves: {
      type: String,
      default: '0',
    },
    remainingHalfDayLeaves: {
      type: String,
      default: '0',
    },
    remainingAnnualLeaves: {
      type: String,
      default: '0',
    },
    remainingLeaves: {
      type: String,
      default: '0',
    },
    takenSickLeaves: {
      type: String,
      default: '0',
    },
    takenCasualLeaves: {
      type: String,
      default: '0',
    },
    takenWorkFromHomeLeaves: {
      type: String,
      default: '0',
    },
    takenBereavementLeaves: {
      type: String,
      default: '0',
    },
    takenUnpaidLeaves: {
      type: String,
      default: '0',
    },
    takenPaternityLeaves: {
      type: String,
      default: '0',
    },
    takenMaternityLeaves: {
      type: String,
      default: '0',
    },
    takenMarriageLeaves: {
      type: String,
      default: '0',
    },
    takenHalfDayLeaves: {
      type: String,
      default: '0',
    },
    takenAnnualLeaves: {
      type: String,
      default: '0',
    },
    takenLeaves: {
      type: String,
      default: '0',
    },
    userStatus: {
      type: String,
      enum: ['Active', 'In-Active'],
      default: 'Active',
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'company',
      required: true,
      default: null,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'team',
      required: false,
    },
    designationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'designation',
      required: false,
    },
    nationalIdentityNumber: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      default: '',
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'role',
      required: false,
      default: null,
    },
    taxSlabId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'taxSlabs',
      required: false,
      default: null,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'shift',
      required: false,
      default: null,
    },
    education: [
      {
        institute: {
          type: String,
          required: false,
        },
        degree: {
          type: String,
          required: false,
        },
        year: {
          type: String,
          required: false,
        },
      },
    ],
    experience: [
      {
        company: {
          type: String,
          required: false,
        },
        designation: {
          type: String,
          required: false,
        },
        duration: {
          type: String,
          required: false,
        },
      },
    ],
    emergencyContacts: [
      {
        name: {
          type: String,
          required: false,
        },
        relationship: {
          type: String,
          required: false,
        },
        phoneNo: {
          type: String,
          required: false,
        },
      },
    ],    
    lastUpdatedAt: {
      type: Date,
      default: null,
      required: false,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    languagePreference: {
      type: String,
      default: 'English',
    },
  },
  { timestamps: true }
);

userSchema.plugin(mongoosePaginate);
userSchema.plugin(aggregatePaginate);

module.exports = mongoose.model('user', userSchema);
