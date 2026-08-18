const { string } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require("mongoose-paginate");

const tasksSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    tags: [
      {
        type: String,
        required: true,
      },
    ],
    description: {
      type: String,
      required: true,
    },
    lane: {
      type: String,
      required: false,
    },
    columnId: {
      type: Schema.Types.ObjectId,
      ref: "board",
      required: false,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "projectManagement",
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "company",
    },
  },
  { timestamps: true }
);

tasksSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("tasks", tasksSchema);
