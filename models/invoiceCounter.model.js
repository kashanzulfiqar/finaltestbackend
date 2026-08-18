const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const invoiceCounterSchema = new Schema(
  {
    invoiceCount: {
      type: String,
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "company",
      required: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("invoiceCounter", invoiceCounterSchema);
