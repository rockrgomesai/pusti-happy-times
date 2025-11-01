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
  body("facility_id")
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage("Invalid facility ID format"),
  body("factory_store_id")
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage("Invalid factory store ID format"),
];

// Partial update validation (for context updates from user management)
const employeePartialValidation = [
  body("employee_id").optional().trim().notEmpty().withMessage("Employee ID cannot be empty"),
  body("employee_type")
    .optional()
    .isIn(["system_admin", "field", "facility", "hq"])
    .withMessage("Invalid employee type"),
  body("designation_id").optional().isMongoId().withMessage("Invalid designation ID"),
  body("name").optional().trim().notEmpty().withMessage("Employee name cannot be empty"),
  body("date_birth").optional().isISO8601().withMessage("Date of birth must be a valid date"),
  body("gender").optional().isIn(genderEnums).withMessage("Invalid gender"),
  body("religion").optional().isIn(religionEnums).withMessage("Invalid religion"),
  body("marital_status").optional().isIn(maritalEnums).withMessage("Invalid marital status"),
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
  body("facility_id")
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage("Invalid facility ID format"),
  body("factory_store_id")
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage("Invalid factory store ID format"),
  // Territory assignments (for field roles)
  body("territory_assignments").optional().isObject(),
  body("territory_assignments.zone_ids")
    .optional()
    .isArray()
    .withMessage("zone_ids must be an array"),
  body("territory_assignments.region_ids")
    .optional()
    .isArray()
    .withMessage("region_ids must be an array"),
  body("territory_assignments.area_ids")
    .optional()
    .isArray()
    .withMessage("area_ids must be an array"),
  body("territory_assignments.db_point_ids")
    .optional()
    .isArray()
    .withMessage("db_point_ids must be an array"),
  body("territory_assignments.all_territory_ids")
    .optional()
    .isArray()
    .withMessage("all_territory_ids must be an array"),
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
    employee_type,
    territory_assignments,
    facility_id,
    factory_store_id, // NEW: Factory store for Production role employees
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

  // Add employee type context fields
  if (employee_type) {
    payload.employee_type = employee_type;
  }

  if (territory_assignments) {
    payload.territory_assignments = territory_assignments;
  }

  if (facility_id) {
    payload.facility_id = facility_id;
  }

  if (factory_store_id) {
    payload.factory_store_id = factory_store_id;
  }

  if (isCreate) {
    payload.created_by = userId;
    payload.created_at = new Date();
  }

  return payload;
};

