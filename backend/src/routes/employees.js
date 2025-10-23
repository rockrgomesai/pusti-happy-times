/**
 * Employee Routes
 * Pusti Happy Times - Employee Management Endpoints
 *
 * Follows the same pattern as other master data modules with
 * CRUD operations, pagination, validation, and audit handling.
 */

const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const { authenticate, requireApiPermission } = require("../middleware/auth");
const { Employee } = require("../models");

const router = express.Router();

const employeeSchema = Employee.schema;
const genderEnums = employeeSchema.path("gender").enumValues;
const religionEnums = employeeSchema.path("religion").enumValues;
const maritalEnums = employeeSchema.path("marital_status").enumValues;
const bloodEnums = employeeSchema.path("blood_group").enumValues;
const divisionEnums = employeeSchema.path("permanent_address.division").enumValues;
const districtEnums = employeeSchema.path("permanent_address.district").enumValues;

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: errors.array(),
    });
  }
  next();
};

const normalizeNullableString = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return value;
};

const parseNullableDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const basePaginationValidation = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 500 }).toInt(),
  query("search").optional().isLength({ max: 200 }).trim(),
  query("sort").optional().isIn(["name", "employee_id", "date_birth", "created_at"]),
  query("order").optional().isIn(["asc", "desc"]),
];

const employeeValidation = [
  body("employee_id").trim().notEmpty().withMessage("Employee ID is required"),
  body("employee_type")
    .notEmpty()
    .withMessage("Employee type is required")
    .isIn(["system_admin", "field", "facility", "hq"])
    .withMessage("Invalid employee type"),
  body("designation_id")
    .notEmpty()
    .withMessage("Designation is required")
    .bail()
    .isMongoId()
    .withMessage("Invalid designation ID"),
  body("name").trim().notEmpty().withMessage("Employee name is required"),
  body("date_birth")
    .notEmpty()
    .withMessage("Date of birth is required")
    .bail()
    .isISO8601()
    .withMessage("Date of birth must be a valid date"),
  body("gender")
    .notEmpty()
    .withMessage("Gender is required")
    .isIn(genderEnums)
    .withMessage("Invalid gender"),
  body("religion")
    .notEmpty()
    .withMessage("Religion is required")
    .isIn(religionEnums)
    .withMessage("Invalid religion"),
  body("marital_status")
    .notEmpty()
    .withMessage("Marital status is required")
    .isIn(maritalEnums)
    .withMessage("Invalid marital status"),
  body("nationality").optional({ checkFalsy: true }).isString().trim(),
  body("national_id").optional({ checkFalsy: true }).isString().trim(),
  body("passport_number").optional({ checkFalsy: true }).isString().trim(),
  body("passport_issue_date")
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage("Passport issue date must be a valid date"),
  body("mobile_personal")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Mobile number must be a string"),
  body("email").optional({ checkFalsy: true }).isEmail().withMessage("Invalid email"),
  body("emergency_contact").optional({ checkFalsy: true }).isString(),
  body("emergency_mobile").optional({ checkFalsy: true }).isString(),
  body("blood_group")
    .optional({ checkFalsy: true })
    .isIn(bloodEnums)
    .withMessage("Invalid blood group"),
  body("present_address.holding_no").optional({ checkFalsy: true }).isString(),
  body("present_address.road").optional({ checkFalsy: true }).isString(),
  body("present_address.city").optional({ checkFalsy: true }).isString(),
  body("present_address.post_code")
    .optional({ checkFalsy: true })
    .isInt()
    .withMessage("Post code must be a number")
    .toInt(),
  body("permanent_address.holding_no").optional({ checkFalsy: true }).isString(),
  body("permanent_address.village_road").optional({ checkFalsy: true }).isString(),
  body("permanent_address.union_ward").optional({ checkFalsy: true }).isString(),
  body("permanent_address.upazila_thana").optional({ checkFalsy: true }).isString(),
  body("permanent_address.district")
    .optional({ checkFalsy: true })
    .isIn(districtEnums)
    .withMessage("Invalid district"),
  body("permanent_address.division")
    .optional({ checkFalsy: true })
    .isIn(divisionEnums)
    .withMessage("Invalid division"),
  body("ssc_year")
    .optional({ checkFalsy: true })
    .isInt({ min: 1900, max: 2100 })
    .withMessage("SSC year must be between 1900 and 2100")
    .toInt(),
  body("highest_degree").optional({ checkFalsy: true }).isString().trim(),
  body("last_organization").optional({ checkFalsy: true }).isString().trim(),
  body("last_position").optional({ checkFalsy: true }).isString().trim(),
  body("experience_years")
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage("Experience years must be zero or positive")
    .toInt(),
  body("reference_name").optional({ checkFalsy: true }).isString().trim(),
  body("reference_mobile").optional({ checkFalsy: true }).isString().trim(),
  body("remarks").optional({ checkFalsy: true }).isString(),
  body("active").optional().isBoolean().toBoolean(),
];

