/**
 * Test the send-to-store API endpoint with shabnamprod user
 */

const axios = require("axios");

const API_URL = "http://localhost:5000/api";

async function testSendToStore() {
  try {
    console.log("🔐 Step 1: Login with shabnamprod...\n");

    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: "shabnamprod",
      password: "temp1234", // Update if password is different
    });

    const { accessToken, user } = loginResponse.data.data;
    console.log("✅ Login successful!");
    console.log(`   User: ${user.username}`);
    console.log(`   Role: ${user.role.role}`);
    console.log(`   Token: ${accessToken.substring(0, 20)}...\n`);

    console.log("📦 Step 2: Attempting to create send-to-store shipment...\n");

    // Try to create a shipment
    const shipmentData = {
      details: [
        {
          product_id: "6748c7e1d21bd3e1f90dd04a", // Replace with actual product ID
          qty: 10,
          production_date: "2025-01-01",
          expiry_date: "2025-12-31",
          batch_no: "TEST-001",
        },
      ],
    };

    try {
      const shipmentResponse = await axios.post(
        `${API_URL}/production/send-to-store`,
        shipmentData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Shipment created successfully!");
      console.log("   Response:", shipmentResponse.data);
    } catch (shipmentError) {
      console.error("❌ Shipment creation failed!");
      console.error("   Status:", shipmentError.response?.status);
      console.error("   Message:", shipmentError.response?.data?.message);
      console.error("   Code:", shipmentError.response?.data?.code);
      console.error("   Permission:", shipmentError.response?.data?.permission);
      console.error("\n📋 Full error response:");
      console.error(JSON.stringify(shipmentError.response?.data, null, 2));
    }
  } catch (error) {
    console.error("❌ Test failed!");
    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Data:", error.response.data);
    } else {
      console.error("   Error:", error.message);
    }
  }
}

testSendToStore();
