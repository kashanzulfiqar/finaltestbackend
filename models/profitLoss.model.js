const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require("mongoose-paginate");

const profitLossSchema = new Schema(
  {
    month: {
      type: String,
      required: true,
    },
    year: {
      type: String,
      required: true,
    },
    totalExpense: {
      type: String,
      required: false,
    },
    creditedSalaryExpense: {
      type: String,
      default: "",
    },
    salaryTaxExpense: {
      type: String,
      default: "",
    },
    generalExpense: {
      type: String,
      default: "",
    },
    totalRevenue: {
      type: String,
      required: false,
    },
    profitLoss: {
      type: String,
      required: false,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "company",
      required: false,
    },
    isValueChanged: {
      type: Boolean,
      default: false,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

profitLossSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("profitLoss", profitLossSchema);