const idValidation = [param("id").isMongoId().withMessage("Invalid employee ID format")];

const getCurrentUserId = (req) => req.user?.id || req.user?._id;

const buildEmployeePayload = (data, userId, isCreate = false) => {
  const {
    employee_id,
    designation_id,
    name,
    father_name,
    mother_name,
    date_birth,
    gender,
    religion,
    marital_status,
    nationality,
    national_id,
    passport_number,
    passport_issue_date,
    mobile_personal,
    email,
    emergency_contact,
    emergency_mobile,
    blood_group,
    present_address = {},
    permanent_address = {},
    ssc_year,
    highest_degree,
    last_organization,
    last_position,
    experience_years,
    reference_name,
    reference_mobile,
    remarks,
    active,
  } = data;

  const payload = {
    employee_id,
    designation_id,
    name,
    father_name: normalizeNullableString(father_name),
    mother_name: normalizeNullableString(mother_name),
    date_birth: new Date(date_birth),
    gender,
    religion,
    marital_status,
    nationality: normalizeNullableString(nationality) || "Bangladeshi",
    national_id: normalizeNullableString(national_id),
    passport_number: normalizeNullableString(passport_number),
    passport_issue_date: parseNullableDate(passport_issue_date),
    mobile_personal: normalizeNullableString(mobile_personal),
    email: normalizeNullableString(email),
    emergency_contact: normalizeNullableString(emergency_contact),
    emergency_mobile: normalizeNullableString(emergency_mobile),
    blood_group: normalizeNullableString(blood_group),
    present_address: {
      holding_no: normalizeNullableString(present_address.holding_no),
      road: normalizeNullableString(present_address.road),
      city: normalizeNullableString(present_address.city),
      post_code:
        present_address.post_code === undefined || present_address.post_code === null
          ? null
          : Number(present_address.post_code),
    },
    permanent_address: {
      holding_no: normalizeNullableString(permanent_address.holding_no),
      village_road: normalizeNullableString(permanent_address.village_road),
      union_ward: normalizeNullableString(permanent_address.union_ward),
      upazila_thana: normalizeNullableString(permanent_address.upazila_thana),
      district: normalizeNullableString(permanent_address.district),
      division: normalizeNullableString(permanent_address.division),
    },
    ssc_year: ssc_year === undefined || ssc_year === null ? null : Number(ssc_year),
    highest_degree: normalizeNullableString(highest_degree),
    last_organization: normalizeNullableString(last_organization),
    last_position: normalizeNullableString(last_position),
    experience_years:
      experience_years === undefined || experience_years === null ? 0 : Number(experience_years),
    reference_name: normalizeNullableString(reference_name),
    reference_mobile: normalizeNullableString(reference_mobile),
    remarks: normalizeNullableString(remarks),
    active: typeof active === "undefined" ? true : Boolean(active),
    updated_by: userId,
    updated_at: new Date(),
  };

  if (isCreate) {
    payload.created_by = userId;
    payload.created_at = new Date();
  }

  return payload;
};

