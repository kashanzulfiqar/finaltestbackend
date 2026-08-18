const { string } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const designationSchema = new Schema(
  {
    designationName: {
      type: String,
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "company",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("designation", designationSchema);
