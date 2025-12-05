const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";
const API_URL = process.env.BACKEND_URL || "http://localhost:5000";

async function testApiEndpoint() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;

    // Get user and generate a token
    const user = await db.collection("users").findOne({ username: "inventorymanagerpapaya" });

    if (!user) {
      console.log("❌ User not found");
      return;
    }

    console.log("=== USER INFO ===");
    console.log("Username:", user.username);
    console.log("Facility ID:", user.facility_id?.toString());
    console.log("Role ID:", user.role_id?.toString());

    // Find a valid session token
    const session = await db
      .collection("sessions")
      .findOne({ user_id: user._id, is_active: true })
      .sort({ created_at: -1 });

    if (!session) {
      console.log("\n❌ No active session found for user");
      console.log("Please log in to the application first");
      await mongoose.disconnect();
      return;
    }

    console.log("\n=== TESTING API ENDPOINT ===");
    console.log("Token exists:", !!session.token);
    console.log("API URL:", `${API_URL}/api/v1/inventory/delivery-chalans`);

    try {
      const response = await axios.get(`${API_URL}/api/v1/inventory/delivery-chalans`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
        params: {
          page: 1,
          limit: 20,
        },
      });

      console.log("\n✅ API Response:");
      console.log("Status:", response.status);
      console.log("Success:", response.data.success);
      console.log("Chalans count:", response.data.data?.length || 0);
      console.log("Total count:", response.data.pagination?.total || 0);

      if (response.data.data?.length > 0) {
        console.log("\n=== CHALANS ===");
        response.data.data.forEach((c, i) => {
          console.log(`${i + 1}. ${c.chalan_no} - ${c.distributor_name || c.distributor_id?.name}`);
        });
      }
    } catch (apiError) {
      console.log("\n❌ API Error:");
      if (apiError.response) {
        console.log("Status:", apiError.response.status);
        console.log("Error:", apiError.response.data);
      } else {
        console.log("Error:", apiError.message);
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

testApiEndpoint();
