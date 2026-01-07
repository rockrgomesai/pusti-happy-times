/**
 * DSR Routes
 * Distributor Sales Representative Management
 * Route: /api/v1/dsrs
 */

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { authenticate, requireApiPermission } = require("../middleware/auth");
const DSR = require("../models/DSR");
const User = require("../models/User");
const Distributor = require("../models/Distributor");
const Role = require("../models/Role");

/**
 * GET /api/v1/dsrs
 * Get all DSRs with filtering and pagination
 * Access: System Admin, Distributor (only their own DSRs)
 */
router.get("/", authenticate, requireApiPermission("dsr:read"), async (req, res) => {
  try {
    const { user } = req;
    const {
      page = 1,
      limit = 10,
      search = "",
      distributor_id,
      employment_status,
      active,
    } = req.query;

    // Build query
    const query = {};

    // If user is a distributor, only show their DSRs
    if (user.user_type === "distributor" && user.distributor_id) {
      query.distributor_id = user.distributor_id;
    } else if (distributor_id) {
      // System admin can filter by distributor
      query.distributor_id = distributor_id;
    }

    // Search by name, DSR code, or mobile
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { dsr_code: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by employment status
    if (employment_status) {
      query.employment_status = employment_status;
    }

    // Filter by active status
    if (active !== undefined) {
      query.active = active === "true";
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const [dsrs, total] = await Promise.all([
      DSR.find(query)
        .populate("distributor_id", "distributor_name distributor_code")
        .populate("user_id", "username email active")
        .populate("created_by", "username")
        .populate("updated_by", "username")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      DSR.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: dsrs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching DSRs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch DSRs",
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/dsrs/:id
 * Get single DSR by ID
 */
router.get("/:id", authenticate, requireApiPermission("dsr:read"), async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;

    const dsr = await DSR.findById(id)
      .populate("distributor_id", "distributor_name distributor_code db_point_id")
      .populate("user_id", "username email active")
      .populate("created_by", "username")
      .populate("updated_by", "username")
      .lean();

    if (!dsr) {
      return res.status(404).json({
        success: false,
        message: "DSR not found",
      });
    }

    // If user is a distributor, ensure DSR belongs to them
    if (user.user_type === "distributor" && user.distributor_id) {
      if (dsr.distributor_id._id.toString() !== user.distributor_id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied - DSR belongs to another distributor",
        });
      }
    }

    res.json({
      success: true,
      data: dsr,
    });
  } catch (error) {
    console.error("Error fetching DSR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch DSR",
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/dsrs
 * Create new DSR
 */
router.post("/", authenticate, requireApiPermission("dsr:create"), async (req, res) => {
  try {
    const { user } = req;
    const {
      name,
      distributor_id,
      mobile,
      email,
      nid_number,
      date_of_birth,
      gender,
      blood_group,
      present_address,
      permanent_address,
      joining_date,
      emergency_contact_name,
      emergency_contact_relation,
      emergency_contact_mobile,
      assigned_areas,
      notes,
      create_user_account,
      username,
      password,
    } = req.body;

    // Validate required fields
    if (!name || !distributor_id || !mobile) {
      return res.status(400).json({
        success: false,
        message: "Name, distributor, and mobile are required",
      });
    }

    // If user is a distributor, they can only create DSRs for themselves
    let targetDistributorId = distributor_id;
    if (user.user_type === "distributor" && user.distributor_id) {
      targetDistributorId = user.distributor_id;
    }

    // Verify distributor exists
    const distributor = await Distributor.findById(targetDistributorId);
    if (!distributor) {
      return res.status(404).json({
        success: false,
        message: "Distributor not found",
      });
    }

    // Generate DSR code
    const dsr_code = await DSR.generateDsrCode(distributor.distributor_code);

    // Create DSR
    const dsrData = {
      dsr_code,
      name,
      distributor_id: targetDistributorId,
      mobile,
      email: email || null,
      nid_number: nid_number || null,
      date_of_birth: date_of_birth || null,
      gender: gender || null,
      blood_group: blood_group || null,
      present_address: present_address || {},
      permanent_address: permanent_address || {},
      joining_date: joining_date || new Date(),
      emergency_contact_name: emergency_contact_name || null,
      emergency_contact_relation: emergency_contact_relation || null,
      emergency_contact_mobile: emergency_contact_mobile || null,
      assigned_areas: assigned_areas || [],
      notes: notes || null,
      active: true,
      employment_status: "active",
      created_by: user._id,
      updated_by: user._id,
    };

    const dsr = new DSR(dsrData);
    await dsr.save();

    // Create user account if requested
    if (create_user_account && username && password) {
      // Find DSR role
      const dsrRole = await Role.findOne({ role: "DSR" });
      if (!dsrRole) {
        return res.status(400).json({
          success: false,
          message: "DSR role not found. Please run setup script first.",
        });
      }

      // Check if username already exists
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Username already exists",
        });
      }

      // Create user account
      const userData = {
        username,
        password,
        email: email || `${username}@example.com`,
        role_id: dsrRole._id,
        user_type: "distributor",
        distributor_id: targetDistributorId,
        dsr_id: dsr._id,
        active: true,
        created_by: user._id,
        updated_by: user._id,
      };

      const dsrUser = new User(userData);
      await dsrUser.save();

      // Update DSR with user_id
      dsr.user_id = dsrUser._id;
      await dsr.save();
    }

    // Fetch populated DSR
    const populatedDsr = await DSR.findById(dsr._id)
      .populate("distributor_id", "distributor_name distributor_code")
      .populate("user_id", "username email active")
      .lean();

    res.status(201).json({
      success: true,
      message: "DSR created successfully",
      data: populatedDsr,
    });
  } catch (error) {
    console.error("Error creating DSR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create DSR",
      error: error.message,
    });
  }
});

/**
 * PUT /api/v1/dsrs/:id
 * Update existing DSR
 */
router.put("/:id", authenticate, requireApiPermission("dsr:update"), async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;
    const {
      name,
      mobile,
      email,
      nid_number,
      date_of_birth,
      gender,
      blood_group,
      present_address,
      permanent_address,
      employment_status,
      emergency_contact_name,
      emergency_contact_relation,
      emergency_contact_mobile,
      assigned_areas,
      notes,
      active,
    } = req.body;

    const dsr = await DSR.findById(id);

    if (!dsr) {
      return res.status(404).json({
        success: false,
        message: "DSR not found",
      });
    }

    // If user is a distributor, ensure DSR belongs to them
    if (user.user_type === "distributor" && user.distributor_id) {
      if (dsr.distributor_id.toString() !== user.distributor_id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied - DSR belongs to another distributor",
        });
      }
    }

    // Update fields
    if (name) dsr.name = name;
    if (mobile) dsr.mobile = mobile;
    if (email !== undefined) dsr.email = email || null;
    if (nid_number !== undefined) dsr.nid_number = nid_number || null;
    if (date_of_birth !== undefined) dsr.date_of_birth = date_of_birth || null;
    if (gender) dsr.gender = gender;
    if (blood_group) dsr.blood_group = blood_group;
    if (present_address) dsr.present_address = present_address;
    if (permanent_address) dsr.permanent_address = permanent_address;
    if (employment_status) dsr.employment_status = employment_status;
    if (emergency_contact_name !== undefined) dsr.emergency_contact_name = emergency_contact_name || null;
    if (emergency_contact_relation !== undefined) dsr.emergency_contact_relation = emergency_contact_relation || null;
    if (emergency_contact_mobile !== undefined) dsr.emergency_contact_mobile = emergency_contact_mobile || null;
    if (assigned_areas) dsr.assigned_areas = assigned_areas;
    if (notes !== undefined) dsr.notes = notes || null;
    if (active !== undefined) dsr.active = active;

    dsr.updated_by = user._id;
    await dsr.save();

    // If DSR has a user account and is being deactivated, deactivate user too
    if (active === false && dsr.user_id) {
      await User.findByIdAndUpdate(dsr.user_id, {
        active: false,
        updated_by: user._id,
      });
    }

    const updatedDsr = await DSR.findById(dsr._id)
      .populate("distributor_id", "distributor_name distributor_code")
      .populate("user_id", "username email active")
      .lean();

    res.json({
      success: true,
      message: "DSR updated successfully",
      data: updatedDsr,
    });
  } catch (error) {
    console.error("Error updating DSR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update DSR",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/v1/dsrs/:id
 * Delete DSR (only if no user account linked)
 */
router.delete("/:id", authenticate, requireApiPermission("dsr:delete"), async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;

    const dsr = await DSR.findById(id);

    if (!dsr) {
      return res.status(404).json({
        success: false,
        message: "DSR not found",
      });
    }

    // If user is a distributor, ensure DSR belongs to them
    if (user.user_type === "distributor" && user.distributor_id) {
      if (dsr.distributor_id.toString() !== user.distributor_id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied - DSR belongs to another distributor",
        });
      }
    }

    // Check if DSR can be deleted
    if (!dsr.canBeDeleted()) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete DSR with linked user account. Deactivate the user first.",
      });
    }

    await dsr.deleteOne();

    res.json({
      success: true,
      message: "DSR deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting DSR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete DSR",
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/dsrs/:id/create-user
 * Create user account for existing DSR
 */
router.post("/:id/create-user", authenticate, requireApiPermission("dsr:create_user"), async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const dsr = await DSR.findById(id);

    if (!dsr) {
      return res.status(404).json({
        success: false,
        message: "DSR not found",
      });
    }

    // If user is a distributor, ensure DSR belongs to them
    if (user.user_type === "distributor" && user.distributor_id) {
      if (dsr.distributor_id.toString() !== user.distributor_id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied - DSR belongs to another distributor",
        });
      }
    }

    // Check if DSR already has a user account
    if (dsr.user_id) {
      return res.status(400).json({
        success: false,
        message: "DSR already has a user account",
      });
    }

    // Find DSR role
    const dsrRole = await Role.findOne({ role: "DSR" });
    if (!dsrRole) {
      return res.status(400).json({
        success: false,
        message: "DSR role not found. Please run setup script first.",
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Username already exists",
      });
    }

    // Create user account
    const userData = {
      username,
      password,
      email: dsr.email || `${username}@example.com`,
      role_id: dsrRole._id,
      user_type: "distributor",
      distributor_id: dsr.distributor_id,
      dsr_id: dsr._id,
      active: true,
      created_by: user._id,
      updated_by: user._id,
    };

    const dsrUser = new User(userData);
    await dsrUser.save();

    // Update DSR with user_id
    dsr.user_id = dsrUser._id;
    dsr.updated_by = user._id;
    await dsr.save();

    const updatedDsr = await DSR.findById(dsr._id)
      .populate("distributor_id", "distributor_name distributor_code")
      .populate("user_id", "username email active")
      .lean();

    res.json({
      success: true,
      message: "User account created successfully",
      data: updatedDsr,
    });
  } catch (error) {
    console.error("Error creating user account:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create user account",
      error: error.message,
    });
  }
});

module.exports = router;
