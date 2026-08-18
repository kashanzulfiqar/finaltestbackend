const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const teamSchema = new Schema(
  {
    teamName: {
      type: String,
      required: true,
    },
    isTech: {
      type: Boolean,
      default: true,
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'company',
      required: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('team', teamSchema);
