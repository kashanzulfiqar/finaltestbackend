let Company = require("../models/company.model");
const phoneUtil = require("google-libphonenumber").PhoneNumberUtil.getInstance();
const faxUtil = require("google-libphonenumber").PhoneNumberUtil.getInstance();

let methods = {
  addCompany: async (req, res) => {
    try {
      let { companyEmail, companyName, companyPhoneNo, mobileNumber, fax, agreeTermsAndConditions } = req.body;
      let companyExist = await Company.findOne({ companyEmail });
      if (companyExist) {
        return res.status(409).json({
          msg: "Company already exist with this email",
          success: false,
        });
      }

      let companyNameExist = await Company.findOne({ companyName });
      if (companyNameExist) {
        return res.status(409).json({
          msg: "Company with this Name Already Exist",
          success: false,
        });
      }

      let parsedContactNumber = phoneUtil.parse(companyPhoneNo);

      if (parsedContactNumber == false) {
        return res.status(400).json({
          msg: "Input Valid Number with Country Code",
          success: false,
        });
      }

      let parsedNumber = phoneUtil.parse(mobileNumber);

      if (parsedNumber == false) {
        return res.status(400).json({
          msg: "Input Valid Number with Country Code",
          success: false,
        });
      }

      let validNumber = phoneUtil.isValidNumber(phoneUtil.parse(mobileNumber));

      if (validNumber === false) {
        return res.status(400).json({
          msg: "Input Valid Number",
          success: false,
        });
      }

      if (fax) {   
        let parsedFaxNumber = faxUtil.parse(fax);

        if (parsedFaxNumber == false) {
          return res.status(400).json({
            msg: "Input valid fax number with country code",
            success: false,
          });
        }

        let validFaxNumber = faxUtil.isValidNumber(parsedFaxNumber);

        if (validFaxNumber === false) {
          return res.status(400).json({
            msg: "Input valid fax number",
            success: false,
          });
        }
      }

      if (!agreeTermsAndConditions) {
        return res.status(400).json({
          msg: "Accept the terms and conditions",
          success: false,
        });
      }

      let company = new Company(req.body);

      let addCompany = await company.save();

      if (!addCompany) {
        return res.status(404).json({
          msg: "No Record found to add Company",
          success: false,
        });
      }

      return res.status(200).json({
        Company: addCompany,
        msg: "Company Added",
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to add company",
        error: error.message,
        success: false,
      });
    }
  },

  viewMyCompanyInfo: async (req, res) => {
    try {
      let companyId = req.token.companyId;
      let findCompany = await Company.findOne({
        _id: companyId,
        deleted: false,
      });

      if (!findCompany) {
        return res.status(404).json({
          msg: "Company with this id not found",
          success: false,
        });
      }

      return res.status(200).json({
        companyInfo: findCompany,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to view my company info",
        error: error,
        success: false,
      });
    }
  },

  viewCompany: async (req, res) => {
    try {
      const { companyName, companyEmail } = req.query;
      let status = req.query.deleted;
      let findCompany;
      console.log("company name========", companyName, companyEmail);

      if (status == "false") {
        if (companyName) {
          findCompany = await Company.find({
            companyName: { $regex: new RegExp(companyName, "i") },
            deleted: false,
          });
        } else if (companyEmail) {
          findCompany = await Company.find({
            companyEmail: { $regex: new RegExp(companyEmail, "i") },
            deleted: false,
          });
        } else {
          findCompany = await Company.find({ deleted: false });
        }

        if (!findCompany || findCompany.length === 0) {
          findCompany = [];
        }

        return res.status(200).json({
          companies: findCompany,
          success: true,
        });
      } else {
        if (companyName) {
          findCompany = await Company.find({
            companyName: { $regex: new RegExp(companyName, "i") },
            deleted: true,
          });
        } else if (companyEmail) {
          findCompany = await Company.find({
            companyEmail: { $regex: new RegExp(companyEmail, "i") },
            deleted: true,
          });
        } else {
          findCompany = await Company.find({ deleted: true });
        }

        if (!findCompany || findCompany.length === 0) {
          findCompany = [];
        }

        return res.status(200).json({
          companies: findCompany,
          success: true,
        });
      }
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to view companies",
        error: error.message,
        success: false,
      });
    }
  },
  updateCompany: async (req, res) => {
    try {
      let data = req.body;
      let id = data._id;
      if (!id) {
        return res.status(400).json({
          msg: "Provide the id of company to update the company info",
          success: false,
        });
      }

      if (!data?.agreeTermsAndConditions) {
        return res.status(400).json({
          msg: "Accept the terms and conditions",
          success: false,
        });
      }

      let updateCompany = await Company.updateOne({ _id: id }, data);

      return res.status(200).json({
        data: updateCompany,
        msg: "Company Details Updated",
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to update Company",
        error: error.message,
        success: false,
      });
    }
  },
  deleteCompany: async (req, res) => {
    try {
      let { _id } = req.body;
      if (!_id) {
        return res.status(400).json({
          msg: "Company Id required",
          success: false,
        });
      }

      let company = await Company.findOne({ _id });

      if (!company) {
        res.status(404).json({
          msg: "id not found",
        });
      } else {
        if (company.deleted == true) {
          return res.status(200).json({
            msg: "The company is already deleted and is In-active",
            success: true,
          });
        }
        await Company.updateOne({ _id }, { deleted: true });

        return res.status(200).json({
          msg: "Company with this Id deleted",
          success: true,
        });
      }
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to delete Company",
        error: error.message,
        success: false,
      });
    }
  },
};

module.exports = methods;
