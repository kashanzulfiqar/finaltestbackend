const { celebrate, Joi } = require("celebrate");

const methods = {
  addCompany: celebrate({
    body: Joi.object({
      companyName: Joi.string().min(1).max(50).required(),
      legalName: Joi.string().min(1).max(50).required(),
      contactPerson: Joi.string().min(3).max(50).optional(),
      companyAddress: Joi.string().min(5).max(500).required(),
      imageUrl: Joi.string().min(0).max(500).optional(),
      preferredCurrency: Joi.string().min(0).max(500).optional(),
      postalCode: Joi.string().pattern(/^\d+$/).min(3).max(50).optional(),
      financeHead: Joi.string().min(2).max(150).optional(),
      city: Joi.string().min(3).max(50).required(),
      state: Joi.string().min(3).max(50).required(),
      country: Joi.string().min(3).max(50).required(),
      companyEmail: Joi.string().email().min(5).max(60).required(),
      companyPhoneNo: Joi.string().min(5).max(20).required(),
      mobileNumber: Joi.string().min(5).max(20).required(),
      fax: Joi.string().min(5).max(20).optional(),
      website: Joi.string().min(3).max(50).required(),
      companyRegistrationNo: Joi.string().min(3).max(50).required(),
      deleted: Joi.boolean().optional(),
      disabled: Joi.boolean().optional(),
      agreeTermsAndConditions: Joi.boolean().required(),
      absentDeduction: Joi.boolean().optional(),
    }),
  }),
  updateCompany: celebrate({
    body: Joi.object({
      _id: Joi.string().min(2).max(150).required(),
      companyName: Joi.string().min(1).max(50).optional(),
      legalName: Joi.string().min(1).max(50).optional(),
      contactPerson: Joi.string().min(3).max(50).optional(),
      companyAddress: Joi.string().min(5).max(500).optional(),
      imageUrl: Joi.string().min(0).max(500).optional(),
      financeHead: Joi.string().min(2).max(150).optional(),
      preferredCurrency: Joi.string().min(0).max(500).optional(),
      postalCode: Joi.string().pattern(/^\d+$/).min(3).max(50).optional(),
      city: Joi.string().min(3).max(50).optional(),
      state: Joi.string().min(3).max(50).optional(),
      country: Joi.string().min(3).max(50).optional(),
      companyEmail: Joi.string().email().min(5).max(60).optional(),
      companyPhoneNo: Joi.string().min(5).max(20).optional(),
      mobileNumber: Joi.string().min(5).max(20).optional(),
      fax: Joi.string().min(0).max(20).optional(),
      website: Joi.string().min(3).max(50).optional(),
      companyRegistrationNo: Joi.string().min(3).max(50).optional(),
      taxRegNo: Joi.string().min(0).max(50).optional(),
      deleted: Joi.boolean().optional(),
      disabled: Joi.boolean().optional(),
      agreeTermsAndConditions: Joi.boolean().optional(),
      absentDeduction: Joi.boolean().optional(),
      workingDays: Joi.array().items(
        Joi.string().valid(
          "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
        )
      ).min(1).max(7).optional(),
    }),
  }),
  addUser: celebrate({
    body: Joi.object({
      fullName: Joi.string().min(1).max(150).required(),
      dateOfBirth: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      employeeId: Joi.string().optional(),
      joiningDate: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      employeeExitDate: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      phoneNo: Joi.string().min(1).max(150).optional(),
      email: Joi.string().email().min(5).max(50).required(),
      level: Joi.string().min(1).max(150).optional(),
      password: Joi.string().min(1).max(150).required(),
      address: Joi.string().min(1).max(500).optional(),
      imageUrl: Joi.string().min(1).max(500).optional(),
      resetToken: Joi.string().default(""),
      verificationToken: Joi.string().default("").optional(),
      verified: Joi.boolean().default(false),
      firstTimeLogin: Joi.boolean().default(true),
      gender: Joi.string().min(1).max(150).valid("Male", "Female", "Other").optional(),
      employeeType: Joi.string().min(1).max(150).valid("Full-Time", "Part-Time", "Contract", "Intern").optional(),
      salaryType: Joi.string().min(1).max(150).valid('Monthly', 'Hourly', 'Unpaid').optional(),
      canBeReportedTo: Joi.boolean().default(false),
      reportsTo: Joi.string().min(1).max(150).optional(),
      bankName: Joi.string().min(1).max(150).optional(),
      bankAccountNumber: Joi.string().min(1).max(150).optional(),
      salary: Joi.string().min(1).max(150).optional(),
      sickLeaves: Joi.string().min(1).max(150).pattern(/^\d+$/).default("0"),
      casualLeaves: Joi.string().min(1).max(150).pattern(/^\d+$/).default("0"),
      workFromHomeLeaves: Joi.string().min(1).pattern(/^\d+$/).max(150).default("0"),
      bereavementLeaves: Joi.string().min(1).pattern(/^\d+$/).max(150).default("0"),
      unpaidLeaves: Joi.string().min(1).max(150).pattern(/^\d+$/).default("0"),
      paternityLeaves: Joi.string().min(1).max(150).pattern(/^\d+$/).default("0"),
      maternityLeaves: Joi.string().min(1).max(150).pattern(/^\d+$/).default("0"),
      marriageLeaves: Joi.string().min(1).max(150).pattern(/^\d+$/).default("0"),
      halfDayLeaves: Joi.string().min(1).max(150).pattern(/^\d+$/).default("0"),
      annualLeaves: Joi.string().min(1).max(150).pattern(/^\d+$/).default("0"),
      remainingLeaves: Joi.string().min(1).max(150).pattern(/^\d+$/).default("0"),
      userStatus: Joi.string().min(1).max(150).valid("Active", "In-Active").default("Active"),
      companyId: Joi.string().min(1).max(150).required(),
      teamId: Joi.string().min(1).max(150).optional(),
      designationId: Joi.string().min(1).max(150).optional(),
      nationalIdentityNumber: Joi.string().min(1).max(150).optional(),
      role: Joi.string().min(1).max(150).default(""),
      roleId: Joi.string().min(1).max(150).optional(),
      taxSlabId: Joi.string().min(1).max(150).optional(),
      shiftId: Joi.string().min(1).max(150).optional(),
      education: Joi.array().items(
        Joi.object({
          institute: Joi.string().min(1).max(150).optional(),
          degree: Joi.string().min(1).max(150).optional(),
          year: Joi.string().min(1).max(150).optional(),
        })
      ),
      experience: Joi.array().items(
        Joi.object({
          company: Joi.string().min(1).max(150).optional(),
          designation: Joi.string().min(1).max(150).optional(),
          duration: Joi.string().min(1).max(150).optional(),
        })
      ),
      emergencyContacts: Joi.array().items(
        Joi.object({
          name: Joi.string().min(1).max(150).optional(),
          relationship: Joi.string().min(1).max(150).optional(),
          phoneNo: Joi.string().min(1).max(150).optional(),
        })
      ),
      deleted: Joi.boolean().default(false),
      lastUpdatedAt: Joi.date().allow(null).optional(),
    }),
  }),
  updateUser: celebrate({
    body: Joi.object({
      _id: Joi.string().min(2).max(150).required(),
      fullName: Joi.string().min(1).max(50).optional(),
      dateOfBirth: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      employeeId: Joi.string().optional(),
      joiningDate: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      phoneNo: Joi.string().min(7).max(16).optional(),
      email: Joi.string().email().min(5).max(50).optional(),
      level: Joi.string().min(1).max(20).optional(),
      password: Joi.string().min(8).max(16).optional(),
      address: Joi.string().min(1).max(500).optional(),
      imageUrl: Joi.string().min(1).max(500).optional(),
      resetToken: Joi.string().default(""),
      verificationToken: Joi.string().default("").optional(),
      verified: Joi.boolean().default(false),
      firstTimeLogin: Joi.boolean().default(true),
      gender: Joi.string().min(1).max(30).valid("Male", "Female", "Other").optional(),
      canBeReportedTo: Joi.boolean().default(false),
      reportsTo: Joi.string().min(1).max(150).optional(),
      bankName: Joi.string().min(1).max(50).optional(),
      bankAccountNumber: Joi.string().min(1).max(100).optional(),
      salary: Joi.string().min(1).max(50).optional(),
      sickLeaves: Joi.string().min(1).max(30).default("0"),
      casualLeaves: Joi.string().min(1).max(30).default("0"),
      workFromHomeLeaves: Joi.string().min(1).max(30).default("0"),
      bereavementLeaves: Joi.string().min(1).max(30).default("0"),
      unpaidLeaves: Joi.string().min(1).max(30).default("0"),
      paternityLeaves: Joi.string().min(1).max(30).default("0"),
      maternityLeaves: Joi.string().min(1).max(30).default("0"),
      marriageLeaves: Joi.string().min(1).max(30).default("0"),
      halfDayLeaves: Joi.string().min(1).max(30).default("0"),
      annualLeaves: Joi.string().min(1).max(30).default("0"),
      remainingLeaves: Joi.string().min(1).max(30).default("0"),
      userStatus: Joi.string().min(1).max(50).valid("Active", "In-Active").default("Active"),
      companyId: Joi.string().min(1).max(150).optional(),
      teamId: Joi.string().min(1).max(150).optional(),
      designationId: Joi.string().min(1).max(150).optional(),
      nationalIdentityNumber: Joi.string().min(1).max(150).optional(),
      role: Joi.string().min(1).max(50).default(""),
      roleId: Joi.string().min(1).max(150).optional(),
      taxSlabId: Joi.string().min(1).max(150).optional(),
      shiftId: Joi.string().min(1).max(150).optional(),
      education: Joi.array().items(
        Joi.object({
          institute: Joi.string().min(1).max(100).optional(),
          degree: Joi.string().min(1).max(100).optional(),
          year: Joi.string().min(1).max(100).optional(),
        })
      ),
      experience: Joi.array().items(
        Joi.object({
          company: Joi.string().min(1).max(100).optional(),
          designation: Joi.string().min(1).max(100).optional(),
          duration: Joi.string().min(1).max(100).optional(),
        })
      ),
      emergencyContacts: Joi.array().items(
        Joi.object({
          name: Joi.string().min(1).max(150).optional(),
          relationship: Joi.string().min(1).max(150).optional(),
          phoneNo: Joi.string().min(1).max(150).optional(),
        })
      ),
      deleted: Joi.boolean().default(false),
      lastUpdatedAt: Joi.date().allow(null).optional(),
    }),
  }),

  addTaxSlab: celebrate({
    body: Joi.object({
      title: Joi.string().min(1).max(150).required(),
      yearlyPayUpperLimit: Joi.string().min(1).max(30).pattern(/^\d+$/).required(),
      yearlyPayLowerLimit: Joi.string().min(1).max(30).pattern(/^\d+$/).required(),
      monthlyTaxInPercent: Joi.string(),
      fixedYearlyTax: Joi.string().min(1).max(30).pattern(/^\d+$/).required(),
      companyId: Joi.string().min(1).max(150).optional(),
      deleted: Joi.boolean().default(false),
    }),
  }),
  updateTaxSlab: celebrate({
    body: Joi.object({
      _id: Joi.string().min(2).max(150).required(),
      title: Joi.string().min(1).max(150).optional(),
      yearlyPayUpperLimit: Joi.string().min(1).max(30).pattern(/^\d+$/).optional(),
      yearlyPayLowerLimit: Joi.string().min(1).max(30).pattern(/^\d+$/).optional(),
      monthlyTaxInPercent: Joi.string().optional(),
      fixedYearlyTax: Joi.string().min(1).max(30).pattern(/^\d+$/).optional(),
      companyId: Joi.string().min(1).max(150).optional(),
      deleted: Joi.boolean().default(false),
    }),
  }),
  addLeavePolicy: celebrate({
    body: Joi.object({
      sickLeaves: Joi.string().min(1).max(30).pattern(/^\d+$/).default("0"),
      casualLeaves: Joi.string().min(1).max(30).pattern(/^\d+$/).default("0"),
      workFromHomeLeaves: Joi.string().min(1).max(30).pattern(/^\d+$/).default("0"),
      bereavementLeaves: Joi.string().min(1).max(30).pattern(/^\d+$/).default("0"),
      unpaidLeaves: Joi.string().min(1).max(30).pattern(/^\d+$/).default("0"),
      paternityLeaves: Joi.string().min(1).max(30).pattern(/^\d+$/).default("0"),
      maternityLeaves: Joi.string().min(1).max(30).pattern(/^\d+$/).default("0"),
      marriageLeaves: Joi.string().min(1).max(30).pattern(/^\d+$/).default("0"),
      halfDayLeaves: Joi.string().min(1).max(30).pattern(/^\d+$/).default("0"),
      annualLeaves: Joi.string().min(1).max(30).pattern(/^\d+$/).default("0"),
      companyId: Joi.string().min(1).max(100).required(),
    }),
  }),
  updateLeavePolicy: celebrate({
    body: Joi.object({
      _id: Joi.string().min(2).max(150).required(),
      sickLeaves: Joi.string().min(1).max(30).pattern(/^\d+$/).default("0"),
      casualLeaves: Joi.string().min(1).max(30).pattern(/^\d+$/).default("0"),
      workFromHomeLeaves: Joi.string().min(1).max(30).pattern(/^\d+$/).default("0"),
      bereavementLeaves: Joi.string().min(1).max(30).pattern(/^\d+$/).default("0"),
      unpaidLeaves: Joi.string().min(1).max(30).pattern(/^\d+$/).default("0"),
      paternityLeaves: Joi.string().min(1).max(30).pattern(/^\d+$/).default("0"),
      maternityLeaves: Joi.string().min(1).max(30).pattern(/^\d+$/).default("0"),
      marriageLeaves: Joi.string().min(1).max(30).pattern(/^\d+$/).default("0"),
      halfDayLeaves: Joi.string().min(1).max(30).pattern(/^\d+$/).default("0"),
      annualLeaves: Joi.string().min(1).max(30).pattern(/^\d+$/).default("0"),
      companyId: Joi.string().min(1).max(100).required(),
    }),
  }),
  addDesignation: celebrate({
    body: Joi.object({
      designationName: Joi.string().min(1).max(50).required(),
      companyId: Joi.string().min(1).max(150).optional(),
    }),
  }),
  updateDesignation: celebrate({
    body: Joi.object({
      _id: Joi.string().min(2).max(150).required(),
      designationName: Joi.string().min(1).max(50).required(),
      companyId: Joi.string().min(1).max(150).optional(),
    }),
  }),
  addShift: celebrate({
    body: Joi.object({
      title: Joi.string().min(1).max(100).required(),
      startTime: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
        .required(),
      maxStartTime: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
        .required(),
      endTime: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
        .required(),
      companyId: Joi.string().min(1).max(150).optional(),
      isActive: Joi.boolean().default(true),
      deleted: Joi.boolean().default(false),
    }),
  }),
  updateShift: celebrate({
    body: Joi.object({
      _id: Joi.string().min(2).max(150).required(),
      title: Joi.string().min(1).max(100).optional(),
      startTime: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
        .optional(),
      maxStartTime: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
        .optional(),
      endTime: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
        .optional(),
      companyId: Joi.string().min(1).max(150).optional(),
      isActive: Joi.boolean().default(true),
      deleted: Joi.boolean().default(false),
    }),
  }),
  addRole: celebrate({
    body: Joi.object({
      roleName: Joi.string().min(1).max(50).required(),
      customPermissions: Joi.boolean().default(false).optional(),
      companyId: Joi.string().min(1).max(150).optional(),
    }),
  }),
  updateRole: celebrate({
    body: Joi.object({
      _id: Joi.string().min(2).max(150).required(),
      roleName: Joi.string().min(1).max(50).required(),
      customPermissions: Joi.boolean().optional(),
      companyId: Joi.string().min(1).max(150).optional(),
    }),
  }),
  addTeam: celebrate({
    body: Joi.object({
      teamName: Joi.string().min(1).max(50).required(),
      isTech: Joi.boolean().default(true),
      companyId: Joi.string().min(1).max(150).optional(),
    }),
  }),
  updateTeam: celebrate({
    body: Joi.object({
      _id: Joi.string().min(2).max(150).required(),
      teamName: Joi.string().min(1).max(50).required(),
      isTech: Joi.boolean().default(true),
      companyId: Joi.string().min(1).max(150).optional(),
    }),
  }),
};

module.exports = methods;
