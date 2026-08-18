const companyModel = require("../models/company.model");
const userModel = require("../models/user.model");
const superAdminModel = require("../models/superAdmin.model");
const randomstring = require("randomstring");
let services = require("../utils/services");

let utils = require("../utils/index");
let bcrypt = require("bcrypt");

const getLatestActivityForCompany = async (companyId) => {
  try {
    const latestEmployee = await userModel
      .findOne({ companyId })
      .sort({ updatedAt: -1 });
    // Find the most recent activity timestamp among the models

    return latestEmployee?.updatedAt || null;
  } catch (error) {
    console.log(error);
    return null;
  }
};

let methods = {
  superAdminOverview: async (req, res) => {
    try {
      let { _id } = req.token;
      let findUser = await superAdminModel.findOne({ _id });
      let isAllowed;

      if (findUser && findUser.superAdmin === true) {
        isAllowed = true;
      } else {
        isAllowed = false;
      }

      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }

      const {
        page = 1,
        limit = 10,
        companyName,
        filter,
        sortType,
        status,
      } = req.query;

      let query = {
        deleted: false,
        disabled: status == "active" ? false : true,
      };

      if (companyName) {
        query.companyName = { $regex: companyName, $options: "i" };
      }

      const companies = await companyModel.find(query).sort({ createdAt: -1 });

      const companyIds = companies?.map(company => company._id);

      let companyData = await Promise.all(
        companies?.map(async (company) => {
          const employeeCount = await userModel.countDocuments({
            companyId: company._id,
            userStatus: "Active",
            deleted: false,
          });

          const latestActivity = await getLatestActivityForCompany(company._id);

          return {
            ...company._doc,
            employeeCount,
            latestActivity,
          };
        })
      );

      if (filter && sortType !== "cancel") {
        const sortOrder = sortType === "ascending" ? 1 : -1;

        companyData = companyData?.sort((a, b) => {
          if (filter === "employeeCount") {
            return (a.employeeCount - b.employeeCount) * sortOrder;
          }
          if (filter === "latestActivity") {
            return (
              (new Date(a.latestActivity) - new Date(b.latestActivity)) *
              sortOrder
            );
          }
          if (filter === "createdAt") {
            return (new Date(a.createdAt) - new Date(b.createdAt)) * sortOrder;
          }
          return 0;
        });
      }

      const paginatedData = companyData?.slice(
        (page - 1) * limit,
        page * limit
      );

      const totalEmployees = await userModel.countDocuments({
        companyId: { $in: companyIds },
        userStatus: status == "active" ? "Active" : "In-Active",
        deleted: status == "active" ? false : true,
      });

      return res.status(200).json({
        Companies: paginatedData,
        totalDocs: companyData?.length,
        totalPages: Math.ceil(companyData?.length / limit),
        currentPage: parseInt(page, 10),
        limit: parseInt(limit, 10),
        success: true,
        stats: {
          totalCompanies: companyData?.length,
          totalEmployees,
        },
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        msg: "Failed to get data",
        error: error.message,
        success: false,
      });
    }
  },

  disableCompany: async (req, res) => {
    try {
      let { _id } = req.token;
      let findUser = await superAdminModel.findOne({ _id });
      let isAllowed;
      let deleteCompany = req.body._id;

      if (findUser && findUser.superAdmin === true) {
        isAllowed = true;
      } else {
        isAllowed = false;
      }

      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }

      if (!deleteCompany) {
        return res.status(400).json({
          msg: "Provide the id of the company to disable",
          success: false,
        });
      }

      let companyId = process.env.COMPANY_ID;

      if (companyId == deleteCompany) {
        return res.status(400).json({
          msg: "You cannot disable your own company",
          success: false,
        });
      }

      let company = await companyModel.findOne({
        _id: deleteCompany,
        deleted: false,
      });

      if (!company) {
        return res.status(404).json({
          msg: "Company not found",
          success: false,
        });
      }

      await companyModel.updateOne(
        { _id: deleteCompany },
        { $set: { disabled: true } }
      );

      return res.status(200).json({
        msg: "Company disabled successfully",
        success: true,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        msg: "Failed to disable company",
        error: error.message,
        success: false,
      });
    }
  },

  enableCompany: async (req, res) => {
    try {
      let { _id, companyId } = req.token;
      let findUser = await superAdminModel.findOne({ _id });
      let isAllowed;
      let enableCompany = req.body.id;

      if (findUser && findUser.superAdmin === true) {
        isAllowed = true;
      } else {
        isAllowed = false;
      }

      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }

      if (!enableCompany) {
        return res.status(400).json({
          msg: "Provide the id of the company to enable",
          success: false,
        });
      }

      let company = await companyModel.findOne({
        _id: enableCompany,
        deleted: false,
      });

      if (!company) {
        return res.status(404).json({
          msg: "Company not found",
          success: false,
        });
      }

      await companyModel.updateOne(
        { _id: enableCompany },
        { $set: { disabled: false } }
      );

      return res.status(200).json({
        msg: "Company enabled successfully",
        success: true,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        msg: "Failed to enable company",
        error: error.message,
        success: false,
      });
    }
  },

  changePassword: async (req, res) => {
    try {
      let _id = req.token._id;
      let data = req.body;
      let password = data.password;

      let user = await superAdminModel.findOne({ _id });
      if (!user) {
        return res.status(404).json({
          msg: "User not found with this id",
          success: false,
        });
      }
      let userId = user._id;

      let match = await utils.comparePassword(password, user.password);

      if (!match) {
        return res.status(400).json({
          msg: "The password you entered does not match your real password! Input Correct Password",
          success: false,
        });
      }

      const passwordRegex =
        /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,}$/;

      if (!passwordRegex.test(data.newPassword)) {
        return res.status(400).json({
          msg: "Password does not meet the required criteria.",
          success: false,
        });
      }

      // Hash the password
      data.password = await bcrypt.hash(data.newPassword, 10);

      let samePassword = await utils.comparePassword(
        data.newPassword,
        user.password
      );
      if (samePassword) {
        return res.status(400).json({
          msg: "Old and new password cannot be same",
          success: false,
        });
      }

      let updatePassword = await superAdminModel.findOneAndUpdate(
        { _id: userId },
        {
          password: data.password,
          newPassword: "",
          firstTimeLogin: false,
        }
      );

      return res.status(200).json({
        msg: "Password Updated",
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to Change Password",
        error: error.message,
        success: false,
      });
    }
  },

  forgotPassword: async (req, res) => {
    try {
      let email = req?.body?.email.toLowerCase();

      let findUser = await superAdminModel.findOne({ email: email });

      if (!findUser) {
        return res.status(404).json({
          msg: "User with this Email does not exist",
          success: true,
        });
      }

      let randomString = randomstring.generate();

      let updateUser = await superAdminModel.findOneAndUpdate(
        { email: email },
        { $set: { resetToken: randomString } }
      );
      services.sendAdminPasswordMail(findUser.email, randomString);

      res.status(200).json({
        return: {
          msg: "Reset Email Have been sent",
          success: true,
        },
      });
    } catch (error) {
      res.status(500).json({
        msg: error.message,
        success: false,
      });
    }
  },

  resetPassword: async (req, res) => {
    try {
      let token = req.query.token;
      let findUser = await superAdminModel.findOne({ resetToken: token });

      if (!findUser) {
        return res.status(200).json({
          msg: "Link have been expired",
          success: true,
        });
      }
      let userRole = findUser.role;
      let password = req.body.password;
      let match = await utils.comparePassword(password, findUser.password);
      if (match) {
        return res.status(400).json({
          msg: "Old password cannot be set as new password",
          success: false,
        });
      }

      const passwordRegex =
        /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,}$/;

      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          msg: "Password does not meet the required criteria.",
          success: false,
        });
      }
      let newPassword = await bcrypt.hash(password, 10);

      let user = await superAdminModel.findByIdAndUpdate(
        { _id: findUser._id },
        { $set: { password: newPassword, resetToken: "" } },
        { new: true }
      );
      return res.status(200).json({
        msg: "Your Password Has been Reset",
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: error.message,
        success: false,
      });
    }
  },
};

module.exports = methods;
