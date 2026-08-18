const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const paginate = require("mongoose-paginate");
var aggregatePaginate = require("mongoose-aggregate-paginate-v2");

const payrollsSchema = new Schema(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "company",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    deduction: {
      type: String,
      required: false,
    },
    deductionReason: {
      type: String,
      default: "",
    },
    tax: {
      type: String,
      required: false,
    },
    totalDeduction: {
      type: String,
      required: false,
    },
    bonus: {
      type: String,
      required: false,
    },
    bonusReason: {
      type: String,
      default: "",
    },
    totalAddition: {
      type: String,
      required: false,
    },
    tempDeduction: {
      type: String,
      required: false,
    },
    creditSalary: {
      type: String,
      required: false,
    },
    basicSalary: {
      type: String,
      required: false,
    },
    hoursWorked: {
      type: String,
      required: false,
    },
    modeOfPayment: {
      type: String,
      required: false,
      default: "",
    },
    transactionId: {
      type: String,
      required: false,
      default: "",
    },
    extraPayment: {
      type: String,
      required: false,
    },
    extraPaymentReason: {
      type: String,
      required: false,
      default: "",
    },
    absentFine: {
      type: String,
      required: false,
      default: "",
    },
    payMonth: {
      type: String,
    },
    payYear: {
      type: String,
    },
    processed: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Paid", "Unpaid"],
      default: "Unpaid",
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

payrollsSchema.plugin(paginate);
payrollsSchema.plugin(aggregatePaginate);

module.exports = mongoose.model("payrolls", payrollsSchema);
