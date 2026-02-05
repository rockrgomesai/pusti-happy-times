/**
 * Profile Routes
 * User profile management including photo upload
 */

const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs").promises;

const { User, Employee, Distributor, DSR } = require("../models");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Configure upload directory
const PROFILE_IMAGE_DIR = path.join(__dirname, "../../public/images/profiles");

// Ensure directory exists
const ensureProfileImageDirectory = async () => {
  try {
    await fs.access(PROFILE_IMAGE_DIR);
  } catch {
    await fs.mkdir(PROFILE_IMAGE_DIR, { recursive: true });
  }
};

// Configure multer storage
const profileImageStorage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    await ensureProfileImageDirectory();
    cb(null, PROFILE_IMAGE_DIR);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname) || "";
    const randomToken = crypto.randomBytes(8).toString("hex");
    const filename = `profile-${Date.now()}-${randomToken}${extension}`;
    cb(null, filename);
  },
});

// Configure multer upload
const profileImageUpload = multer({
  storage: profileImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedMimes.includes(file.mimetype)) {
      const error = new Error("Only JPG, PNG, and WEBP images are allowed");
      error.statusCode = 400;
      return cb(error);
    }
    cb(null, true);
  },
});

/**
 * @route   POST /api/v1/profile/upload-photo
 * @desc    Upload user profile photo
 * @access  Private (authenticated users only)
 */
router.post("/upload-photo", authenticate, async (req, res) => {
  try {
    // Handle file upload
    profileImageUpload.single("photo")(req, res, async (err) => {
      if (err) {
        console.error("Profile photo upload error:", err);
        return res.status(err.statusCode || 400).json({
          success: false,
          message: err.message || "Photo upload failed",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No photo file provided",
        });
      }

      try {
        // Get user from database
        const user = await User.findById(req.user._id)
          .populate("employee_id")
          .populate("distributor_id")
          .populate("dsr_id");

        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        // Construct relative path for storage
        const relativePath = `/images/profiles/${req.file.filename}`;

        // Update appropriate model based on user type
        let updatedRecord;
        let oldPhotoPath;

        if (user.user_type === "employee" && user.employee_id) {
          oldPhotoPath = user.employee_id.profile_photo;
          updatedRecord = await Employee.findByIdAndUpdate(
            user.employee_id._id,
            { profile_photo: relativePath, updated_by: req.user._id },
            { new: true }
          );
        } else if (user.user_type === "distributor" && user.distributor_id) {
          oldPhotoPath = user.distributor_id.profile_photo;
          updatedRecord = await Distributor.findByIdAndUpdate(
            user.distributor_id._id,
            { profile_photo: relativePath, updated_by: req.user._id },
            { new: true }
          );
        } else if (user.dsr_id) {
          oldPhotoPath = user.dsr_id.profile_picture_url;
          updatedRecord = await DSR.findByIdAndUpdate(
            user.dsr_id._id,
            { profile_picture_url: relativePath },
            { new: true }
          );
        }

        // Delete old photo file if exists
        if (oldPhotoPath) {
          const oldFilePath = path.join(__dirname, "../../public", oldPhotoPath);
          try {
            await fs.unlink(oldFilePath);
          } catch (unlinkErr) {
            // Ignore if file doesn't exist
            console.warn("Could not delete old photo:", unlinkErr.message);
          }
        }

        return res.status(200).json({
          success: true,
          message: "Profile photo uploaded successfully",
          data: {
            photo_url: relativePath,
            filename: req.file.filename,
            size: req.file.size,
          },
        });
      } catch (dbError) {
        console.error("Database error during photo upload:", dbError);

        // Clean up uploaded file on database error
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkErr) {
          console.error("Could not clean up uploaded file:", unlinkErr);
        }

        return res.status(500).json({
          success: false,
          message: "Failed to save photo to profile",
          error: dbError.message,
        });
      }
    });
  } catch (error) {
    console.error("Profile photo upload route error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/profile/me
 * @desc    Get current user profile with photo
 * @access  Private
 */
router.get("/me", authenticate, async (req, res) => {
  try {
    console.log("📱 Profile/me request - User ID:", req.user?._id);

    const user = await User.findById(req.user._id)
      .populate("role_id")
      .populate({
        path: "employee_id",
        populate: [
          { path: "designation_id" },
          { path: "facility_id" },
          {
            path: "territory_assignments.zone_ids",
            select: "name type hierarchy_level",
          },
          {
            path: "territory_assignments.region_ids",
            select: "name type hierarchy_level",
          },
          {
            path: "territory_assignments.area_ids",
            select: "name type hierarchy_level",
          },
        ],
      })
      .populate({
        path: "distributor_id",
        populate: [{ path: "db_point_id", select: "name type" }],
      })
      .populate({
        path: "dsr_id",
        populate: [
          { path: "distributor_id", select: "name" },
          { path: "territory_id", select: "name type" },
        ],
      });

    console.log("📱 User found:", user ? "Yes" : "No");

    if (!user) {
      console.log("❌ User not found for ID:", req.user._id);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const profileData = {
      id: user._id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      active: user.active,
      user_type: user.user_type,
      role: user.role_id ? { id: user.role_id._id, role: user.role_id.role } : null,
      profile_photo: null,
    };

    // Add user-specific data
    if (user.user_type === "employee" && user.employee_id) {
      const employee = user.employee_id;

      profileData.employee_id = {
        id: employee._id,
        employee_id: employee.employee_id,
        name: employee.name,
        email: employee.email,
        mobile: employee.mobile_personal,
        designation: employee.designation_id?.name || null,
        employee_type: employee.employee_type,
        role: employee.role,
        profile_photo: employee.profile_photo,

        // Territory info for field employees
        zone: employee.territory_assignments?.zone_ids?.[0]?.name || null,
        region: employee.territory_assignments?.region_ids?.[0]?.name || null,
        area: employee.territory_assignments?.area_ids?.[0]?.name || null,

        // Facility info for facility employees
        facility_id: employee.facility_id
          ? {
              id: employee.facility_id._id,
              name: employee.facility_id.name,
              type: employee.facility_id.facility_type,
            }
          : null,
      };
      profileData.profile_photo = employee.profile_photo;
      profileData.full_name = employee.name;
    } else if (user.user_type === "distributor" && user.distributor_id) {
      const distributor = user.distributor_id;

      profileData.distributor_id = {
        id: distributor._id,
        name: distributor.name,
        mobile: distributor.mobile,
        proprietor: distributor.proprietor,
        territory_name: distributor.db_point_id?.name || null,
        profile_photo: distributor.profile_photo,
      };
      profileData.profile_photo = distributor.profile_photo;
      profileData.full_name = distributor.name;
    } else if (user.dsr_id) {
      const dsr = user.dsr_id;

      profileData.dsr_id = {
        id: dsr._id,
        dsr_code: dsr.dsr_code,
        name: dsr.name,
        mobile: dsr.mobile,
        distributor_id: dsr.distributor_id
          ? {
              id: dsr.distributor_id._id,
              name: dsr.distributor_id.name,
            }
          : null,
        territory_name: dsr.territory_id?.name || null,
        profile_photo: dsr.profile_picture_url,
      };
      profileData.profile_photo = dsr.profile_picture_url;
      profileData.full_name = dsr.name;
    }

    return res.status(200).json({
      success: true,
      data: profileData,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: error.message,
    });
  }
});

module.exports = router;
