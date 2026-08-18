const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const columnsSchema = new Schema({
    title: {
        type: String,
        required: true,
      },
      color: {
        type: String,
        required: true,
      },
      tasks: [
        {
          taskId: {
            type: Schema.Types.ObjectId,  
            ref: "tasks",
            required: false,
          },
        },
    ],
  });

const taskBoard = new Schema(
  {
    project: { 
        type: Schema.Types.ObjectId,
        ref: "projectManagement",
        required: true,
    },
    boardTitle: { 
        type: String,
        required: false,
    },
    columns: {
        type: [columnsSchema],
        default: [],
        required: false,
    },
    deleted: {
    type: Boolean,
    default: false,
    required: false,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "company",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("board", taskBoard);
