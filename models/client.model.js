const { string } = require("joi");
const mongoose = require("mongoose");
const paginate = require("mongoose-paginate");
const Schema = mongoose.Schema;

const clientSchema = new Schema(
  {
    clientName: {
      type: String,
      required: true,
    },
    logo: {
      type: String,
      required: false,
      default: "",
    },
    clientEmail: {
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
    invoiceEmail: {
      type: String,
      required: true,
    },
    clientPhoneNo: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "client",
    },
    country: {
      type: String,
      required: true,
    },
    headOfficeAddress: {
      type: String,
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
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

clientSchema.plugin(paginate);

module.exports = mongoose.model("client", clientSchema);
