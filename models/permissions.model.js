const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userPermissionsSchema = new Schema({
  roleId: {
    type: Schema.Types.ObjectId,
    ref: "role",
    required: true,
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: "company",
    required: false,
  },
  permissions: { type: Array, default: [], required: true },
});

module.exports = mongoose.model("permissions", userPermissionsSchema);
