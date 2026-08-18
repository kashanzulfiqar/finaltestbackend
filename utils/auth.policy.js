const companyModel = require("../models/company.model");
const userModel = require("../models/user.model");
const utils = require("./index");

module.exports = async (req, res, next) => {
  try {
    let tokenToVerify;

    // Check for Authorization header and validate format
    if (req.header("Authorization")) {
      const parts = req.header("Authorization").split(" ");
      if (parts.length === 2 && /^Bearer$/.test(parts[0])) {
        tokenToVerify = parts[1];
      } else {
        return res
          .status(401)
          .json({ msg: "Format for Authorization: Bearer [token]" });
      }
    } else {
      return res.status(401).json({ msg: "No Authorization was found" });
    }

    // Verify the token
    const thisToken = await utils.verifyToken(tokenToVerify);
    if (!thisToken) {
      return res.status(401).json({ msg: "Invalid Token" });
    }

    // Find the company associated with the token
    const company = await companyModel.findById(thisToken.companyId).lean();
    if (!company || company?.disabled) {
      return res.status(404).json({ msg: "Company Not Found!", success: false });
    }
    // Find the user associated with the token
    if (thisToken?.role != 'focalperson' && thisToken?.role != 'client') {
      let user = await userModel.findById(thisToken._id);
      if (!user) {
        return res
          .status(404)
          .json({ msg: "User not found", success: false });
      }
      user.lastUpdatedAt = new Date();
      await user.save();
    }

    // Attach token to request and call the next middleware
    req.token = thisToken;
    return next();
  } catch (error) {
    // Catch any unhandled errors and send appropriate response
    return res.status(500).json({ msg: "Internal server error", error });
  }
};
