let bankDetails = require('../models/bankDetails.model');
let Permission = require('../models/permissions.model');
let User = require('../models/user.model');
let services = require('../utils/services');

let methods = {
  addBankDetail: async (req, res) => {
    try {
      let { _id } = req.token;
      let findUser = await User.findOne({ _id });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === 'admin') {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, 'companyManagement', 'companyManagement');
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: 'Unauthorized User',
          success: true,
        });
      }
      let companyId = req.token.companyId;

      let data = req.body;
      if (!data) {
        return res.status(404).json({
          msg: 'Please Input team name to add team',
          success: false,
        });
      }
      data.companyId = companyId;
      let newBankDetail = new bankDetails(data);
      let addNewBankDetails = await newBankDetail.save();
      if (!addNewBankDetails) {
        return res.status(404).json({
          msg: 'Bank detail is not added',
          success: false,
        });
      }
      res.status(200).json({
        bankDetail: addNewBankDetails,
        msg: 'Bank detail added',
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: 'Failed to add bank detail',
        error: error,
        success: false,
      });
    }
  },

  viewBankDetails: async (req, res) => {
    try {
      let _id = req.token._id;
      let check = await User.findOne({ _id: _id, deleted: false });

      let companyId = check.companyId;

      let findBankDetails = await bankDetails.find({ companyId: companyId }).populate({
        path: 'companyId',
        populate: {
          path: 'financeHead', // Populate the financeHead field
          select: 'fullName designationId', // Select the fullName and designationId fields
          populate: {
            path: 'designationId', // Populate the designationId field
            select: 'designationName' // Select the designationName field only
          }
        }
      });
      findBankDetails = findBankDetails?.map((bd) => {
        return {
          ...bd.toObject(),
          accountNo: bd?.accountNo,
          accountTitle: bd?.accountTitle,
          companyLogo: bd.companyId.imageUrl,
          companyId: bd.companyId._id,
          companyName: bd.companyId.companyName,
          financeHeadName: bd?.companyId?.financeHead?.fullName,
          financeHeadDesignation: bd?.companyId?.financeHead?.designationId?.designationName 
        };
      });

      if (!findBankDetails.length) {
        findBankDetails = [];
      }
      return res.status(200).json({
        bankDetail: findBankDetails,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: 'Failed to view bank details',
        error: error,
        success: false,
      });
    }
  },

  updateBankDetail: async (req, res) => {
    try {
      let { _id } = req.token;
      let findUser = await User.findOne({ _id });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === 'admin') {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, 'companyManagement', 'companyManagement');
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
          msg: 'Bank detail id is required',
          success: false,
        });
      }

      // Retrieve the existing bank detail
      let existingBankDetail = await bankDetails.findOne({ _id: id });
      if (!existingBankDetail) {
        return res.status(404).json({
          msg: 'Bank detail not found',
          success: false,
        });
      }

      let updateBankDetail = await bankDetails.updateOne({ _id: id }, { ...data });
      res.status(200).json({
        data: updateBankDetail,
        msg: 'Bank detail updated',
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: 'Failed to update bank detail',
        error: error,
        success: false,
      });
    }
  },

  deleteBankDetail: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = await User.findOne({ _id: userId });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === 'admin') {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, 'companyManagement', 'companyManagement');
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
          msg: 'Bank detail id is required',
          success: false,
        });
      }
      let deleteBankDetail = await bankDetails.findOneAndDelete({ _id });
      if (!deleteBankDetail) {
        return res.status(404).json({
          msg: 'No bank detail with this id found',
          success: false,
        });
      }
      return res.status(200).json({
        msg: 'Bank detail deleted successfully',
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: 'Failed to delete bank detail',
        error: error.message || 'Something went wrong.',
        success: false,
      });
    }
  },
};

module.exports = methods;
