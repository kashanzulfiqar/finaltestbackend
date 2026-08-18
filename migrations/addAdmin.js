const mongoose = require("mongoose");
let Admin = require("../models/superAdmin.model");

(async function databaseMigrations() {
  try {
    console.log(`--------Script started-------`);

    // Replace 'db_url' with your MongoDB connection string
    await mongoose.connect(
      `url_here`,
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        writeConcern: { w: "majority", j: true, wtimeout: 1000 },
        dbName: "db_name", // Replace 'db_name' with your actual database name
      }
    );

    const adminObjects = [
      {
        fullName: "name ",
        phoneNo: "+92xxxxxxx",
        email: "swampleemail@email",
        password: "paste-the-hashed-passoword",
        resetToken: "",
        verificationToken: "",
        imageUrl: "paste-the-img-url",
        gender: "Male",
        deleted: false,
        superAdmin: true,
        newPassword: "",
        verificationTokenExpires: null,
      },
      {
        fullName: "New Admin",
        phoneNo: "+92xxxxxx",
        email: "swampleemail@email",
        password: "paste-the-hashed-passoword",
        resetToken: "",
        verificationToken: "",
        imageUrl: "paste-the-img-url",
        gender: "Male",
        deleted: false,
        superAdmin: true,
        newPassword: "",
        verificationTokenExpires: null,
      },
    ];

    let addAdmins = await Admin.insertMany(adminObjects);
    console.log("Admins added successfully:", addAdmins);

    mongoose.connection.close((err) => {
      if (err) {
        console.error("Error closing mongoose connection", err);
      } else {
        console.log("Mongoose connection closed successfully.");
      }
    });

    console.log("Migration completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Error during migration:", err);

    mongoose.connection.close((err) => {
      if (err) {
        console.error("Error closing mongoose connection", err);
      }
    });

    process.exit(1); // Exit with error
  }
})();
