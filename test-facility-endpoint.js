/**
 * Test script to verify facility endpoint with fresh login
 */

const axios = require("axios");

const API_URL = "http://localhost:5000/api/v1";

async function testFacilityEndpoint() {
  try {
    console.log("🔐 Logging in as productionmanagerpapaya...");

    // Login
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      username: "productionmanagerpapaya",
      password: "password123",
    });

    if (!loginRes.data.success) {
      console.error("❌ Login failed:", loginRes.data);
      return;
    }

    const token = loginRes.data.data.tokens.accessToken;
    console.log("✅ Login successful");
    console.log("📋 User context:", JSON.stringify(loginRes.data.data.context, null, 2));

    // Test my-facilities endpoint
    console.log("\n🏭 Testing /facilities/my-facilities...");
    const facilitiesRes = await axios.get(`${API_URL}/facilities/my-facilities`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("✅ Facilities response:", JSON.stringify(facilitiesRes.data, null, 2));

    // Test stats endpoint
    console.log("\n📊 Testing /facilities/stats...");
    const statsRes = await axios.get(`${API_URL}/facilities/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("✅ Stats response:", JSON.stringify(statsRes.data, null, 2));
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Response:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

testFacilityEndpoint();
