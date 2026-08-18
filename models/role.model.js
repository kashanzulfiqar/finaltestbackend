const { string } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const roleSchema = new Schema(
  {
    roleName: {
      type: String,
      required: true,
    },
    customPermissions: {
      type: Boolean,
      required: false,
      default: false,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "company",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("role", roleSchema);
