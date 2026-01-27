const express = require("express");
const router = express.Router();
const OutletMarketSize = require("../models/OutletMarketSize");
const { authenticate, requireApiPermission } = require("../middleware/auth");

// Get all outlet market sizes with optional filters
router.get(
  "/",
  authenticate,
  requireApiPermission("outlet-market-sizes:read"),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        search = "",
        sortBy = "mkt_size",
        sortOrder = "desc",
        active,
        category,
      } = req.query;

      const query = {};

      // Active filter
      if (active !== undefined) {
        query.active = active === "true";
      }

      // Category filter
      if (category) {
        query.category = category;
      }

      const sort = {};
      sort[sortBy] = sortOrder === "asc" ? 1 : -1;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      let dataQuery = OutletMarketSize.find(query)
        .populate({
          path: "category",
          select: "name active",
        })
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const [data, total] = await Promise.all([dataQuery, OutletMarketSize.countDocuments(query)]);

      // Apply search filter after population if needed
      let filteredData = data;
      if (search) {
        filteredData = data.filter((item) =>
          item.category?.name?.toLowerCase().includes(search.toLowerCase())
        );
      }

      res.json({
        data: filteredData,
        pagination: {
          total: search ? filteredData.length : total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil((search ? filteredData.length : total) / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Error fetching outlet market sizes:", error);
      res.status(500).json({ message: "Failed to fetch outlet market sizes" });
    }
  }
);

// Get outlet market size by ID
router.get(
  "/:id",
  authenticate,
  requireApiPermission("outlet-market-sizes:read"),
  async (req, res) => {
    try {
      const outletMarketSize = await OutletMarketSize.findById(req.params.id).populate({
        path: "category",
        select: "name active",
      });

      if (!outletMarketSize) {
        return res.status(404).json({ message: "Outlet market size not found" });
      }

      res.json(outletMarketSize);
    } catch (error) {
      console.error("Error fetching outlet market size:", error);
      res.status(500).json({ message: "Failed to fetch outlet market size" });
    }
  }
);

// Create new outlet market size
router.post(
  "/",
  authenticate,
  requireApiPermission("outlet-market-sizes:create"),
  async (req, res) => {
    try {
      const { category, mkt_size, active = true } = req.body;

      if (!category) {
        return res.status(400).json({ message: "Category is required" });
      }

      if (mkt_size === undefined || mkt_size === null) {
        return res.status(400).json({ message: "Market size is required" });
      }

      if (mkt_size < 0) {
        return res.status(400).json({ message: "Market size must be a positive number" });
      }

      // Check for duplicate active category
      const existing = await OutletMarketSize.findOne({ category, active: true });
      if (existing) {
        return res
          .status(400)
          .json({ message: "This category already has an active market size entry" });
      }

      const outletMarketSize = new OutletMarketSize({
        category,
        mkt_size: parseInt(mkt_size),
        active,
        created_by: req.user?.username || req.user?.email,
        updated_by: req.user?.username || req.user?.email,
      });

      await outletMarketSize.save();

      // Populate category before returning
      await outletMarketSize.populate({
        path: "category",
        select: "name active",
      });

      res.status(201).json(outletMarketSize);
    } catch (error) {
      console.error("Error creating outlet market size:", error);
      res.status(500).json({ message: "Failed to create outlet market size" });
    }
  }
);

// Update outlet market size
router.put(
  "/:id",
  authenticate,
  requireApiPermission("outlet-market-sizes:update"),
  async (req, res) => {
    try {
      const { category, mkt_size, active } = req.body;

      const outletMarketSize = await OutletMarketSize.findById(req.params.id);

      if (!outletMarketSize) {
        return res.status(404).json({ message: "Outlet market size not found" });
      }

      // Check for duplicate category if category is being changed
      if (category && category !== outletMarketSize.category.toString()) {
        const existing = await OutletMarketSize.findOne({
          category,
          active: true,
          _id: { $ne: req.params.id },
        });
        if (existing) {
          return res
            .status(400)
            .json({ message: "This category already has an active market size entry" });
        }
        outletMarketSize.category = category;
      }

      if (mkt_size !== undefined && mkt_size !== null) {
        if (mkt_size < 0) {
          return res.status(400).json({ message: "Market size must be a positive number" });
        }
        outletMarketSize.mkt_size = parseInt(mkt_size);
      }

      if (active !== undefined) {
        outletMarketSize.active = active;
      }

      outletMarketSize.updated_by = req.user?.username || req.user?.email;

      await outletMarketSize.save();

      // Populate category before returning
      await outletMarketSize.populate({
        path: "category",
        select: "name active",
      });

      res.json(outletMarketSize);
    } catch (error) {
      console.error("Error updating outlet market size:", error);
      res.status(500).json({ message: "Failed to update outlet market size" });
    }
  }
);

// Soft delete (deactivate) outlet market size
router.delete(
  "/:id",
  authenticate,
  requireApiPermission("outlet-market-sizes:delete"),
  async (req, res) => {
    try {
      const outletMarketSize = await OutletMarketSize.findById(req.params.id);

      if (!outletMarketSize) {
        return res.status(404).json({ message: "Outlet market size not found" });
      }

      outletMarketSize.active = false;
      outletMarketSize.updated_by = req.user?.username || req.user?.email;
      await outletMarketSize.save();

      await outletMarketSize.populate({
        path: "category",
        select: "name active",
      });

      res.json({ message: "Outlet market size deactivated successfully", data: outletMarketSize });
    } catch (error) {
      console.error("Error deleting outlet market size:", error);
      res.status(500).json({ message: "Failed to delete outlet market size" });
    }
  }
);

// Activate outlet market size
router.patch(
  "/:id/activate",
  authenticate,
  requireApiPermission("outlet-market-sizes:update"),
  async (req, res) => {
    try {
      const outletMarketSize = await OutletMarketSize.findById(req.params.id);

      if (!outletMarketSize) {
        return res.status(404).json({ message: "Outlet market size not found" });
      }

      // Check for duplicate active category
      const existing = await OutletMarketSize.findOne({
        category: outletMarketSize.category,
        active: true,
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res
          .status(400)
          .json({ message: "This category already has an active market size entry" });
      }

      outletMarketSize.active = true;
      outletMarketSize.updated_by = req.user?.username || req.user?.email;
      await outletMarketSize.save();

      await outletMarketSize.populate({
        path: "category",
        select: "name active",
      });

      res.json({ message: "Outlet market size activated successfully", data: outletMarketSize });
    } catch (error) {
      console.error("Error activating outlet market size:", error);
      res.status(500).json({ message: "Failed to activate outlet market size" });
    }
  }
);

module.exports = router;
