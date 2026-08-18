const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
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
    password: {
      type: String,
      required: true,
    },
    newPassword: {
      type: String,
      default: '',
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
    verificationTokenExpires: {
      type: Date,
      default: null,
      required: false,
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
    superAdmin: {
      type: Boolean,
      default: false,
      required: false,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('superAdmin', adminSchema);
