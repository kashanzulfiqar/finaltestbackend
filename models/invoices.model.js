const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const paginate = require("mongoose-paginate");
var aggregatePaginate = require("mongoose-aggregate-paginate-v2");

const invoicesSchema = new Schema(
  {
    invoiceNo: { type: String, required: false },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "client",
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "company",
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "projectManagement",
      required: true,
    },
    bankDetailId: {
      type: Schema.Types.ObjectId,
      ref: "bankDetails",
      required: true,
    },
    invoiceTaxSlabId: [
      {
        type: Schema.Types.ObjectId,
        ref: "invoicesTaxSlab",
        required: true,
      },
    ],
    invoiceDate: {
      type: Date,
      required: true,
    },
    invoiceStartDate: {
      type: Date,
      required: true,
    },
    invoiceEndDate: {
      type: Date,
      required: true,
    },
    invoiceMonth: {
      type: String,
      required: false,
    },
    dueDate: {
      type: String,
      required: true,
    },
    teamDetails: [
      {
        userId: {type: Schema.Types.ObjectId, ref: "user", required: false},
        userName: { type: String, required: false },
        cost: { type: String, required: false },
        hoursWorked: { type: String, required: false },
        total: { type: String, required: false },
        totalAmount: { type: String, required: false },
        taxSlabIds: [
          {
            type: Schema.Types.ObjectId,
            ref: "invoicesTaxSlab",
            required: false,
          },
        ],
        taxPercent: { type: String, required: false },
      },
    ],
    monthlyTeamDetails: [
      {
        userId: {type: Schema.Types.ObjectId, ref: "user", required: false},
        userName: { type: String, required: false },
        cost: { type: String, required: false },
        perDayCost: { type: String, required: false },
        daysWorked: { type: String, required: false },
        total: { type: String, required: false },
        totalAmount: { type: String, required: false },
        taxSlabIds: [
          {
            type: Schema.Types.ObjectId,
            ref: "invoicesTaxSlab",
            required: false,
          },
        ],
        taxPercent: { type: String, required: false },
      },
    ],
    servicesDetails: [
      {
        item: { type: String, required: true },
        description: { type: String, required: true },
        unitCost: { type: String, required: true },
        quantity: { type: String, required: true },
        amount: { type: String, required: true },
        invoiceTax: [
          {
            type: Schema.Types.ObjectId,
            ref: "invoicesTaxSlab",
            required: false,
          },
        ],
        taxPercent: { type: String, required: false },
        totalAmount: { type: String, required: true },
      },
    ],
    totalAmount: { type: String, required: true },
    invoiceTax: { type: String, required: true },
    paidAmount: { type: String, required: true },
    paidAmountInPreferredCurrency: { type: String, default: "" },
    remainingAmount: { type: String, required: true },
    status: {
      type: String,
      enum: ["Paid", "Partially Paid", "Pending", "Cancelled"],
      default: "Pending",
      required: true,
    },
    otherInformation: {
      type: String,
      required: false,
    },
    currency: {
      type: String,
      required: false,
    },
    convertedAmount: {
      type: String,
      default: "",
    },
    discount: {
      type: String,
      required: false,
      default: "0",
    },
    paymentDate: {
      type: String,
      required: false,
    },
    paymentType: {
      type: String,
      required: false,
    },
    sendInvoice: {
      type: Boolean,
      required: true,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

invoicesSchema.plugin(paginate);
invoicesSchema.plugin(aggregatePaginate);

module.exports = mongoose.model("invoices", invoicesSchema);
