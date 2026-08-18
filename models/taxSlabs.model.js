const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const taxSlabSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    yearlyPayUpperLimit: {
      type: String,
      required: true,
    },
    yearlyPayLowerLimit: {
      type: String,
      required: true,
    },
    monthlyTaxInPercent: {
      type: String,
      required: true,
    },
    fixedYearlyTax: {
      type: String,
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "company",
      required: true,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("taxSlabs", taxSlabSchema);
