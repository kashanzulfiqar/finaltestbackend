const mongoose = require("mongoose");
const Schema = mongoose.Schema;
var aggregatePaginate = require("mongoose-aggregate-paginate-v2");
const paginate = require("mongoose-paginate");

const attendanceRecordSchema = new Schema({
  checkInTime: {
    type: String,
    default: null,
  },
  checkOutTime: {
    type: String,
    default: null,
  },
  hoursWorked: {
    type: String,
    default: "0",
  },
});

const attendanceSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "company",
    },
    note: {
      type: String,
      required: false,
    },
    attendanceDate: {
      type: String,
      required: true,
    },
    attendanceMonth: {
      type: String,
      required: false,
    },
    attendanceYear: {
      type: String,
      required: false,
    },
    attendanceRecords: [attendanceRecordSchema],
    lateArrival: {
      type: String,
      default: "0",
    },
    hoursWorked: {
      type: String,
      default: "0",
    },
    status: {
      type: String,
      enum: ["Present", "Late", "Absent", "On-Leave", "Holiday"],
      default: "Present",
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    overTime: {
      type: String,
      default: "",
    },
    ipAddress: {
      type: String,
      default: "10.0.0.1",
    },
    location: {
      type: String,
      default: "Rawalpindi, Pakistan",
    },
  },
  {
    timestamps: true,
  }
);

attendanceSchema.plugin(paginate);
attendanceSchema.plugin(aggregatePaginate);

module.exports = mongoose.model("attendance", attendanceSchema);
