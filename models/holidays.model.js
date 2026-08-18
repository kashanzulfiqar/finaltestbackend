const mongoose = require("mongoose");
const paginate = require("mongoose-paginate");
const Schema = mongoose.Schema;

const holidaysSchema = new Schema(
  {
    holidayTitle: {
      type: String,
      required: true,
    },
    holidayDate: {
      type: Date,
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

holidaysSchema.plugin(paginate);

module.exports = mongoose.model("holidays", holidaysSchema);