// Build partial employee payload (only provided fields)
const buildPartialEmployeePayload = (data, userId) => {
  const payload = {
    updated_by: userId,
    updated_at: new Date(),
  };

  // Only include fields that are explicitly provided
  if (data.employee_id !== undefined) payload.employee_id = data.employee_id;
  if (data.designation_id !== undefined) payload.designation_id = data.designation_id;
  if (data.name !== undefined) payload.name = data.name;
  if (data.father_name !== undefined)
    payload.father_name = normalizeNullableString(data.father_name);
  if (data.mother_name !== undefined)
    payload.mother_name = normalizeNullableString(data.mother_name);
  if (data.date_birth !== undefined) payload.date_birth = new Date(data.date_birth);
  if (data.gender !== undefined) payload.gender = data.gender;
  if (data.religion !== undefined) payload.religion = data.religion;
  if (data.marital_status !== undefined) payload.marital_status = data.marital_status;
  if (data.nationality !== undefined)
    payload.nationality = normalizeNullableString(data.nationality) || "Bangladeshi";
  if (data.national_id !== undefined)
    payload.national_id = normalizeNullableString(data.national_id);
  if (data.passport_number !== undefined)
    payload.passport_number = normalizeNullableString(data.passport_number);
  if (data.passport_issue_date !== undefined)
    payload.passport_issue_date = parseNullableDate(data.passport_issue_date);
  if (data.mobile_personal !== undefined)
    payload.mobile_personal = normalizeNullableString(data.mobile_personal);
  if (data.email !== undefined) payload.email = normalizeNullableString(data.email);
  if (data.emergency_contact !== undefined)
    payload.emergency_contact = normalizeNullableString(data.emergency_contact);
  if (data.emergency_mobile !== undefined)
    payload.emergency_mobile = normalizeNullableString(data.emergency_mobile);
  if (data.blood_group !== undefined)
    payload.blood_group = normalizeNullableString(data.blood_group);

  if (data.present_address !== undefined) {
    payload.present_address = {
      holding_no: normalizeNullableString(data.present_address.holding_no),
      road: normalizeNullableString(data.present_address.road),
      city: normalizeNullableString(data.present_address.city),
      post_code:
        data.present_address.post_code === undefined || data.present_address.post_code === null
          ? null
          : Number(data.present_address.post_code),
    };
  }

  if (data.permanent_address !== undefined) {
    payload.permanent_address = {
      holding_no: normalizeNullableString(data.permanent_address.holding_no),
      village_road: normalizeNullableString(data.permanent_address.village_road),
      union_ward: normalizeNullableString(data.permanent_address.union_ward),
      upazila_thana: normalizeNullableString(data.permanent_address.upazila_thana),
      district: normalizeNullableString(data.permanent_address.district),
      division: normalizeNullableString(data.permanent_address.division),
    };
  }

  if (data.ssc_year !== undefined)
    payload.ssc_year = data.ssc_year === null ? null : Number(data.ssc_year);
  if (data.highest_degree !== undefined)
    payload.highest_degree = normalizeNullableString(data.highest_degree);
  if (data.last_organization !== undefined)
    payload.last_organization = normalizeNullableString(data.last_organization);
  if (data.last_position !== undefined)
    payload.last_position = normalizeNullableString(data.last_position);
  if (data.experience_years !== undefined)
    payload.experience_years = data.experience_years === null ? 0 : Number(data.experience_years);
  if (data.reference_name !== undefined)
    payload.reference_name = normalizeNullableString(data.reference_name);
  if (data.reference_mobile !== undefined)
    payload.reference_mobile = normalizeNullableString(data.reference_mobile);
  if (data.remarks !== undefined) payload.remarks = normalizeNullableString(data.remarks);
  if (data.active !== undefined) payload.active = Boolean(data.active);

  // Employee type context fields
  if (data.employee_type !== undefined) payload.employee_type = data.employee_type;
  if (data.territory_assignments !== undefined)
    payload.territory_assignments = data.territory_assignments;
  if (data.facility_id !== undefined) payload.facility_id = data.facility_id;
  if (data.factory_store_id !== undefined) payload.factory_store_id = data.factory_store_id;

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
  // Use conditional validation based on request body
  (req, res, next) => {
    // Detect if this is a partial update (context assignment from user management)
    // Partial update criteria: only has territory_assignments, facility_id, or factory_store_id
    const bodyKeys = Object.keys(req.body);
    const contextOnlyKeys = ["territory_assignments", "facility_id", "factory_store_id"];
    const isPartialUpdate =
      bodyKeys.length > 0 && bodyKeys.every((key) => contextOnlyKeys.includes(key));

    // Store flag for later use
    req.isPartialUpdate = isPartialUpdate;

    // Apply appropriate validation
    const validation = isPartialUpdate ? employeePartialValidation : employeeValidation;
    Promise.all(validation.map((v) => v.run(req)))
      .then(() => next())
      .catch(next);
  },
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const currentUserId = getCurrentUserId(req);

      // Only check for duplicate employee_id if it's being updated
      if (req.body.employee_id) {
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
      }

      // Use appropriate payload builder
      const payload = req.isPartialUpdate
        ? buildPartialEmployeePayload(req.body, currentUserId)
        : buildEmployeePayload(req.body, currentUserId, false);

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
