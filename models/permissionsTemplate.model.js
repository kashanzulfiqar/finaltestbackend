const mongoose = require("mongoose");
const subPermissionsSchema = new mongoose.Schema({
  title: String,
  value: String,
  description: String,
  checked: Boolean,
});
const permissionsTemplateSchema = new mongoose.Schema({
  title: String,
  description: String,
  value: String,
  subPermissions: [subPermissionsSchema],
});
const permissionsTemplateModel = mongoose.model(
  "PermissionsTemplate",
  permissionsTemplateSchema
);
module.exports = permissionsTemplateModel;
