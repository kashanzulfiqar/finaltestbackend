var mongoose = require("mongoose");
const User = require("../models/user.model");

(async function databaseMigrations() {
  try {
    console.log(`--------Script started-------`);

    await mongoose.connect(
      // DB URL Here

      {
        useNewUrlParser: true,
        // useFindAndModify: true,
        useUnifiedTopology: true,
        writeConcern: { w: "majority", j: true, wtimeout: 1000 },

        // DB Name here
      }
    );

    let usersToUpdate = await User.updateMany(
      {
        deleted: true,
        employeeExitDate: { $exists: false },
      },
      {
        $set: {
          employeeExitDate: "2023-12-20",
        },
      }
    );

    let employee = await User.updateMany(
      { employeeType: { $exists: false } }, // Condition to select documents where employeeType does not exist
      {
        $set: {
          employeeType: "Full-Time", // Set employeeType
        },
      }
    );

    mongoose.connection.close((err) => {
      console.error("Error closing mongoose connection", err);
    });

    console.log("Done........");

    process.exit(0);
  } catch (err) {
    console.log(err);
  }
})();
