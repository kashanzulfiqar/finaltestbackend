const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const paginate = require("mongoose-paginate");
var aggregatePaginate = require("mongoose-aggregate-paginate-v2");

const projectManagementSchema = new Schema({
  projectName: {
    type: String,
    required: true,
  },
  projectDescription: {
    type: String,
    required: true,
  },
  clientId: {
    type: Schema.Types.ObjectId,
    ref: "client",
    required: true,
  },
  focalPersonId: {
    type: Schema.Types.ObjectId,
    ref: "focalPerson",
    required: true,
  },
  startDate: {
    type: String,
    required: true,
  },
  endDate: {
    type: String,
    required: true,
  },
  currency: {
    type: String,
    required: false,
  },
  cost: {
    type: String,
    required: false,
  },
  costType: {
    type: String,
    enum: ["Hourly", "Monthly", "Fixed"],
    required: false,
  },
  priority: {
    type: String,
    enum: ["High Priority", "Normal Priority", "Low Priority"],
    required: true,
  },
  projectType: {
    type: String,
    enum: ["Billed", "nonBilled"],
    required: false,
  },
  projectLead: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  assignedDevelopers: [
    {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  ],
  teamCost: [
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "user",
        required: false,
      },
      fullName: {
        type: String,
        required: false,
      },
      imageUrl: {
        type: String,
        default: '',
        required: false,
      },
      cost: { 
        type: String, 
        required: false,
        default: '0' 
      },
    },
  ],
  projectDomain: [
    {
      type: Schema.Types.ObjectId,
      ref: "team",
      required: true,
    },
  ],
  status: {
    type: String,
    enum: ["Scheduled", "On-Going", "Paused", "Archived", "Completed"],
    required: false,
  },
  docs: [
    {
      asset_id: {
        type: String,
        required: false
      },
      public_id: {
        type: String,
        required: false
      },
      fileName: {
        type: String,
        required: false
      },
      imageUrl: {
        type: String,
        required: false
      },
      resource_type: {
        type: String,
        required: false
      },
    }
  ],
  //docs_temp: [],
  adminDocs: [
    {
      asset_id: {
        type: String,
        required: false
      },
      public_id: {
        type: String,
        required: false
      },
      fileName: {
        type: String,
        required: false
      },
      imageUrl: {
        type: String,
        required: false
      },
      resource_type: {
        type: String,
        required: false
      },
    }
  ],
  paymentSchedule: [
    {
      paymentTitle: { type: String, required: false },
      dueDate: { type: String, required: false },
      amountInPercent: { type: String, required: true },
      amountInFigure: { type: String, required: true },
      paid: { type: Boolean, default: false },
    },
  ],
  taskBoard: {
    type: Boolean,
    default: false,
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
    required: true,
  },
});

projectManagementSchema.plugin(paginate);
projectManagementSchema.plugin(aggregatePaginate);

module.exports = mongoose.model("projectManagement", projectManagementSchema);
