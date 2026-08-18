var mongoose = require("mongoose");
// const User = require("./models/user.model");
const Role = require("./models/role.model");
const User = require("./models/user.model");
const Invoices = require("./models/invoices.model");
const Expenses = require("./models/expenses.model");
const Permission = require("./models/permissions.model");
const Projects = require("./models/projectManagement.model");
const Company = require("./models/company.model");
const Team = require("./models/team.model");
const { log } = require("console");
(async function databaseMigrations() {
  try {
    console.log(`--------Script started-------`);

    await mongoose.connect(
      `db url here`,

      {
        useNewUrlParser: true,
        // useFindAndModify: true,
        useUnifiedTopology: true,
        writeConcern: { w: "majority", j: true, wtimeout: 1000 },

        dbName: "db name here",
      }
    );

    // Retrieve the list of existing users

    // ************************* Finance and Inventory Permission Template Scripting ****************************************

    // let findUser = await User.find({});
    // let findAdmin = await Admin.find({});
    let findRole = await Role.find({});

    let roleIdArray = [];

    for (let i = 0; i < findRole.length; i++) {
      let _id = findRole[i]._id;
      roleIdArray.push(_id);
    }

    // // let adminIdArray = [];

    // // for (let i = 0; i < findAdmin.length; i++) {
    // //   let _id = findAdmin[i]._id;
    // //   adminIdArray.push(_id);
    // // }

    // // let mergedArray = userIdArray.concat(adminIdArray);
    // // let uniqueArray = Array.from(new Set(mergedArray));

    // // console.log(uniqueArray);

    // const newPermissionObject = {
    //   _id: "658a96ec0cfc86445d82d28c",
    //   title: "Timesheet Management",
    //   description: "Permission to add, view, update and delete Timesheets",
    //   value: "timesheetManagement",
    //   subPermissions: [
    //     {
    //       title: "Manage Timesheet",
    //       value: "timesheetManagement",
    //       description: "Permission to add, view, update and delete Timesheets",
    //       checked: false,
    //       _id: "658a96ec0cfc86445d82d28d",
    //     },
    //   ],
    // };
    const newPermissionObject = {
      title: "Report Management",
      description: "Permission to view Reports",
      value: "reportManagement",
      subPermissions: [
        {
          title: "Report Timesheet",
          value: "reportManagement",
          description: "Permission to view Reports",
          checked: false,
          _id: "658e9825a17cf3860ebc588c",
        },
      ],
      _id: "658e9825a17cf3860ebc588b",
    };

    // {
    //   _id: "6569824bafcb1036a217d3ab",
    //   title: "Expense Management",
    //   description: "Permission to add, view, update and delete expenses",
    //   value: "expenseManagement",
    //   subPermissions: [
    //     {
    //       title: "Manage Expenses",
    //       value: "expenseManagement",
    //       description: "Permission to add, view, update and delete expenses",
    //       checked: false,
    //       _id: "6569824bafcb1036a217d3ac",
    //     },
    //   ],
    // };

    for (let i = 0; i < roleIdArray.length; i++) {
      await Permission.updateMany({ roleId: roleIdArray[i] }, { $push: { permissions: newPermissionObject } });
    }

    ////////////////////////////================update or add field in Model=======================//////

    // let projects = await Projects.updateMany(
    //   { currency: { $exists: false } }, // Condition to select documents where currency does not exist
    //   {
    //     $set: {
    //       currency: "", // Set currency field to an empty string
    //     },
    //   }
    // );

    // let teams = await Team.updateMany(
    //   { isTech: { $exists: false } }, // Condition to select documents where isTech does not exist
    //   {
    //     $set: {
    //       isTech: true, // Set isTech field to true or False
    //     },
    //   }
    // );

    let usersToUpdate = await User.updateMany(
      {
        deleted: true,
        employeeExitDate: { $exists: false },
      },
      {
        $set: {
          employeeExitDate: "2023-12-29",
        },
      }
    );

    let employee = await User.updateMany(
      { employeeType: { $exists: false } }, // Condition to select documents where employeeType does not exist
      {
        $set: {
          employeeType: "Contract", // Set employeeType field to true or False
        },
      }
    );

    mongoose.connection.close((err) => {
      console.error("Error closing mongoose connection", err);
    });

    console.log("Done...");

    process.exit(0);
  } catch (err) {
    console.log(err);
  }
})();
