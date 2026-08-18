const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require("mongoose-paginate-v2");

const expensesSchema = new Schema(
  {
    itemName: {
      type: String,
      required: true,
    },
    purchaseFrom: {
      type: String,
      required: true,
    },
    purchaseDate: {
      type: Date,
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    amount: {
      type: String,
      required: true,
    },
    convertedAmount: {
      type: String,
      required: false,
      default: "",
    },
    paidBy: {
      type: String,
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "expensesCategories",
      required: false,
    },
    image: [
      {
        type: String,
        required: true,
      },
    ],
    purchasedBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: false,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "company",
      required: false,
    },
  },
  { timestamps: true }
);

expensesSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("expenses", expensesSchema);
