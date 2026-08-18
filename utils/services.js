const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();
// const nodemailer = require("nodemailer");
// const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

const methods = {
  sendResetPasswordMail: async (email, token, res) => {
    try {
      const info = await transporter.sendMail({
        from: process.env.emailUser,
        to: email,
        subject: "Reset your Password",
        text: "Reset your forgot Password",
        html: `<p>Dear Employee,<br>
        It seems like you have requested to reset your password for your DaftarPro account.<br><br>
        To proceed with resetting your password, please click on <a style="text-decoration: underline; font-weight: 600; color: #0098c9;" href=${process.env.MAIL_REDIRECT_LINK}/reset-password/${token}>Reset Password </a><br><br>
        If you did not request to reset your password, please ignore this email and take the necessary steps to secure your account.<br>
        If the link has expired, please go to login screen and request a new password reset link.<br><br>
        Thank you for choosing DaftarPro. If you have any questions or concerns, please do not hesitate to contact us at.<br>
        Best regards,<br>
        DaftarPro Team </p>`,
      });
      console.log("Reset Password Email sent", info.messageId);
    } catch (error) {
      console.error(error);
    }
  },

  sendAdminPasswordMail: async (email, token, res) => {
    try {
      const info = await transporter.sendMail({
        from: process.env.emailUser,
        to: email,
        subject: "Reset your Password",
        text: "Reset your forgot Password",
        html: `<p>Dear Employee,<br>
        It seems like you have requested to reset your password for your DaftarPro account.<br><br>
        To proceed with resetting your password, please click on <a style="text-decoration: underline; font-weight: 600; color: #0098c9;" href=${process.env.MAIL_REDIRECT_LINK}/reset/${token}>Reset Password </a><br><br>
        If you did not request to reset your password, please ignore this email and take the necessary steps to secure your account.<br>
        If the link has expired, please go to login screen and request a new password reset link.<br><br>
        Thank you for choosing DaftarPro. If you have any questions or concerns, please do not hesitate to contact us at.<br>
        Best regards,<br>
        DaftarPro Team </p>`,
      });
      console.log("Reset Password Email sent", info.messageId);
    } catch (error) {
      console.error(error);
    }
  },

  sendRequestStatusEmail: async (email, status, requestType) => {
    let subject = "";
    let message = "";
    if (status === "Approved") {
      subject = "Your request has been approved";
      message = `Dear Employee,<br><br>Your ${requestType} request has been approved. Please check your DaftarPro account for further details.<br><br>Best regards,<br>DaftarPro Team`;
    } else if (status === "Declined") {
      subject = "Your request has been declined";
      message = `Dear Employee,<br><br>Unfortunately, your ${requestType} request has been declined. Please check your DaftarPro account for further details.<br><br>Best regards,<br>DaftarPro Team`;
    } else {
      throw new Error("Invalid status parameter");
    }

    const mailOptions = {
      from: process.env.emailUser, // sender address
      to: email, // list of receivers
      subject: subject,
      text: `Your ${requestType} request has been ${status}`,
      html: message,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("Request status email sent to user");
    } catch (error) {
      console.error(error);
    }
  },

  sendQueryEmail: async (
    senderEmail,
    recieverEmail,
    senderName,
    description,
  ) => {
    const date = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const message = {
      from: process.env.emailUser,
      to: recieverEmail?.join(','),
      subject: "DaftarPro Query Request",
      html: `
      <p><b>Date: </b>${date}</p>
      <p><b>Reporter Name: </b>${senderName}</p>
      <p><b>Reporter Email: </b>${senderEmail}</p>
      <br/>
      <b>Problem Description: </b>
      <p>${description}</p>
      <br>
      <p><b>Sent by: </b>DaftarPro Query Model</p>
    `,
    };

    try {
      await transporter.sendMail(message);
      console.log("Query sent to admins");
    } catch (error) {
      console.error(error);
    }
  },

  sendSubscribeEmail: async (
    senderEmail,
    recieverEmail,
  ) => {
    const message = {
      from: process.env.emailUser,
      to: recieverEmail?.join(','),
      subject: "New Newsletter Subscription Request",
      html: `
        <p>Hi,</p>
        <p>You have a new subscription request for your newsletter.</p>
        <p><b>Subscriber Email: </b>${senderEmail}</p>
        <br/>
        <p>The user <b>${senderEmail}</b> has requested to subscribe to your newsletter and is looking forward to receiving updates.</p>
        <br/>
        <p>If this was a mistake, you can ignore this message.</p>
        <br>
        <p>Best regards,</p>
        <p>DaftarPro Team</p>
        <p><b>Sent by:</b> DaftarPro Subscription Model</p>
      `,
    };

    try {
      await transporter.sendMail(message);
      console.log("Query sent to admins");
    } catch (error) {
      console.error(error);
    }
  },

  sendMessageEmail: async (
    senderEmail,
    recieverEmail,
    senderName,
    description,
    companySize
  ) => {
    const date = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const message = {
      from: process.env.emailUser,
      to: recieverEmail?.join(','),
      subject: "DaftarPro Company Management Software Inquiry",
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <div style="background-color: #f5f5f5; padding: 20px;">
            <h2 style="color: #007BFF;">DaftarPro Inquiry</h2>
            <p>Dear DaftarPro Admin,</p>
            <p>A new request has been made for company management software. Please find the details below:</p>
            <hr/>
            <p><strong>Date: </strong>${date}</p>
            <p><strong>Requester Name: </strong>${senderName}</p>
            <p><strong>Requester Email: </strong>${senderEmail}</p>
            <p><strong>Company Size: </strong>${companySize} employees</p>
            <br/>
            <h3 style="color: #007BFF;">Request Details</h3>
            <p>${description}</p>
            <br/>
            <p><strong>Note: </strong>Please reach out to the requester for further communication regarding their software needs.</p>
            <br>
            <p>Best Regards,<br>DaftarPro Team</p>
            <p style="font-size: 12px; color: #777;">This email was automatically generated by the DaftarPro system.</p>
          </div>
        </div>
      `,
    };

    try {
      await transporter.sendMail(message);
      console.log("Query sent to admins");
    } catch (error) {
      console.error(error);
    }
  },

  sendRequestNotification: async (
    
    emails,
    requestee,
    appliedNoOfLeaves,
    requestStartDate,
    requestEndingDate,
    requestType,
    requestId,
    description,
    availableWFH,
    availableannualLeaves,
    availableSickLeaves,
    availableCasualLeaves
  ) => {
    const formatLeaveType = (leaveType) => {
      if (leaveType === "wfh") {
        return "Work From Home";
      }
      return leaveType.charAt(0).toUpperCase() + leaveType.slice(1).toLowerCase();
    };
    const mainStatment = requestType === "wfh"
    ? `A new work from home request has been submitted on DaftarPro. Please find the details below:` 
    : `A new ${requestType} leave request has been submitted on DaftarPro. Please find the details below:`;
    const typeHeading = requestType === "wfh"
    ? `Request Type:`
    : `Leave Type:`
    const leaveDuration = appliedNoOfLeaves > 1
    ? `${appliedNoOfLeaves} days`
    : `1 day`;
    const message = {
      from: process.env.emailUser,
      to: emails,
      subject: "New Request Notification",
      html: `
        <p>Dear Approver,</p>
                <p>${mainStatment}</p>
        <p><b>Request Details:</b></p>
        <ul>
          <li style="margin-bottom: 1%;"><b>Employee Name:</b> ${requestee}</li>
          <li style="margin-bottom: 1%;"><b>${typeHeading}</b> ${formatLeaveType(requestType)}</li>
          <li style="margin-bottom: 1%;"><b>Duration:</b> ${leaveDuration}</li>
          <li style="margin-bottom: 1%;"><b>From:</b> ${requestStartDate}</li>
          <li style="margin-bottom: 1%;"><b>To:</b> ${requestEndingDate}</li>
          <li style="margin-bottom: 1%;"><b>Request Description:</b> ${description}</li>
        </ul>
        
        <p><b>Remaining Leave Balances:</b></p>
        <ul>
          <li style="margin-bottom: 1%;"><b>Casual:</b> ${availableCasualLeaves}</li>
          <li style="margin-bottom: 1%;"><b>Sick:</b> ${availableSickLeaves}</li>
          <li style="margin-bottom: 1%;"><b>Annual:</b> ${availableannualLeaves}</li>
          <li style="margin-bottom: 1%;"><b>WFH:</b> ${availableWFH}</li>
        </ul>
        <p>To review and approve the request, please
          <a style="text-decoration: underline; font-weight: 600; color: #0098c9;" 
             href=${process.env.MAIL_REDIRECT_LINK}/employee/request-admin/${requestId}>
            click here
          </a>
        to open the request in DaftarPro.</p>
        <br>
        <p>Thank you<br>Best regards,<br>DaftarPro Team</p>
      `,
    };

    try {
      await transporter.sendMail(message);
      console.log("Request Notification sent to approvers");
    } catch (error) {
      console.error(error);
    }
  },

  sendVerificationMail: async (email, token) => {
    const mailOptions = {
      from: process.env.emailUser,
      to: email,
      subject: "Verification Mail",
      text: "Email Verification for User",
      html: `<p>Dear Employee,<br>
      Thank you for signing up with DaftarPro! To ensure the security of your account and to verify your email address, we need you to confirm your registration.<br><br>
      To complete your sign-up process, please click on <a style="text-decoration: underline; font-weight: 600; color: #0098c9;" href="${process.env.MAIL_REDIRECT_LINK}/login/${email}/token=${token}">Login</a> <br><br>
      If you are unable to click on the link above, please copy and paste it into your web browser's address bar.<br>
      If you did not sign up for an account with us, please ignore this email.<br><br>
      Thank you for choosing DaftarPro<br>

      Best regards,<br>
  
      DaftarPro Team </p>`,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("Verification Email sent to email");
    } catch (error) {
      console.error(error);
    }
  },

  sendOTP: async (email, token) => {
    const mailOptions = {
      from: process.env.emailUser,
      to: email,
      subject: "Verification Mail",
      text: `Use this OTP for signing in to DaftarPro Admin Portal ${token}. This OTP will expire in 5 minutes. Donot share this otp with anyone`,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("Verification Email sent to email");
    } catch (error) {
      console.error(error);
    }
  },

  sendInvoiceEmail: async (recipientEmail, invoiceFilePath) => {
    const mailOptions = {
      from: process.env.emailUser,
      to: recipientEmail,
      subject: "Invoice Attached",
      text: "Please find the attached invoice.",
      attachments: [{ filename: "invoice.pdf", path: invoiceFilePath }],
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("Invoice Email sent to recipient", info.messageId);
    } catch (error) {
      console.error(error);
    }
  },

  sendExcelSuccessEmail: async (recipientEmail) => {
    const mailOptions = {
      from: process.env.emailUser,
      to: recipientEmail,
      subject: "Bulk User Registeration Success",
      text: "User data was successfully entered in the system through your uploaded excel file.",
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("Excel Success Email sent to recipient", info.messageId);
    } catch (error) {
      console.error(error);
    }
  },

  sendExcelFailEmail: async (recipientEmail, excelPath) => {
    const mailOptions = {
      from: process.env.emailUser,
      to: recipientEmail,
      subject: "Bulk User Registeration Error",
      text: "User data from your excel file did not upload completely due to some missing/corrupt data in some rows. Please find the error rows in the excel file attached",
      attachments: [{ filename: "FailedEntries.xlsx", path: excelPath }],
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("Excel Fail Email sent to recipient", info.messageId);
    } catch (error) {
      console.error(error);
    }
  },

  checkPermissions: (permissions, permissionCatergory, permissionSubCategory) => {
    let permissionStatus = false;
    permissions.permissions.map((obj) => {
      if (obj.value === permissionCatergory) {
        obj.subPermissions.map((subObj) => {
          if (subObj.value === permissionSubCategory) {
            permissionStatus = subObj.checked;
            return permissionStatus;
          }
        });
      }
    });
    return permissionStatus;
  },

  sendTimeSheetStatusEmail: async (email, timesheetStatus, reason, weekNumber, startDate, endDate, userName) => {
    try {
      let subject = "";
      let message = "";

      if (timesheetStatus === "Approved") {
        subject = "Your timesheet request has been approved";
        message = `Dear Employee,<br><br>Your timesheet of Week ${weekNumber} (${startDate} to ${endDate}) has been approved by ${userName}.<br> Please check your DaftarPro account for further details.<br><br>Best regards,<br>DaftarPro Team`;
      } else if (timesheetStatus === "Declined") {
        subject = "Your timesheet request has been declined";
        message = `Dear Employee,<br><br>Unfortunately, your timesheet of Week ${weekNumber} (${startDate} to ${endDate}) has been declined due to the following reason:<br><br> "${reason}" -- ${userName}.<br><br> Please check your DaftarPro account for further details.<br><br>Best regards,<br>DaftarPro Team`;
      } else {
        throw new Error("Invalid status parameter");
      }

      const mailOptions = {
        from: process.env.emailUser, // sender address
        to: email, // list of receivers
        subject: subject,
        text: `Your Timesheet request has been ${timesheetStatus}`,
        html: message,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("Timesheet status email sent to user");
    } catch (error) {
      console.error(error);
    }
  },
};

module.exports = methods;
