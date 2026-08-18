const { string } = require("joi");
const mongoose = require("mongoose");
const paginate = require("mongoose-paginate");
const Schema = mongoose.Schema;

const focalPersonSchema = new Schema(
  {
    focalPersonName: {
      type: String,
      required: true,
    },
    focalPersonEmail: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    newPassword: {
      type: String,
      default: "",
    },
    focalPersonPhoneNo: {
      type: String,
      required: true,
    },
    focalPersonImageUrl: {
      type: String,
      default: "",
    },
    designation: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "focalperson",
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "client",
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "company",
      required: true,
    },
    firstTimeLogin: {
      type: Boolean,
      default: true,
    },
    deleted: {
      type: String,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

focalPersonSchema.plugin(paginate);

module.exports = mongoose.model("focalPerson", focalPersonSchema);
