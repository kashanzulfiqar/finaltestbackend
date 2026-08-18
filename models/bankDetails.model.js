const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bankDetailsSchema = new Schema(
  {
    bankName: {
      type: String,
      required: true,
    },
    accountTitle: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    iban: {
      type: String,
      required: true,
    },
    accountNo: {
      type: String,
      required: true,
    },
    swiftCode: {
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

module.exports = mongoose.model("bankDetails", bankDetailsSchema);
