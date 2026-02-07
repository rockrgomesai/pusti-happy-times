const express = require("express");
const sessionsRoutes = require("./sessions");
const dashboardRoutes = require("./dashboard");
const sessionRouteRoutes = require("./sessionRoute");

const router = express.Router();

// Mount sub-routes
router.use("/sessions", sessionsRoutes);
router.use("/dashboard/sessions", sessionRouteRoutes);
router.use("/dashboard", dashboardRoutes);

module.exports = router;
