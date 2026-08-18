require("dotenv").config();
let mongoose = require("mongoose");
let User = require("../models/user.model");
let Client = require("../models/client.model");
let FocalPerson = require("../models/focalPerson.model");
let Permission = require("../models/permissions.model");
let services = require("../utils/services");
let utils = require("../utils/index");
let moment = require("moment");
let bcrypt = require("bcrypt");
const { is } = require("express/lib/request");
// const randomstring = require("randomstring");

const phoneUtil = require("google-libphonenumber").PhoneNumberUtil.getInstance();

let methods = {
  addFocalPerson: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = (await User.findOne({ _id: userId })) || (await Client.findOne({ _id: userId }));

      let roleId = findUser?.roleId;
      let isAllowed;
      if (findUser.role === "admin" || findUser.role === "client") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        console.log("came here");
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "clientManagement", "clientManagement");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }

      console.log(findUser.role);

      console.log(isAllowed);

      let data = req.body;

      data.focalPersonEmail = data.focalPersonEmail.toLowerCase();

      let companyId = req.token.companyId;

      let focalPersonExist = await FocalPerson.findOne({
        focalPersonEmail: data.focalPersonEmail,
        companyId,
      });

      if (focalPersonExist) {
        return res.status(409).json({
          msg: "Focal Person already exist with this email",
        });
      }

      data.companyId = companyId;
      //const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,}$/;

      // if (!passwordRegex.test(data.password)) {
      //   return res.status(400).json({
      //     msg: "Password does not meet the required criteria.",
      //     success: false,
      //   });
      // }

      data.password = await bcrypt.hash(data.password, 10);

      // let randomString = randomstring.generate();
      // data.verificationToken = randomString;

      let number = data.focalPersonPhoneNo;

      let parsedNumber = phoneUtil.parse(number);

      if (parsedNumber == false) {
        return res.status(400).json({
          msg: "Input Valid Number with Country Code",
          success: false,
        });
      }

      let validNumber = phoneUtil.isValidNumber(phoneUtil.parse(number));

      if (validNumber === false) {
        return res.status(400).json({
          msg: "Input Valid Number",
          success: false,
        });
      }

      let newFocalPerson = new FocalPerson({ ...data, companyId: companyId });

      let addFocalPerson = await newFocalPerson.save();
      // await services.sendVerificationMail(data.email, randomString);

      if (!addFocalPerson) {
        return res.status(400).json({
          msg: "Bad Request! Fill out the required fields to Add Client",
          success: false,
        });
      }

      return res.status(200).json({
        focalPerson: {
          _id: addFocalPerson._id,
          focalPersonName: addFocalPerson.focalPersonName,
          focalPersonEmail: addFocalPerson.focalPersonEmail,
        },
        msg: "Focal Person added",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: `Failed to create new focal person`,
        error: error.message,
        success: false,
      });
    }
  },

  viewFocalPerson: async (req, res) => {
    try {
      let deleted = req.query.deleted;

      let clientId = req.query.clientId;

      const paginateOptions =
        req.query.page && req.query.limit
          ? { page: req.query.page, limit: req.query.limit }
          : {
              page: 1,
              limit: 10,
            };

      var options = {
        ...paginateOptions,
        sort: { createdAt: -1 },
      };

      let companyId = req.token.companyId;

      let focalPersons = await FocalPerson.paginate(
        {
          companyId: companyId,
          clientId: new mongoose.Types.ObjectId(clientId),
          deleted: deleted,
        },
        { ...options }
      );

      res.status(200).json({
        focalPersons: focalPersons,
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to view all focal persons",
        error: error.message,
        success: false,
      });
    }
  },

  updateFocalPerson: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = (await User.findOne({ _id: userId })) || (await Client.findOne({ _id: userId }));
      let isAllowed;
      if (findUser.role === "admin" || findUser.role === "client") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let roleId = findUser?.roleId;
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "clientManagement", "clientManagement");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }
      let data = req.body;
      let id = data._id;
      if (!id) {
        return res.status(400).json({
          msg: "Please provide the id of user to update the focal person record",
          success: false,
        });
      }

      if (data.password && data.password !== "") {
        data.password = await bcrypt.hash(data.password, 10);
      } else {
        delete data.password;
      }

      let number = data.focalPersonPhoneNo;

      let parsedNumber = phoneUtil.parse(number);

      if (parsedNumber == false) {
        return res.status(400).json({
          msg: "Input Valid Number with Country Code",
          success: false,
        });
      }

      let validNumber = phoneUtil.isValidNumber(phoneUtil.parse(number));

      if (validNumber === false) {
        return res.status(400).json({
          msg: "Input Valid Number",
          success: false,
        });
      }

      data.focalPersonEmail = data.focalPersonEmail.toLowerCase();

      let UpdateFocalPerson = await FocalPerson.updateOne({ _id: id }, { ...data });

      res.status(200).json({
        data: UpdateFocalPerson,
        msg: "Focal Person updated",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to update focal person",
        error: error.message,
        success: false,
      });
    }
  },

  getFocalPersonInfo: async (req, res) => {
    try {
      let _id = req.query._id;
      if (!_id) {
        return res.status(400).json({
          msg: "Please provide the id of client to get the client info",
          success: false,
        });
      }
      let findFocalPerson = await FocalPerson.findOne({ _id, deleted: false });
      if (!findFocalPerson) {
        return res.status(404).json({
          msg: "No record exist",
          success: false,
        });
      }
      res.status(200).json({
        FocalPerson: findFocalPerson,
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to get focal person info",
        //eslint-disable-next-line
        error: error.message,
        success: false,
      });
    }
  },

  deleteFocalPerson: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = (await User.findOne({ _id: userId })) || (await Client.findOne({ _id: userId }));
      let isAllowed;
      if (findUser.role === "admin" || findUser.role === "client") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let roleId = findUser?.roleId;
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "clientManagement", "clientManagement");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }
      let _id = req.body._id;
      if (!_id) {
        return res.status(400).json({
          msg: "Provide the id to disable the focal person",
          success: false,
        });
      }

      let focalPerson = await FocalPerson.findOne({ _id });
      if (!focalPerson) {
        res.status(404).json({
          msg: "id not found",
        });
      } else {
        if (focalPerson.deleted == true) {
          return res.status(200).json({
            msg: "This focal person is already In-Active",
            success: true,
          });
        }
        await FocalPerson.findOneAndUpdate({ _id }, { deleted: true }, { new: true });
        res.status(200).json({
          msg: "Focal person with this id deleted",
          success: true,
        });
      }
    } catch (error) {
      res.status(500).json({
        msg: "Failed to disable focal person",
        error: error.message,
        success: false,
      });
    }
  },
};

module.exports = methods;
