let services = require("../utils/services");

let methods = {
  sendEmail: async (req, res) => {
    try {

    let data = req.body;

    let senderEmail = data?.email;
    let senderName = data?.fullName;
    let description = data?.description;

    recieverEmail = ["contact@daftarpro.com"]

    await services.sendQueryEmail(senderEmail, recieverEmail, senderName, description);

    return res.status(200).json({
        msg: "Query sent Successfully",
        success: true,
    });
    } catch (error) {
        console.log(error)
      res.status(500).json({
        msg: "Failed to send query",
        error: error,
        success: false,
      });
    }
  },

  sendContactEmail: async (req, res) => {
    try {

    let data = req.body;

    let senderEmail = data?.email;
    let firstName = data?.firstName?.trim();
    let lastName = data?.lastName?.trim();
    let description = data?.description;
    let companySize = data?.companySize;

    let fullName = `${firstName} ${lastName}`;

    recieverEmail = ["contact@daftarpro.com"]

    await services.sendMessageEmail(senderEmail, recieverEmail, fullName, description, companySize);

    return res.status(200).json({
        msg: "Message sent Successfully",
        success: true,
    });
    } catch (error) {
        console.log(error)
      res.status(500).json({
        msg: "Failed to send Message",
        error: error,
        success: false,
      });
    }
  },

  sendSubscribeEmail: async (req, res) => {
    try {

    let data = req.body;

    let senderEmail = data?.email;

    recieverEmail = ["contact@daftarpro.com"]

    await services.sendSubscribeEmail(senderEmail, recieverEmail);

    return res.status(200).json({
        msg: "Subscription Email sent Successfully",
        success: true,
    });
    } catch (error) {
        console.log(error)
      res.status(500).json({
        msg: "Failed to send Subscription Email",
        error: error,
        success: false,
      });
    }
  },
};

module.exports = methods;
