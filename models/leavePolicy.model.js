const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const leavePolicySchema = new Schema(
  {
    sickLeaves: {
      type: String,
      default: "0",
    },
    casualLeaves: {
      type: String,
      default: "0",
    },
    workFromHomeLeaves: {
      type: String,
      default: "0",
    },
    bereavementLeaves: {
      type: String,
      default: "0",
    },
    unpaidLeaves: {
      type: String,
      default: "0",
    },
    paternityLeaves: {
      type: String,
      default: "0",
    },
    maternityLeaves: {
      type: String,
      default: "0",
    },
    marriageLeaves: {
      type: String,
      default: "0",
    },
    halfDayLeaves: {
      type: String,
      default: "0",
    },
    annualLeaves: {
      type: String,
      default: "0",
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "company",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("leavePolicy", leavePolicySchema);
