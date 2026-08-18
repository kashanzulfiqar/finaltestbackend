var mongoose = require("mongoose");
const Role = require("../models/role.model");
const Permission = require("../models/permissions.model");
(async function databaseMigrations() {
  try {
    console.log(`--------Script started-------`);

    await mongoose.connect(
      // DB URL here
      {
        useNewUrlParser: true,
        // useFindAndModify: true,
        useUnifiedTopology: true,
        writeConcern: { w: "majority", j: true, wtimeout: 1000 },

        //DB name here
      }
    );

    // Retrieve the list of existing users

    // let findUser = await User.find({});
    // let findAdmin = await Admin.find({});
    let findRole = await Role.find({});

    let roleIdArray = [];

    for (let i = 0; i < findRole.length; i++) {
      let _id = findRole[i]._id;
      roleIdArray.push(_id);
    }

    const newPermissionObject = {
        "title": "Leads Management",
        "description": "Permission to add, view, update and delete leads",
        "value": "leadsManagement",
        "subPermissions": [
            {
                "title": "Leads Management",
                "value": "leadsManagement",
                "description": "Permission to add, view, update and delete leads",
                "checked": false,
                "_id": "66741a4f61e2b637e1b69262"
            }
        ],
        "_id": "66741a4f61e2b637e1b69261",
    };

    for (let i = 0; i < roleIdArray.length; i++) {
      await Permission.updateMany({ roleId: roleIdArray[i] }, { $push: { permissions: newPermissionObject } });
    }

    mongoose.connection.close((err) => {
      console.error("Error closing mongoose connection", err);
    });

    console.log("Done...");

    process.exit(0);
  } catch (err) {
    console.log(err);
  }
})();
