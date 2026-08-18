let Team = require("../models/team.model");
let Permission = require("../models/permissions.model");
let User = require("../models/user.model");
let services = require("../utils/services");

let methods = {
  viewReport: async (req, res) => {
    try {
      let companyId = req.token.companyId;
      let allEmployees = await User.find({
        companyId: companyId,
        deleted: false,
      });
      let totalEmployees = await User.find({
        companyId: companyId,
      });

      // Extract salaries from each employee object
      let totalEmployee = totalEmployees.length;
      let employeeLeft = totalEmployee - allEmployees.length;
      let employeeLeftNow = totalEmployee - employeeLeft;
      let salaries = allEmployees.map((employee) => parseFloat(employee.salary)).filter((salary) => !isNaN(salary));
      let birthDates = allEmployees.map((employee) => new Date(employee.dateOfBirth));

      // Get the current date
      let currentDate = new Date();

      // Calculate ages
      let ages = birthDates.map((birthdate) => {
        let ageDiffMs = currentDate - birthdate;
        let ageDate = new Date(ageDiffMs); // milliseconds from epoch
        return Math.abs(ageDate.getUTCFullYear() - 1970);
      });

      // Calculate total salary
      let totalSalary = salaries.reduce((acc, salary) => acc + salary, 0);

      // Calculate average salary
      let averageSalary = totalSalary / allEmployees.length;
      let ageFilter = req.query.ageFilter;
      if (ageFilter) {
        let [minAge, maxAge] = ageFilter.split("-");
        ages = ages.filter((age) => age >= parseInt(minAge) && age <= parseInt(maxAge));
      }

      return res.status(200).json({
        totalEmployee: totalEmployee,
        employeeLeft: employeeLeftNow,
        averageSalary: averageSalary,
        age: ages,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to view all users",
        error: error.message,
        success: false,
      });
    }
  },

  viewReportTeamWise: async (req, res) => {
    try {
      let companyId = req.token.companyId;
      let teamName = req.query.teamName; // Assuming teamName is in the request params

      if (!teamName) {
        return res.status(400).json({
          msg: "Missing teamName in the request params",
          success: false,
        });
      }

      // Step 1: Find the team ID based on the provided teamName
      let team = await Team.findOne({
        companyId: companyId,
        teamName: teamName,
      });

      if (!team) {
        return res.status(404).json({
          msg: "Team not found for the specified teamName",
          success: false,
        });
      }

      let teamId = team._id;

      // Step 2: Find all users belonging to the team based on the team ID
      let teamMembers = await User.find({
        companyId: companyId,
        teamId: teamId,
        deleted: false,
      });

      if (!teamMembers || teamMembers.length === 0) {
        return res.status(404).json({
          msg: "No team members found for the specified team",
          success: false,
        });
      }
      let userNames = teamMembers.map((member) => member.fullName); // Assuming the field name for user name is 'name'

      const totalExperiences = teamMembers.map((member) => {
        const experienceArr = member.experience.map((exp) => exp.duration.split("-").map(Number));
        const max = Math.max(...experienceArr.flat());
        const min = Math.min(...experienceArr.flat());
        return max - min;
      });

      // const averageExperience = totalExperiences.reduce((acc, curr) => acc + curr, 0) / totalExperiences.length;

      console.log("Total experiences for each user:", totalExperiences);
      // console.log("Average experience across all users:", averageExperience);

      return res.status(200).json({
        teamMembers: userNames,
        experience: totalExperiences,
        // Add other calculated values here
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to view team-wise report",
        error: error.message,
        success: false,
      });
    }
  },
};

module.exports = methods;
