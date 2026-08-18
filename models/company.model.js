const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const companySchema = new Schema(
  {
    companyName: {
      type: String,
      required: true,
    },
    legalName: {
      type: String,
      required: true,
    },
    contactPerson: {
      type: String,
      required: true,
    },
    financeHead: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: false,
    },
    companyAddress: {
      type: String,
      required: true,
    },
    postalCode: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    companyEmail: {
      type: String,
      required: true,
    },
    companyPhoneNo: {
      type: String,
      required: true,
    },
    mobileNumber: {
      type: String,

      required: true,
    },
    taxRegNo: {
      type: String,
      required: false,
    },
    companyRegistrationNo: {
      type: String,
      required: true,
    },
    website: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    fax: {
      type: String,
      required: false,
      default: "",
    },
    agreeTermsAndConditions: {
      type: Boolean,
      required: true,
    },
    absentDeduction: {
      type: Boolean,
      required: false,
    },
    preferredCurrency: {
      type: String,
      required: false,
      default: "",
    },
    workingDays: {
      type: [String],
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      required: false,
    },
    deleted: {
      type: Boolean,
      default: false,
      required: false,
    },
    disabled: {
      type: Boolean,
      default: false,
      required: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("company", companySchema);
