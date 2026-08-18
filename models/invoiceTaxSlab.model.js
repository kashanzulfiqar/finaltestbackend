const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const invoicesTaxSlabSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    taxPercent: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "Active",
      enum: ["Active", "In-Active"],
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

module.exports = mongoose.model("invoicesTaxSlab", invoicesTaxSlabSchema);