// GET /api/employees/meta - enumeration metadata
router.get("/meta", authenticate, requireApiPermission("employees:read"), (req, res) => {
  res.json({
    success: true,
    data: {
      genders: genderEnums,
      religions: religionEnums,
      maritalStatuses: maritalEnums,
      bloodGroups: bloodEnums,
      divisions: divisionEnums,
      districts: districtEnums,
      defaultNationality: employeeSchema.path("nationality").defaultValue || "Bangladeshi",
    },
  });
});

// GET /api/employees
router.get(
  "/",
  authenticate,
  requireApiPermission("employees:read"),
  basePaginationValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 10, search, sort = "name", order = "asc" } = req.query;

      const pageNumber = Math.max(Number(page) || 1, 1);
      const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 500);
      const skip = (pageNumber - 1) * limitNumber;

      const queryFilter = {};
      if (search) {
        const regex = new RegExp(search, "i");
        queryFilter.$or = [
          { name: regex },
          { employee_id: regex },
          { national_id: regex },
          { passport_number: regex },
        ];
      }

      const sortFieldMap = {
        name: { name: order === "asc" ? 1 : -1 },
        employee_id: { employee_id: order === "asc" ? 1 : -1 },
        date_birth: { date_birth: order === "asc" ? 1 : -1 },
        created_at: { created_at: order === "asc" ? 1 : -1 },
      };

      const sortOption = sortFieldMap[sort] || sortFieldMap.name;

      const [employees, totalCount] = await Promise.all([
        Employee.find(queryFilter)
          .sort(sortOption)
          .skip(skip)
          .limit(limitNumber)
          .populate("designation_id", "name"),
        Employee.countDocuments(queryFilter),
      ]);

      const totalPages = Math.max(1, Math.ceil(totalCount / limitNumber));

      res.json({
        success: true,
        data: employees,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          totalCount,
          totalPages,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching employees",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// GET /api/employees/:id
router.get(
  "/:id",
  authenticate,
  requireApiPermission("employees:read"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const employee = await Employee.findById(req.params.id).populate("designation_id", "name");

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee not found",
        });
      }

      res.json({ success: true, data: employee });
    } catch (error) {
      console.error("Error fetching employee:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching employee",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// POST /api/employees
router.post(
  "/",
  authenticate,
  requireApiPermission("employees:create"),
  employeeValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const currentUserId = getCurrentUserId(req);

      const existing = await Employee.findOne({ employee_id: req.body.employee_id });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Employee ID already exists",
        });
      }

      const payload = buildEmployeePayload(req.body, currentUserId, true);
      const employee = new Employee(payload);
      await employee.save();

      await employee.populate("designation_id", "name");

      res.status(201).json({
        success: true,
        message: "Employee created successfully",
        data: employee,
      });
    } catch (error) {
      console.error("Error creating employee:", error);

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Employee with provided unique field already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error creating employee",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// PUT /api/employees/:id
router.put(
  "/:id",
  authenticate,
  requireApiPermission("employees:update"),
  idValidation,
  employeeValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const currentUserId = getCurrentUserId(req);

      const duplicate = await Employee.findOne({
        employee_id: req.body.employee_id,
        _id: { $ne: id },
      });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "Employee ID already exists",
        });
      }

      const payload = buildEmployeePayload(req.body, currentUserId, false);

      const employee = await Employee.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
      }).populate("designation_id", "name");

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee not found",
        });
      }

      res.json({
        success: true,
        message: "Employee updated successfully",
        data: employee,
      });
    } catch (error) {
      console.error("Error updating employee:", error);

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Employee with provided unique field already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error updating employee",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// DELETE /api/employees/:id
router.delete(
  "/:id",
  authenticate,
  requireApiPermission("employees:delete"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const employee = await Employee.findById(req.params.id);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee not found",
        });
      }

      await Employee.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: "Employee deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting employee:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting employee",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
