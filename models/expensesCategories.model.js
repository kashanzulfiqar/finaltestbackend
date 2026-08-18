const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require("mongoose-paginate-v2");

const expensesCategoriesSchema = new Schema(
  {
    expenseCategoryName: {
      type: String,
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "company",
      required: false,
    },
  },
  { timestamps: true }
);

expensesCategoriesSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("expensesCategories", expensesCategoriesSchema);
