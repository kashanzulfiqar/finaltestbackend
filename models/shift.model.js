const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const shiftSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    maxStartTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "company",
      required: true,
    },
    isActive: {
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

module.exports = mongoose.model("shift", shiftSchema);
