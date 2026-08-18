const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require("mongoose-paginate");

const timesheetSchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    hoursWorked: {
      type: String,
      required: false,
      default: "",
      // match: /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "company",
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "projectManagement",
      required: true,
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "tasks",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: false,
    },
    submittedForApproval: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["No-Status", "Pending", "Approved", "Declined"],
      default: "No-Status",
    },
    reason: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

timesheetSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("timesheet", timesheetSchema);
