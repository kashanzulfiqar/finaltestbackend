const mongoose = require("mongoose");
const userModel = require("../models/user.model");
const leavePolicyModel = require("../models/leavePolicy.model");
const requestModel = require("../models/requests.model");

async function migrateAndCalculateLeaves(startDate, endDate) {
  let session;

  try {
    console.log(`-------- Script started --------`);

    // Connect to the database
    await mongoose.connect(
      "db_url",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        writeConcern: { w: "majority", j: true, wtimeout: 1000 },
        dbName: "db_name",
      }
    );

    session = await mongoose.startSession();
    session.startTransaction();

    console.log("Connected to database");

    // Fetch all users and their leave policies
    const users = await userModel.find().session(session);
    for (const user of users) {
      const leavePolicy = await leavePolicyModel
        .findOne({ companyId: user.companyId })
        .session(session);

      if (!leavePolicy) {
        console.log(`No leave policy found for user ${user._id}`);
        continue;
      }

      // Set leave policies based on gender
      const updatedFields = {
        sickLeaves: leavePolicy.sickLeaves,
        casualLeaves: leavePolicy.casualLeaves,
        workFromHomeLeaves: leavePolicy.workFromHomeLeaves,
        bereavementLeaves: leavePolicy.bereavementLeaves,
        unpaidLeaves: leavePolicy.unpaidLeaves,
        marriageLeaves: leavePolicy.marriageLeaves,
        halfDayLeaves: leavePolicy.halfDayLeaves,
        annualLeaves: leavePolicy.annualLeaves,
      };

      if (user.gender === "Male") {
        updatedFields.paternityLeaves = leavePolicy.paternityLeaves;
        updatedFields.maternityLeaves = "0";
      } else if (user.gender === "Female") {
        updatedFields.maternityLeaves = leavePolicy.maternityLeaves;
        updatedFields.paternityLeaves = "0";
      }

      // Calculate allotted leaves as the sum of allocated leaves
      const allotedLeaves = Object.entries(updatedFields)
      .filter(([key]) => key !== 'workFromHomeLeaves')
      .reduce(
        (acc, [,val]) => acc + parseInt(val || "0"),
        0
      );
      updatedFields.allotedLeaves = allotedLeaves.toString();

      // Find approved requests for the current user in the date range
      const requests = await requestModel.find({
        userId: user._id,
        status: { $in: ["Approved", "Pending"] },
        startDate: { $gte: startDate },
        endDate: { $lte: endDate },
        deleted: false
      }).session(session);

      // Initialize leave counts
      const leaveCounts = {
        sick: 0,
        casual: 0,
        wfh: 0,
        bereavement: 0,
        unpaid: 0,
        paternity: 0,
        maternity: 0,
        marriage: 0,
        half: 0,
        annual: 0,
      };

      // Calculate leave counts by leave type
      requests?.forEach(request => {
        const type = request.leaveType;
        if (leaveCounts[type] !== undefined) {
          leaveCounts[type] += parseInt(request.totalDays || "0");
        }
      });

      // Update taken leave fields and calculate total leaves taken
      const takenFields = {
        takenSickLeaves: leaveCounts.sick.toString(),
        takenCasualLeaves: leaveCounts.casual.toString(),
        takenWorkFromHomeLeaves: leaveCounts.wfh.toString(),
        takenBereavementLeaves: leaveCounts.bereavement.toString(),
        takenUnpaidLeaves: leaveCounts.unpaid.toString(),
        takenMarriageLeaves: leaveCounts.marriage.toString(),
        takenHalfDayLeaves: leaveCounts.half.toString(),
        takenAnnualLeaves: leaveCounts.annual.toString(),
      };

      if (user.gender === "Male") {
        takenFields.takenPaternityLeaves = leaveCounts.paternity.toString();
        takenFields.takenMaternityLeaves = "0";
      } else if (user.gender === "Female") {
        takenFields.takenMaternityLeaves = leaveCounts.maternity.toString();
        takenFields.takenPaternityLeaves = "0";
      }

      const leavesTaken = Object.entries(leaveCounts)      
      .filter(([key]) => key !== 'wfh')
      .reduce(
        (acc, [,val]) => acc + val,
        0
      );
      takenFields.takenLeaves = leavesTaken.toString();

      // Calculate remaining leaves for each type and total remaining
      const remainingFields = {
        remainingSickLeaves: Math.max((parseInt(updatedFields.sickLeaves || "0") - leaveCounts.sick), 0).toString(),
        remainingCasualLeaves: Math.max((parseInt(updatedFields.casualLeaves || "0") - leaveCounts.casual), 0).toString(),
        remainingWorkFromHomeLeaves: Math.max((parseInt(updatedFields.workFromHomeLeaves || "0") - leaveCounts.wfh), 0).toString(),
        remainingBereavementLeaves: Math.max((parseInt(updatedFields.bereavementLeaves || "0") - leaveCounts.bereavement), 0).toString(),
        remainingUnpaidLeaves: Math.max((parseInt(updatedFields.unpaidLeaves || "0") - leaveCounts.unpaid), 0).toString(),
        remainingMarriageLeaves: Math.max((parseInt(updatedFields.marriageLeaves || "0") - leaveCounts.marriage), 0).toString(),
        remainingHalfDayLeaves: Math.max((parseInt(updatedFields.halfDayLeaves || "0") - leaveCounts.half), 0).toString(),
        remainingAnnualLeaves: Math.max((parseInt(updatedFields.annualLeaves || "0") - leaveCounts.annual), 0).toString(),
      };
      
      if (user.gender === "Male") {
        remainingFields.remainingPaternityLeaves = Math.max((parseInt(updatedFields.paternityLeaves || "0") - leaveCounts.paternity), 0).toString();
        remainingFields.remainingMaternityLeaves = "0";
      } else if (user.gender === "Female") {
        remainingFields.remainingMaternityLeaves = Math.max((parseInt(updatedFields.maternityLeaves || "0") - leaveCounts.maternity), 0).toString();
        remainingFields.remainingPaternityLeaves = "0";
      }

      const totalRemainingLeaves = Object.entries(remainingFields)      
      .filter(([key]) => key !== 'remainingWorkFromHomeLeaves')
      .reduce(
        (acc, [,val]) => acc + parseInt(val || "0"),
        0
      );
      remainingFields.remainingLeaves = totalRemainingLeaves.toString();

      // Merge updated fields, taken fields, and remaining fields for final update
      const finalUpdateFields = { ...updatedFields, ...takenFields, ...remainingFields };

      // Update user with new leave values and taken leaves
      await userModel.updateOne(
        { _id: user._id },
        { $set: finalUpdateFields }
      ).session(session);
    }

    await session.commitTransaction();
    console.log("The script ran successfully.");

    session.endSession(); // End the session

    // Close the mongoose connection
    mongoose.connection.close((err) => {
      if (err) {
        console.error("Error closing mongoose connection", err);
      } else {
        console.log("Mongoose connection closed");
      }
    });

    process.exit(0);
  } catch (err) {
    if (session) {
      await session.abortTransaction();
      session.endSession(); // End the session even if there was an error
    }
    console.error("Error during migration:", err);
    process.exit(1);
  }
}

// Example usage
migrateAndCalculateLeaves("2024-01-01", "2024-12-31");
