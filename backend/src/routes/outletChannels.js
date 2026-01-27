const express = require("express");
const router = express.Router();
const OutletChannel = require("../models/OutletChannel");
const { authenticate, requireApiPermission } = require("../middleware/auth");

// Get all outlet channels with optional filters
router.get("/", authenticate, requireApiPermission("outlet-channels:read"), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = "",
      sortBy = "name",
      sortOrder = "asc",
      active,
    } = req.query;

    const query = {};

    // Search filter
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // Active filter
    if (active !== undefined) {
      query.active = active === "true";
    }

    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [data, total] = await Promise.all([
      OutletChannel.find(query).sort(sort).skip(skip).limit(parseInt(limit)).lean(),
      OutletChannel.countDocuments(query),
    ]);

    res.json({
      data,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching outlet channels:", error);
    res.status(500).json({ message: "Failed to fetch outlet channels" });
  }
});

// Get outlet channel by ID
router.get("/:id", authenticate, requireApiPermission("outlet-channels:read"), async (req, res) => {
  try {
    const outletChannel = await OutletChannel.findById(req.params.id);

    if (!outletChannel) {
      return res.status(404).json({ message: "Outlet channel not found" });
    }

    res.json(outletChannel);
  } catch (error) {
    console.error("Error fetching outlet channel:", error);
    res.status(500).json({ message: "Failed to fetch outlet channel" });
  }
});

// Create new outlet channel
router.post("/", authenticate, requireApiPermission("outlet-channels:create"), async (req, res) => {
  try {
    const { name, active = true } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    // Check for duplicate
    const existing = await OutletChannel.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ message: "Outlet channel already exists" });
    }

    const outletChannel = new OutletChannel({
      name: name.trim(),
      active,
      created_by: req.user?.username || req.user?.email,
      updated_by: req.user?.username || req.user?.email,
    });

    await outletChannel.save();

    res.status(201).json(outletChannel);
  } catch (error) {
    console.error("Error creating outlet channel:", error);
    res.status(500).json({ message: "Failed to create outlet channel" });
  }
});

// Update outlet channel
router.put(
  "/:id",
  authenticate,
  requireApiPermission("outlet-channels:update"),
  async (req, res) => {
    try {
      const { name, active } = req.body;

      const outletChannel = await OutletChannel.findById(req.params.id);

      if (!outletChannel) {
        return res.status(404).json({ message: "Outlet channel not found" });
      }

      // Check for duplicate name if name is being changed
      if (name && name !== outletChannel.name) {
        const existing = await OutletChannel.findOne({ name: name.trim() });
        if (existing) {
          return res.status(400).json({ message: "Outlet channel name already exists" });
        }
        outletChannel.name = name.trim();
      }

      if (active !== undefined) {
        outletChannel.active = active;
      }

      outletChannel.updated_by = req.user?.username || req.user?.email;

      await outletChannel.save();

      res.json(outletChannel);
    } catch (error) {
      console.error("Error updating outlet channel:", error);
      res.status(500).json({ message: "Failed to update outlet channel" });
    }
  }
);

// Soft delete (deactivate) outlet channel
router.delete(
  "/:id",
  authenticate,
  requireApiPermission("outlet-channels:delete"),
  async (req, res) => {
    try {
      const outletChannel = await OutletChannel.findById(req.params.id);

      if (!outletChannel) {
        return res.status(404).json({ message: "Outlet channel not found" });
      }

      outletChannel.active = false;
      outletChannel.updated_by = req.user?.username || req.user?.email;
      await outletChannel.save();

      res.json({ message: "Outlet channel deactivated successfully", data: outletChannel });
    } catch (error) {
      console.error("Error deleting outlet channel:", error);
      res.status(500).json({ message: "Failed to delete outlet channel" });
    }
  }
);

// Activate outlet channel
router.patch(
  "/:id/activate",
  authenticate,
  requireApiPermission("outlet-channels:update"),
  async (req, res) => {
    try {
      const outletChannel = await OutletChannel.findById(req.params.id);

      if (!outletChannel) {
        return res.status(404).json({ message: "Outlet channel not found" });
      }

      outletChannel.active = true;
      outletChannel.updated_by = req.user?.username || req.user?.email;
      await outletChannel.save();

      res.json({ message: "Outlet channel activated successfully", data: outletChannel });
    } catch (error) {
      console.error("Error activating outlet channel:", error);
      res.status(500).json({ message: "Failed to activate outlet channel" });
    }
  }
);

module.exports = router;
