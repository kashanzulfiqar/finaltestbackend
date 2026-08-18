const { string, options } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require("mongoose-paginate");

const comMedium = new Schema({
  title: {
    type: String,
    required: false,
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: "company",
  },
  deleted: {
    type: Boolean,
    default: false,
  },
});

comMedium.plugin(mongoosePaginate);
module.exports = mongoose.model("medium", comMedium);
