const { string, options } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require("mongoose-paginate");

const sourceOptions = new Schema({
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

sourceOptions.plugin(mongoosePaginate);
module.exports = mongoose.model("sourceOptions", sourceOptions);
