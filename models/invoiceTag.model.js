const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const invoiceTagSchema = new Schema(
  {
    invoiceTag: {
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

module.exports = mongoose.model("invoiceTag", invoiceTagSchema);
