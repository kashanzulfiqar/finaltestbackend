const Invoices = require('../models/invoices.model');
const invoiceTag = require('../models/invoiceTag.model');
const invoiceCounter = require('../models/invoiceCounter.model');
const bankDetails = require('../models/bankDetails.model');
const Permission = require('../models/permissions.model');
const user = require('../models/user.model');
const Client = require('../models/client.model');
const Company = require('../models/company.model');
const Project = require('../models/projectManagement.model');
const services = require('../utils/services');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { default: mongoose } = require('mongoose');
const puppeteer = require('puppeteer');
const { log } = require('console');
const moment = require('moment');
const CC = require('currency-converter-lt');
const profitLossModel = require('../models/profitLoss.model');

// const axios = require("axios");

let methods = {
  // addInvoice: async (req, res) => {
  //   try {
  //     let { _id } = req.token;
  //     let findUser = await user.findOne({ _id: _id });
  //     let roleId = findUser.roleId;
  //     let isAllowed;
  //     if (findUser.role === "admin") {
  //       isAllowed = true;
  //     } else {
  //       // Perform the permission check for non-admin users
  //       let checkPermission = await Permission.findOne({ roleId });
  //       isAllowed = services.checkPermissions(
  //         checkPermission,
  //         "financeManagement",
  //         "managePayrolls"
  //       );
  //     }
  //     if (!isAllowed) {
  //       return res.status(401).json({
  //         msg: "Unauthorized User",
  //         success: true,
  //       });
  //     }
  //     let companyId = req.token.companyId;

  //     let data = req.body;
  //     data.companyId = companyId;

  //     let newInvoice = new Invoices(data);

  //     let addInvoice = await newInvoice.save();

  //     if (!addInvoice) {
  //       return res.status(404).json({
  //         msg: "Cannot be Added",
  //         success: false,
  //       });
  //     }

  //     return res.status(200).json({
  //       Invoice: addInvoice,
  //       msg: "Invoice added",
  //       success: true,
  //     });
  //   } catch (error) {
  //     return res.status(500).json({
  //       msg: "Failed to add invoice",
  //       error: error.message,
  //       success: false,
  //     });
  //   }
  // },

  // addInvoice: async (req, res) => {
  //   try {
  //     let { _id } = req.token;
  //     let findUser = await user.findOne({ _id: _id });
  //     let roleId = findUser.roleId;
  //     let isAllowed;
  //     if (findUser.role === "admin") {
  //       isAllowed = true;
  //     } else {
  //       // Perform the permission check for non-admin users
  //       let checkPermission = await Permission.findOne({ roleId });
  //       isAllowed = services.checkPermissions(
  //         checkPermission,
  //         "financeManagement",
  //         "managePayrolls"
  //       );
  //     }
  //     if (!isAllowed) {
  //       return res.status(401).json({
  //         msg: "Unauthorized User",
  //         success: true,
  //       });
  //     }
  //     let companyId = req.token.companyId;

  //     let data = req.body;
  //     data.companyId = companyId;

  //     let newInvoice = new Invoices(data);

  //     let addInvoice = await newInvoice.save();

  //     if (!addInvoice) {
  //       return res.status(404).json({
  //         msg: "Cannot be Added",
  //         success: false,
  //       });
  //     }

  //     if (addInvoice.sendInvoice === true) {
  //       // Create a PDF document
  //       const pdfDoc = new PDFDocument();
  //       const pdfFilePath = path.join(__dirname, "invoice.pdf"); // Define the path for the PDF file

  //       // Add content to the PDF, assuming `addInvoice` contains data for the invoice
  //       pdfDoc.text(`Invoice ID: ${addInvoice._id}`);
  //       pdfDoc.text(`Invoice Date: ${addInvoice.invoiceDate}`);
  //       pdfDoc.text(`Invoice Due Date: ${addInvoice.dueDate}`);
  //       pdfDoc.text(`Invoice Total Amount: ${addInvoice.totalAmount}`);
  //       pdfDoc.text(`Invoice Tax Amount: ${addInvoice.invoiceTax}`);

  //       // Add more data to the PDF as needed

  //       // Pipe the PDF to a file
  //       pdfDoc.pipe(fs.createWriteStream(pdfFilePath));
  //       pdfDoc.end();

  //       let client = await Client.findOne({ _id: addInvoice.clientId });

  //       let recipientEmail = client.invoiceEmail;

  //       // Now, you can call your external mailer function to send the email
  //       // Example:
  //       await services.sendInvoiceEmail(recipientEmail, pdfFilePath); // Replace with your actual mailer function call

  //       // ... Your existing code ...

  //       fs.unlinkSync(pdfFilePath);

  //       return res.status(200).json({
  //         Invoice: addInvoice,
  //         msg: "Invoice added and email sent",
  //         success: true,
  //       });
  //     } else {
  //       return res.status(200).json({
  //         Invoice: addInvoice,
  //         msg: "Invoice added",
  //         success: true,
  //       });
  //     }
  //   } catch (error) {
  //     return res.status(500).json({
  //       msg: "Failed to add invoice",
  //       error: error.message,
  //       success: false,
  //     });
  //   }
  // },

  generateInvoiceHTML: async (addInvoice, company, client, bank, rowData) => {

    const calculateTotal = () => {
      let sub_total = 0;
    
      if (addInvoice?.teamDetails?.length > 0) {
        addInvoice?.teamDetails?.forEach((item) => {
          sub_total += parseFloat(item?.totalAmount) || 0;
        });
      }
      else if (addInvoice?.monthlyTeamDetails?.length > 0) {
        addInvoice?.monthlyTeamDetails?.forEach((item) => {
          sub_total += parseFloat(item?.totalAmount) || 0;
        });
      }
      else if (addInvoice?.servicesDetails?.length > 0) {
        addInvoice?.servicesDetails?.forEach((item) => {
          sub_total += parseFloat(item?.totalAmount ? item?.totalAmount : item?.amount) || 0;
        });
      }
    
      return sub_total?.toFixed(2);
    }
    
    const calculateSubTotal = () => {
      let sub_total = 0;
    
      if (addInvoice?.teamDetails?.length > 0) {
        addInvoice?.teamDetails?.forEach((item) => {
          sub_total += parseFloat(item?.total) || 0;
        });
      }
      else if (addInvoice?.monthlyTeamDetails?.length > 0) {
        addInvoice?.monthlyTeamDetails?.forEach((item) => {
          sub_total += parseFloat(item?.total) || 0;
        });
      }
      else if (addInvoice?.servicesDetails?.length > 0) {
        addInvoice?.servicesDetails?.forEach((item) => {
          sub_total += parseFloat(item?.amount) || 0;
        });
      }
    
      return sub_total?.toFixed(2);
    }

    const calculateTaxAmount = () => {
      let tax_amount = 0;
      tax_amount = ((+addInvoice?.invoiceTax/100)*calculateTotal())
    
      return tax_amount?.toFixed(2);
    }

    const calculateDiscountAmount = () => {
      let disc_amount = 0;
      let total = +calculateTotal() + +calculateTaxAmount();
      disc_amount = ((+addInvoice?.discount/100)*total)
    
      return disc_amount?.toFixed(2);
    }

    let invoiceDate = addInvoice.invoiceDate;
    let StartDate = addInvoice.invoiceStartDate;
    let EndDate = addInvoice.invoiceEndDate;

    invoiceDate = moment(invoiceDate).format("YYYY-MM-DD");
    StartDate = moment(StartDate).format("YYYY-MM-DD");
    EndDate = moment(EndDate).format("YYYY-MM-DD");
    let image = company?.imageUrl;

    let tableHeaders = '';
    if (addInvoice?.servicesDetails?.length > 0) {
      tableHeaders = `
        <tr>
            <th>#</th>
            <th class="nowrap">ITEM</th>
            <th class="d-none d-sm-table-cell">DESCRIPTION</th>
            <th class="nowrap">UNIT COST</th>
            <th>QUANTITY</th>
            <th>AMOUNT</th>
            <th class="nowrap">TAX %</th>
            <th class="text-end">TOTAL</th>
        </tr>`;
    } else if (addInvoice?.teamDetails?.length > 0) {
        tableHeaders = `
        <tr>
            <th>#</th>
            <th class="nowrap">RESOURCE NAME</th>
            <th class="nowrap">HOURLY RATE</th>
            <th>HOURS WORKED</th>
            <th>AMOUNT</th>
            <th class="nowrap">TAX %</th>
            <th class="text-end">TOTAL</th>
        </tr>`;
    } else if (addInvoice?.monthlyTeamDetails?.length > 0) {
        tableHeaders = `
        <tr>
            <th>#</th>
            <th class="nowrap">RESOURCE NAME</th>
            <th class="nowrap">MONTHLY RATE</th>
            <th>DAYS WORKED</th>
            <th>AMOUNT</th>
            <th class="nowrap">TAX %</th>
            <th class="text-end">TOTAL</th>
        </tr>`;
    }

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            @page {
                size: A4;
                margin-top: 30px;
                margin-bottom: 30px;
            }
    
            body {
                font-family: Arial, sans-serif;
                background-color: #f7f7f7;
                margin: 0;
                padding: 0;
            }
    
            .container {
                max-width: 960px;
                margin: 0 auto;
                padding: 20px;
            }
    
            .card {
                background-color: #fff;
                border-radius: 8px;
            }
    
            .card-body {
                padding: 20px;
            }
    
            .inv-logo {
                max-width: 100%;
            }
    
            .list-unstyled {
                list-style: none;
                padding: 0;
            }
    
            .list-unstyled li {
                margin-bottom: 10px;
            }
    
            .text-uppercase {
                text-transform: uppercase;
            }
    
            .text-end {
                text-align: right;
            }
    
            .invoice-details h3 {
                font-size: 24px;
            }
    
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }
    
            th, td {
                padding: 8px;
                text-align: left;
                border-bottom: 1px solid #ddd;
            }
    
            th {
                background-color: #f2f2f2;
            }
    
            .invoice-info h5 {
                font-size: 18px;
            }
    
            .text-muted {
                color: #888;
            }
    
            .no-border th {
                background-color: transparent;
            }
    
            .longText1{
            -webkit-line-clamp: 4;
                -webkit-box-orient: vertical;
                max-width: 190px;
                overflow: hidden;
                line-height: 1.5;
            }

            .longText2{

              -webkit-line-clamp: 4;
      
                  -webkit-box-orient: vertical;
      
                  max-width: 300px;
      
                  overflow: hidden;
      
              }
    
            .nowrap {
            white-space: nowrap;
        }
        </style>
        <title>Invoice</title>
    </head>
    <body>
        <div class="card">
            <div class="card-body">
                <div class="row" style="display: flex; flex-direction: row; justify-content: space-between;">
                    <div class="col-sm-6 m-b-20">
                    <img src=${image} class="inv-logo" alt="" style="width: 120px; height: 120px; border-radius: 50%;" />
                        <ul class="list-unstyled">
                            <li><h4><strong>${company?.companyName}</strong></h4></li>
                            <li class="longText1">${company?.companyAddress}</li>
                        </ul>
                    </div>
                    <div class="col-sm-6 m-b-20 text-end">
                        <div class="invoice-details">
                            <h3 class="text-uppercase" style="margin-top: 0;">INVOICE # ${addInvoice.invoiceNo}</h3>
                            <ul class="list-unstyled">
                                <li>Invoice Date: <span>${invoiceDate}</span></li>
                                <li>Start Date: <span>${StartDate}</span></li>
                                <li>End Date: <span>${EndDate}</span></li>
                                <li>Due date: <span>${addInvoice.dueDate}</span></li>
                            </ul>
                        </div>
                        <span ><h3 style = "margin-top: 50px"><strong>Payment Details:</strong></h3></span>
                        <ul class="list-unstyled invoice-payment-details" style = "line-height: 0;" >
                        <li><h4>Total Due: <span class="text-end">${addInvoice.totalAmount?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                                                } ${addInvoice?.currency}</span></h4></li>
                    </div>
                </div>
                <div class="row" style="display: flex; flex-direction: row; justify-content: space-between;">
                    <div class="col-sm-6 col-lg-7 col-xl-8 m-b-20">
                        <h4>Invoice to:</h4>
                        <ul class="list-unstyled longText2">
                            <li><h4><strong>${client.clientName}</strong></h4></li>
                            <li class="longText1"><span>${client.headOfficeAddress}</span></li>
                            <li><span>${client.country}</span></li>
                            <li><span>${client.clientPhoneNo}</span></li>
                            <li><span>${client.invoiceEmail}</span></li>
                        </ul>
                    </div>
                    <div class="col-sm-6 col-lg-5 col-xl-4 m-b-20 text-end" style="text-align: left;">
                        <ul class="list-unstyled invoice-payment-details longText2" >

                        <li><strong>Bank Name: </strong><span>${bank.bankName}</span></li>
                        
                        <li><strong>Account Title: </strong><span>${bank.accountTitle}</span></li>

                        <li><strong>Country: </strong><span>${bank.country}</span></li>

                        <li><strong>City: </strong><span>${bank.city}</span></li>

                        <li><strong>Address: </strong><span>${bank.address}</span></li>

                        <li><strong>IBAN: </strong><span>${bank.accountNo}</span></li>

                        <li><strong>STRN/TRN: </strong><span>${company?.taxRegNo ? company?.taxRegNo : 'N/A'}</span></li>

                        <li><strong>IBAN: </strong><span>${bank.iban}</span></li>

                        <li><strong>SWIFT code: </strong><span>${bank.swiftCode}</span></li>

                    </ul>

 
                    </div>
                </div>
    
                <div class="table-responsive">
                    <table>
                        <thead>
                          ${tableHeaders}
                        </thead>
                        <tbody id="serviceDetailsTableBody">
                          ${rowData}
                        </tbody>
                    </table>
                </div>
    
                <div>
                    <div class="row invoice-payment" style="display: flex; justify-content: flex-end;">
                        <div class="col-sm-7">
                        </div>
                        <div class="col-sm-5">
                            <div class="m-b-20">
                                <div class="table-responsive no-border">
                                    <table>
                                        <tbody>
                                            <tr>
                                                <th>Total (Tax exclusive):</th>
                                                <td class="text-end" style="padding-left: 150px;">${
                                                  calculateSubTotal()?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                                                } ${addInvoice?.currency}</td>
                                            </tr>
                                            <tr>
                                                <th>Total (Tax inclusive):</th>
                                                <td class="text-end" style="padding-left: 150px;">${
                                                  calculateTotal()?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                                                } ${addInvoice?.currency}</td>
                                            </tr>
                                            <tr>
                                                <th>Sales Tax: (${addInvoice.invoiceTax}%)<span class="text-regular"></span></th>
                                                <td class="text-end" style="padding-left: 150px;">${
                                                  calculateTaxAmount()?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                                                } ${addInvoice?.currency}</td>
                                            </tr>
                                            <tr>
                                                <th>Discount: (${addInvoice.discount}%)<span class="text-regular"></span></th>
                                                <td class="text-end" style="padding-left: 150px;">${
                                                  calculateDiscountAmount()?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                                                } ${addInvoice?.currency}</td>
                                            </tr>
                                            <tr>
                                                <th>Grand Total:</th>
                                                <td class="text-end text-primary" style="padding-left: 150px;"><h3  style="color: #0d6efd!important;">${
                                                  addInvoice.totalAmount?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                                                } ${addInvoice?.currency
                                                }</h3></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="invoice-info">
                        <h5>Other information</h5>
                        <p class="text-muted">${addInvoice.otherInformation}</p>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>    
    `;
  },
  generateRowData: async (addInvoice) => {
    let services = [];

    let rowDataString = ``;
    if (addInvoice?.servicesDetails?.length > 0){
      services = addInvoice.servicesDetails;
      for (let i = 0; i < services.length; i++) {
        const detail = services[i];
        // const row = document.createElement("tr");
        rowDataString += `
        <tr>
                      <td>${i + 1}</td>
                      <td class="nowrap">${detail.item}</td>
                      <td class="d-none d-sm-table-cell">${detail.description}</td>
                      <td>${detail.unitCost?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>
                      <td>${detail.quantity}</td>
                      <td class="text-end">${detail.amount?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>
                      <td>${detail.taxPercent ? detail.taxPercent : '0'}</td>
                      <td class="text-end">${(detail.totalAmount ? detail.totalAmount : detail.amount)?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>
           </tr>       `;
      }
    }
    else if (addInvoice?.teamDetails?.length > 0){
      services = addInvoice.teamDetails;
      for (let i = 0; i < services.length; i++) {
        const detail = services[i];
        // const row = document.createElement("tr");
        rowDataString += `
        <tr>
                      <td>${i + 1}</td>
                      <td class="nowrap">${detail.userName}</td>
                      <td>${detail.cost?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>
                      <td>${detail.hoursWorked}</td>
                      <td>${detail.total?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>
                      <td>${detail.taxPercent}</td>
                      <td class="text-end">${detail.totalAmount?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>
           </tr>       `;
      }
    }
    else if (addInvoice?.monthlyTeamDetails?.length > 0){
      services = addInvoice.monthlyTeamDetails;
      for (let i = 0; i < services.length; i++) {
        const detail = services[i];
        // const row = document.createElement("tr");
        rowDataString += `
        <tr>
                      <td>${i + 1}</td>
                      <td class="nowrap">${detail.userName}</td>
                      <td>${detail.cost?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>
                      <td>${detail.daysWorked}</td>
                      <td>${detail.total?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>
                      <td>${detail.taxPercent}</td>
                      <td class="text-end">${detail.totalAmount?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>
           </tr>       `;
      }
    }

    return rowDataString;
  },

  addInvoice: async (req, res) => {
    try {
      let { _id } = req.token;
      let findUser = await user.findOne({ _id: _id }).populate('companyId');
      let roleId = findUser.roleId;

      let isAllowed;
      if (findUser.role === 'admin') {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, 'financeManagement', 'managePayrolls');
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: 'Unauthorized User',
          success: true,
        });
      }

      let companyId = req.token.companyId;

      let tag = await invoiceTag.findOne({ companyId: companyId });
      if (!tag) {
        return res.status(404).json({
          msg: 'Invoice tag not found. Please go to Settings to set the Invoice Tag and try again.',
          success: false,
        });
      }

      let count = await invoiceCounter.findOne({
        companyId: companyId,
      });
      if (!count) {
        return res.status(404).json({
          msg: 'Invoice counter not found. Please go to Settings to set the Invoice counter and try again.',
          success: false,
        });
      }

      let data = req.body;

      data.invoiceNo = tag.invoiceTag + count.invoiceCount;

      data.companyId = companyId;

      let amountToConvert = +data?.totalAmount;

      if (amountToConvert > 0) {
        let currencyConverter = new CC();
        const convertedAmount = await currencyConverter
          .from(data.currency)
          .to(findUser.companyId.preferredCurrency)
          .amount(amountToConvert)
          .convert();
        const convertedAmountToSave = convertedAmount.toFixed(2);

        data.convertedAmount = convertedAmountToSave;

        // .then((response) => {
        //   data.convertedAmount = response.toFixed(2); //or do something else
        // });
      } else {
        data.convertedAmount = '0.00';
      }

      let invoiceEndDate = new Date(data.invoiceEndDate);
      let year = invoiceEndDate.getUTCFullYear();
      let month = String(invoiceEndDate.getUTCMonth() + 1).padStart(2, '0'); // Months are zero-based, so add 1
      data.invoiceMonth = `${year}-${month}`;

      let newInvoice = new Invoices(data);

      let addInvoice = await newInvoice.save();

      if (!addInvoice) {
        return res.status(404).json({
          msg: 'Cannot be Added',
          success: false,
        });
      }

      if (data.sendInvoice == true) {
        let client = await Client.findOne({ _id: addInvoice.clientId });
        let company = await Company.findOne({ _id: addInvoice.companyId });
        let bank = await bankDetails.findOne({ _id: addInvoice.bankDetailId });

        // Generate the HTML invoice template
        const rowData = await methods.generateRowData(addInvoice);

        const invoiceHtml = await methods.generateInvoiceHTML(addInvoice, company, client, bank, rowData);

        // Create a PDF from the HTML template
        const browser = await puppeteer.launch({
          headless: 'new',
          executablePath: '/app/.apt/usr/bin/google-chrome', // Heroku-specific path
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();

        await page.setContent(invoiceHtml, { waitUntil: 'networkidle0' });

        // Generate the PDF from the HTML
        const pdfFilePath = path.join(__dirname, 'invoice.pdf');
        await page.pdf({ path: pdfFilePath, format: 'A4' });

        await browser.close();

        let recipientEmail = client.invoiceEmail;

        await services.sendInvoiceEmail(recipientEmail, pdfFilePath);

        // Send the email with the PDF attachment

        // Remove the PDF file from the server
        fs.unlinkSync(pdfFilePath);
      }

      let newCount = +count.invoiceCount + 1;

      newCount = newCount.toString().padStart(5, '0');

      let updateCount = await invoiceCounter.findOneAndUpdate(
        {
          companyId: companyId,
        },
        { invoiceCount: newCount }
      );

      return res.status(200).json({
        Invoice: addInvoice,
        msg: 'Invoice added and email sent',
        success: true,
      });
    } catch (error) {
      console.log(`[InvoiceController]: Failed to add invoice: ${error.message}`);
      return res.status(500).json({
        msg: 'Failed to add invoice',
        error: error.message,
        success: false,
      });
    }
  },

  // addInvoice: async (req, res) => {
  //   try {
  //     let { _id } = req.token;
  //     let findUser = await user.findOne({ _id: _id });
  //     let roleId = findUser.roleId;
  //     let isAllowed;
  //     if (findUser.role === "admin") {
  //       isAllowed = true;
  //     } else {
  //       // Perform the permission check for non-admin users
  //       let checkPermission = await Permission.findOne({ roleId });
  //       isAllowed = services.checkPermissions(
  //         checkPermission,
  //         "financeManagement",
  //         "managePayrolls"
  //       );
  //     }
  //     if (!isAllowed) {
  //       return res.status(401).json({
  //         msg: "Unauthorized User",
  //         success: true,
  //       });
  //     }

  //     let preferredCurrency = `EUR`;

  //     let companyId = req.token.companyId;

  //     let tag = await invoiceTag.findOne({ companyId: companyId });

  //     let count = await invoiceCounter.findOne({
  //       companyId: companyId,
  //     });

  //     let data = req.body;

  //     if (data.currency !== preferredCurrency) {
  //       const apiKey = "35741c9c7ff6f543a15cde970cf64279"; // Replace with your exchangeratesapi.io API key
  //       const baseCurrency = data.currency; // The currency of the invoice.
  //       const targetCurrency = preferredCurrency; // The company's preferred currency.
  //       const amount = +data.totalAmount; // The invoice amount.

  //       const exchangeRateResponse = await axios.get(
  //         `http://data.fixer.io/api/convert?access_key=${apiKey}&from=${baseCurrency}&to=${targetCurrency}&amount=${amount}`
  //       );

  //       console.log(exchangeRateResponse);

  //       const exchangeRateData = exchangeRateResponse.data;

  //       if (exchangeRateData.success) {
  //         const convertedAmount = exchangeRateData.result;
  //         data.totalAmount = convertedAmount; // Update the invoice amount to the converted amount.
  //       } else {
  //         return res.status(400).json({
  //           msg: "Unable to retrieve exchange rates",
  //           success: false,
  //         });
  //       }
  //     }

  //     data.invoiceNo = tag.invoiceTag + count.invoiceCount;

  //     data.companyId = companyId;

  //     let newInvoice = new Invoices(data);

  //     let addInvoice = await newInvoice.save();

  //     if (!addInvoice) {
  //       return res.status(404).json({
  //         msg: "Cannot be Added",
  //         success: false,
  //       });
  //     }

  //     if (data.sendInvoice == true) {
  //       let client = await Client.findOne({ _id: addInvoice.clientId });
  //       let company = await Company.findOne({ _id: addInvoice.companyId });
  //       let bank = await bankDetails.findOne({ _id: addInvoice.bankDetailId });

  //       // Generate the HTML invoice template
  //       const rowData = await methods.generateRowData(addInvoice);

  //       const invoiceHtml = await methods.generateInvoiceHTML(
  //         addInvoice,
  //         company,
  //         client,
  //         bank,
  //         rowData
  //       );

  //       // Create a PDF from the HTML template
  //       const browser = await puppeteer.launch({
  //         // executablePath: "/app/.apt/usr/bin/google-chrome", // Heroku-specific path
  //         // args: ["--no-sandbox", "--disable-setuid-sandbox"],
  //       });
  //       const page = await browser.newPage();

  //       await page.setContent(invoiceHtml, { waitUntil: "networkidle0" });

  //       // Generate the PDF from the HTML
  //       const pdfFilePath = path.join(__dirname, "invoice.pdf");
  //       await page.pdf({ path: pdfFilePath, format: "A4" });

  //       await browser.close();

  //       let recipientEmail = client.invoiceEmail;

  //       // await services.sendInvoiceEmail(recipientEmail, pdfFilePath);

  //       // Send the email with the PDF attachment

  //       // Remove the PDF file from the server
  //       fs.unlinkSync(pdfFilePath);
  //     }

  //     let newCount = +count.invoiceCount + 1;

  //     newCount = newCount.toString().padStart(5, "0");

  //     let updateCount = await invoiceCounter.findOneAndUpdate(
  //       {
  //         companyId: companyId,
  //       },
  //       { invoiceCount: newCount }
  //     );

  //     return res.status(200).json({
  //       Invoice: addInvoice,
  //       msg: "Invoice added and email sent",
  //       success: true,
  //     });
  //   } catch (error) {
  //     return res.status(500).json({
  //       msg: "Failed to add invoice",
  //       error: error.message,
  //       success: false,
  //     });
  //   }
  // },

  viewInvoice: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = await user.findOne({ _id: userId });
      let isAllowed;
      if (findUser.role === 'admin') {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let roleId = findUser?.roleId;
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, 'financeManagement', 'managePayrolls');
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: 'Unauthorized User',
          success: true,
        });
      }

      const { status, invoiceFrom, invoiceTo, clientName, invoiceNo, invoiceMonth, both } = req.query; // Get query parameters

      const paginateOptions =
        req.query.page && req.query.limit
          ? { page: req.query.page, limit: req.query.limit }
          : {
              page: 1,
              limit: 10,
            };

      var options = {
        ...paginateOptions,
        populate: { path: 'clientId companyId invoiceTaxSlabId' },
        sort: { createdAt: -1 },
      };

      let pipeline = [
        {
          $match: {
            companyId: new mongoose.Types.ObjectId(findUser.companyId),
          },
        },
        {
          $lookup: {
            from: 'clients',
            localField: 'clientId',
            foreignField: '_id',
            as: 'client',
          },
        },
        {
          $unwind: '$client',
        },
        {
          $lookup: {
            from: 'companies',
            localField: 'companyId',
            foreignField: '_id',
            as: 'company',
          },
        },
        {
          $unwind: '$company',
        },
        {
          $lookup: {
            from: 'bankdetails',
            localField: 'bankDetailId',
            foreignField: '_id',
            as: 'bankDetail',
          },
        },
        {
          $unwind: '$bankDetail',
        },
        {
          $lookup: {
            from: "projectmanagements", // Join with the projects collection
            localField: "projectId", // Field from invoices collection
            foreignField: "_id", // Field from projects collection
            as: "project", // Output field
          },
        },
        {
          $unwind: {
            path: "$project",// Preserve invoices that might not be linked to a project
          },
        },
        {
          $sort: {
            createdAt: -1, // This will sort by createdAt field in descending order (latest first)
          },
        },
      ];

      // Conditionally add clientName filter if clientName query parameter is provided
      if (clientName) {
        pipeline.push({
          $match: {
            'client.clientName': {
              $regex: new RegExp(clientName, 'i'), // "i" for case-insensitive search
            },
          },
        });
      }

      if (invoiceNo) {
        pipeline.push({
          $match: {
            invoiceNo: {
              $regex: new RegExp(invoiceNo, 'i'), // "i" for case-insensitive search
            },
          },
        });
      }

      // Conditionally add createdAt filter based on invoiceFrom and invoiceTo
      if (invoiceFrom && invoiceTo) {
        pipeline.push({
          $match: {
            invoiceDate: {
              $gte: new Date(invoiceFrom + "T00:00:00.000Z"),
              $lte: new Date(invoiceTo + "T23:59:59.999Z"),
            },
          },
        });
      }

      if (invoiceMonth) {
        pipeline.push({
          $match: {
            invoiceMonth: invoiceMonth
          }
        });
      }

      // Conditionally add status filter if status query parameter is provided
      if (status) {
        pipeline.push({
          $match: {
            status: status,
          },
        });
      }

      if (both) {
        pipeline.push({
          $match: {
            status: {
              $in: ["Paid", "Partially Paid"]
            },
          },
        });
      }

      // let findInvoices = await Invoices.aggregate(pipeline);
      // const result = await Invoices.aggregate(pipeline).exec();
      const result = await Invoices.aggregatePaginate(Invoices.aggregate(pipeline), paginateOptions);

      return res.status(200).json({
        Invoices: result,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: 'Failed to view invoices',
        error: error.message,
        success: false,
      });
    }
  },

  viewInvoiceByClient: async (req, res) => {
    try {
      let { _id } = req.token;
      let { id } = req.query;
      const paginateOptions =
        req.query.page && req.query.limit
          ? { page: req.query.page, limit: req.query.limit }
          : {
              page: 1,
              limit: 10,
            };

      var options = {
        ...paginateOptions,
        populate: [
          {
            path: 'companyId',
            select: 'companyName imageUrl companyAddress taxRegNo',
          },
          {
            path: 'clientId'
          },
          {
            path: 'bankDetailId', 
          },
          {
            path: 'projectId',
            select: 'projectName',
          }
        ],
        sort: { createdAt: -1 },
      };

      let findUser = (await user.findOne({ _id })) || (await Client.findOne({ _id })) || (await Client.findOne({ _id: id }));

      let roleId = findUser?.roleId;
      let isAllowed;
      if (findUser.role === 'admin' || findUser.role === 'client') {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, 'clientManagement', 'clientManagement');
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: 'Unauthorized User',
          success: true,
        });
      }

      let invoice = await Invoices.paginate(
        {
          clientId: new mongoose.Types.ObjectId(req.query.id),
        },
        { ...options }
      );
      return res.status(200).json({
        invoices: invoice,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: 'Failed to view invoices',
        error: error.message,
        success: false,
      });
    }
  },

  updateInvoice: async (req, res) => {
    try {
      let { _id, companyId } = req.token;
      let findUser = await user.findOne({ _id }).populate("companyId");;
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === 'admin') {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, 'financeManagement', 'managePayrolls');
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: 'Unauthorized User',
          success: true,
        });
      }
      let data = req.body;
      let id = data._id;
      if (!id) {
        return res.status(400).json({
          msg: 'Invoice id is required',
          success: false,
        });
      }

      // let tag = await invoiceTag.findOne({ companyId: companyId });

      // let count = await invoiceCounter.findOne({
      //   companyId: companyId,
      // });

      // data.invoiceNo = tag.invoiceTag + count.invoiceCount;

      const fromCurrency = data.currency;

      const toCurrency = findUser.companyId.preferredCurrency;

      const amountToConvert = +data?.totalAmount;

      if (data?.totalAmount) {
        if (data?.totalAmount > 0) {
          let currencyConverter = new CC();
          const convertedAmount = await currencyConverter
            .from(fromCurrency)
            .to(toCurrency)
            .amount(amountToConvert)
            .convert();

          const convertedAmountToSave = convertedAmount.toFixed(2);

          data.convertedAmount = convertedAmountToSave;
        } else {
          data.convertedAmount = '0.00';
        }
      }

      let existingInvoice = await Invoices.findOne({ _id: id });

      if (data.invoiceEndDate && new Date(data.invoiceEndDate).toISOString() !== existingInvoice?.invoiceEndDate?.toISOString()) {
        let invoiceEndDate = new Date(data.invoiceEndDate);
        let year = invoiceEndDate.getUTCFullYear();
        let month = String(invoiceEndDate.getUTCMonth() + 1).padStart(2, '0'); // Months are zero-based, so add 1
        data.invoiceMonth = `${year}-${month}`;
      }

      let updateInvoice = await Invoices.findOneAndUpdate({ _id: id }, { ...data }, { new: true });

      if (data.status == 'Paid' || 'Partially Paid' ) {
        let existingInvoiceDate = new Date(existingInvoice.invoiceEndDate);
        let existingYear = existingInvoiceDate.getUTCFullYear();
        let existingMonth = existingInvoiceDate.getUTCMonth() + 1; // Months are zero-based, so add 1

        let profitLossDoc = await profitLossModel.findOne({ companyId: existingInvoice.companyId, year: existingYear, month: existingMonth });
        if (profitLossDoc) {
          await profitLossModel.findByIdAndUpdate(profitLossDoc._id, { isValueChanged: true });
        }
      }

      if (data.sendInvoice == true) {
        data.invoiceNo = existingInvoice?.invoiceNo
        let client = await Client.findOne({ _id: data.clientId });
        let company = await Company.findOne({ _id: companyId });
        let bank = await bankDetails.findOne({ _id: data.bankDetailId });

        // Generate the HTML invoice template
        const rowData = await methods.generateRowData(data);

        const invoiceHtml = await methods.generateInvoiceHTML(data, company, client, bank, rowData);

        // Create a PDF from the HTML template
        const browser = await puppeteer.launch({
          headless: "new",
          executablePath: "/app/.apt/usr/bin/google-chrome", // Heroku-specific path
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        const page = await browser.newPage();

        await page.setContent(invoiceHtml, { waitUntil: "networkidle0" });

        // Generate the PDF from the HTML
        const pdfFilePath = path.join(__dirname, "invoice.pdf");
        await page.pdf({ path: pdfFilePath, format: "A4" });

        await browser.close();

        let recipientEmail = client.invoiceEmail;

        await services.sendInvoiceEmail(recipientEmail, pdfFilePath);

        // Send the email with the PDF attachment

        // Remove the PDF file from the server
        fs.unlinkSync(pdfFilePath);
      }

      res.status(200).json({
        Invoice: updateInvoice,
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: 'Failed to update invoice',
        error: error.message,
        success: false,
      });
    }
  },

  deleteInvoice: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = await user.findOne({ _id: userId });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === 'admin') {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, 'financeManagement', 'managePayrolls');
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: 'Unauthorized User',
          success: true,
        });
      }
      let _id = req.body._id;
      if (!_id) {
        return res.status(400).json({
          msg: 'tax slab id is required',
          success: false,
        });
      }

      let invoice = await Invoices.findOneAndDelete({ _id });

      if (!invoice) {
        return res.status(404).json({
          msg: 'no record found',
        });
      }

      return res.status(200).json({
        msg: 'Invoice deleted Successfully',
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: 'Failed to delete Invoice',
        error: error.message,
        success: false,
      });
    }
  },
};

module.exports = methods;
