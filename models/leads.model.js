const { string } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require("mongoose-paginate");

const noteSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
    },
    files: [
      {
        asset_id: {
          type: String,
          required: false,
        },
        public_id: {
          type: String,
          required: false,
        },
        fileName: {
          type: String,
          required: false,
        },
        imageUrl: {
          type: String,
          required: false,
        },
        resource_type: {
          type: String,
          required: false,
        },
        bytes: {
          type: String,
          required: false,
        },        
        createdAt: {
          type: Date,
          default: Date.now, 
        },
      },
    ],
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  },
  { timestamps: true }
);

const reachoutSchema = new Schema({
  date: {
    type: String,
    default: null,
  },
  communicationMedium: {
    type: Schema.Types.ObjectId,
    ref: "medium",
    required: true,
  },
  communicatedBy: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  comments: {
    type: String,
    required: false,
  },
});

const leadsSchema = new Schema(
  {
    leadName: {
      type: String,
      required: true,
    },
    clientName: {
      type: String,
      required: true,
    },
    clientEmail: {
      type: String,
      required: false,
    },
    clientPhoneNo: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ["pending", "onHold", "converted", "notConverted"],
      required: true,
    },
    projectType: {
      type: String,
      enum: ["staffAugmentation", "endToEndProject", "bugFixes"],
      required: false,
    },
    source: {
      type: Schema.Types.ObjectId,
      ref: "sourceOptions",
      required: true,
    },
    accountManager: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    projectWorth: {
      type: String,
      required: false,
    },
    currency: {
      type: String,
      required: false,
    },
    reachOut: {
      type: String,
      required: true,
    },
    lastReachOut: {
      type: String,
      required: true,
    },
    communicationMedium: {
      type: Schema.Types.ObjectId,
      ref: "medium",
      required: true,
    },
    communicatedBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    comments: {
      type: String,
      required: false,
    },
    files: [
      {
        ownerId: {
          type: Schema.Types.ObjectId,
          ref: "user",
          required: true,
        },
        asset_id: {
          type: String,
          required: false,
        },
        public_id: {
          type: String,
          required: false,
        },
        fileName: {
          type: String,
          required: false,
        },
        imageUrl: {
          type: String,
          required: false,
        },
        resource_type: {
          type: String,
          required: false,
        },
        bytes: {
          type: String,
          required: false,
        },        
        createdAt: {
          type: Date,
          default: Date.now, 
        },
      },
    ],
    notes: [noteSchema],
    reachOuts: [reachoutSchema],
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "company",
    },
    modifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

leadsSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("leads", leadsSchema);