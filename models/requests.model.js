const { optional } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require("mongoose-paginate");
var aggregatePaginate = require("mongoose-aggregate-paginate-v2");

const requestSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "company",
      required: true,
    },
    requestType: {
      type: String,
      enum: ["wfh", "leave", "equipment"],
      required: true,
    },
    totalDays: {
      type: String,
      required: false,
    },
    leaveType: {
      type: String,
      // enum: [
      //   "wfh",
      //   "casual",
      //   "sick",
      //   "bereavement",
      //   "marriage",
      //   "maternity",
      //   "paternity",
      //   "annual",
      //   "half",
      //   "unpaid",
      // ],
      default: null,
      required: false,
    },
    startDate: {
      type: String,
    },
    endDate: {
      type: String,
    },
    status: {
      type: String,
      enum: ["Approved", "Declined", "Pending", "Cancelled"],
      default: "Pending",
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      required: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
  },
  {
    timestamps: true,
  }
);

requestSchema.plugin(mongoosePaginate);
requestSchema.plugin(aggregatePaginate);

module.exports = mongoose.model("request", requestSchema);
