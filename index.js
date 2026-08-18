"use strict";
require("dotenv").config();

// const morganMiddleware = require("./middleware/morgan.middleware");

// The morgan middleware does not need this.
// This is for a manual log

// Add the morgan middleware

//let port = process.env.PORT;
const Router = require("./routes/index");
var mongoose = require("mongoose");
var cors = require("cors");
const cronJob = require("node-cron");

//eslint-disable-next-line
const fs = require("fs");
// const fs = require('fs');
//eslint-disable-next-line
const formidable = require("formidable");
// const formidable = require('formidable')

const express = require("express");

const app = express();

const { errors } = require("celebrate");

var bodyParser = require("body-parser");
//eslint-disable-next-line
var jsonParser = bodyParser.json();

//ignore this line
//eslint-disable-next-line
var urlencodedParser = bodyParser.urlencoded({ extended: false });

app.use(cors());

app.use(express.json());

// app.use(morganMiddleware);

const dbName = process.env.DB_NAME;
mongoose.connect(process.env.DB_URL, {
  useNewUrlParser: true,
  // useFindAndModify: true,
  useUnifiedTopology: true,
  writeConcern: { w: "majority", j: true, wtimeout: 1000 },
  dbName,
});
const db = mongoose.connection;

db.on("error", console.error.bind(console, "Connection Error: "));
db.once("open", function () {
  console.log("---Connected To Database---");
});

// const { attendanceCheckOut } = require("./cronJob/cronJob.js");
// const { absentScenario } = require("./cronJob/cronJob.js");
const { attendanceCheckingOutScenario, scheduleCronJobs } = require("./cronJob/cronJob");

// cronJob.schedule("30 19 * * 1-5", attendanceCheckOut);
// cronJob.schedule("30 19 * * 1-5", absentScenario);

cronJob.schedule("0 * * * *", attendanceCheckingOutScenario);
scheduleCronJobs();
//cronJob.schedule("0 * * * 1-5", absentScenario);

app.use("/", Router);
app.use(errors());

var port = process.env.PORT || 3001;

var env = process.env.NODE_ENV;

if (env == "development") {
  app.listen(process.env.PORT, (err) => {
    if (err) console.log("err");
    console.log(`Running on http://localhost:${process.env.PORT} in ${env} mode`);
  });
} else {
  console.log("now in production");
  app.listen(process.env.PORT, (err) => {
    if (err) console.log("err");
    console.log(`Running on http://localhost:${process.env.PORT} in ${env} mode`);
  });
}
