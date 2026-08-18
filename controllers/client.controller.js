require("dotenv").config();
let User = require("../models/user.model");
let Client = require("../models/client.model");
let FocalPerson = require("../models/focalPerson.model");
let Permission = require("../models/permissions.model");
let services = require("../utils/services");
let utils = require("../utils/index");
let moment = require("moment");
let bcrypt = require("bcrypt");
// const randomstring = require("randomstring");

const phoneUtil = require("google-libphonenumber").PhoneNumberUtil.getInstance();

let methods = {
  addClient: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = await User.findOne({ _id: userId });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
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

      data.clientEmail = data.clientEmail.toLowerCase();
      data.invoiceEmail = data.invoiceEmail.toLowerCase();

      let companyId = req.token.companyId;

      let clientExist = await Client.findOne({
        clientEmail: data.clientEmail,
        companyId,
      });

      if (clientExist) {
        return res.status(409).json({
          msg: "Client already exist with this email",
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

      let number = data.clientPhoneNo;

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

      let client = new Client({ ...data, companyId: companyId });

      let addClient = await client.save();
      // await services.sendVerificationMail(data.email, randomString);

      if (!addClient) {
        return res.status(400).json({
          msg: "Bad Request! Fill out the required fields to Add Client",
          success: false,
        });
      }

      return res.status(200).json({
        Client: {
          _id: addClient._id,
          clientName: addClient.clientName,
          clientEmail: addClient.clientEmail,
        },
        msg: "Client added",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: `Failed to create new client`,
        error: error.message,
        success: false,
      });
    }
  },

  allClients: async (req, res) => {
    try {
      let companyId = req.token.companyId;
      let clients = await Client.find({ companyId: companyId, deleted: false });

      res.status(200).json({
        clients: clients,
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to view all clients",
        error: error.message,
        success: false,
      });
    }
  },

  viewClient: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = await User.findOne({ _id: userId });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "clientManagement", "clientManagement");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }

      let deleted = req.query.deleted;
      let clientName = req.query.clientName;
      let country = req.query.country;

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

      // Initialize the query object with companyId and deleted
      let query = {
        companyId: companyId,
        deleted: deleted,
      };

      // If clientName is provided, add the clientName filter
      if (clientName) {
        // Create a regex pattern for clientName search
        const clientNameRegex = new RegExp(clientName, "i");
        query.clientName = { $regex: clientNameRegex };
      }

      if (country) {
        query.country = country; // Match the exact country code
      }

      let clients = await Client.paginate(query, options);

      res.status(200).json({
        clients: clients,
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to view all clients",
        error: error.message,
        success: false,
      });
    }
  },

  loginClient: async (req, res) => {
    try {
      let data = req.body;
      let email = data.email;
      let password = data.password;

      if (!email || !password) {
        return res.status(401).json({
          msg: "Please enter right Credentials!",
          success: false,
        });
      }

      let user =
        (await Client.findOne({ clientEmail: email })) || (await FocalPerson.findOne({ focalPersonEmail: email }));

      if (!user) {
        return res.status(404).json({
          msg: "user with email does not exist",
          success: false,
        });
      }

      let clientDeletedStatus = user.deleted;
      if (clientDeletedStatus == true) {
        return res.status(400).json({
          msg: "This user have been disabled by Admin! Not Allowed to Login",
          success: false,
        });
      }

      let match = await utils.comparePassword(password, user.password);

      if (!match) {
        return res.status(401).json({
          msg: "Wrong Password Entered",
          success: false,
        });
      }
      let access_token = await utils.issueToken({
        _id: user._id,
        companyId: user.companyId,
        role: user.role
      }); //companyId:user.companyId(to be placed after id)

      let result = {
        user: {
          _id: user._id,
          email: user?.clientEmail || user?.focalPersonEmail,
          fullName: user?.clientName || user?.focalPersonName,
          role: user?.role,
          companyId: user?.companyId,
          image: user?.logo || user?.focalPersonImageUrl || "",
          firstTimeLogin: user?.firstTimeLogin,
        },
        access_token,
      };
      return res.status(200).json({ success: true, result });
    } catch (error) {
      return res.status(500).json({
        msg: "Login Failed",
        error: error.message,
        success: false,
      });
    }
  },

  updateClient: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = await User.findOne({ _id: userId });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
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
          msg: "Please provide the id of user to update the user record",
          success: false,
        });
      }

      if (data.password && data.password !== "") {
        data.password = await bcrypt.hash(data.password, 10);
      } else {
        delete data.password;
      }

      let number = data.clientPhoneNo;

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

      data.clientEmail = data.clientEmail.toLowerCase();
      data.invoiceEmail = data.invoiceEmail.toLowerCase();

      let UpdateClient = await Client.updateOne({ _id: id }, { ...data });

      res.status(200).json({
        data: UpdateClient,
        msg: "User updated",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to update user",
        error: error.message,
        success: false,
      });
    }
  },
  getClientInfo: async (req, res) => {
    try {
      let _id = req.query._id;
      if (!_id) {
        return res.status(400).json({
          msg: "Please provide the id of client to get the client info",
          success: false,
        });
      }
      let findClient = await Client.findOne({ _id, deleted: false });
      if (!findClient) {
        return res.status(404).json({
          msg: "No record exist",
          success: false,
        });
      }
      res.status(200).json({
        Client: findClient,
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to get client info",
        //eslint-disable-next-line
        error: error.message,
        success: false,
      });
    }
  },

  deleteClient: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = await User.findOne({ _id: userId });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
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
          msg: "Provide the user id to disable the employee",
          success: false,
        });
      }

      let client = await Client.findOne({ _id });
      if (!client) {
        res.status(404).json({
          msg: "id not found",
        });
      } else {
        if (client.deleted == true) {
          return res.status(200).json({
            msg: "This client is already In-Active",
            success: true,
          });
        }
        await Client.findOneAndUpdate({ _id }, { deleted: true }, { new: true });
        res.status(200).json({
          msg: "Client with this id deleted",
          success: true,
        });
      }
    } catch (error) {
      res.status(500).json({
        msg: "Failed to disable client",
        error: error.message,
        success: false,
      });
    }
  },
};

module.exports = methods;
