require("dotenv").config();
const axios = require("axios");

async function testChalanEndpoint() {
  try {
    console.log("🔐 Step 1: Login as distbanana...\n");

    const loginResponse = await axios.post("http://localhost:5000/api/v1/auth/login", {
      username: "distbanana",
      password: "password123",
    });

    const accessToken = loginResponse.data.tokens.accessToken;
    console.log("✅ Login successful!");
    console.log("📋 User Context from Login:");
    console.log("   User Type:", loginResponse.data.user.user_type);
    console.log("   Role:", loginResponse.data.user.role?.role);
    console.log(
      "   Distributor ID:",
      loginResponse.data.user.context?.distributor_id || "NOT IN CONTEXT"
    );
    console.log(
      "   Distributor Name:",
      loginResponse.data.user.context?.distributor_name || "NOT IN CONTEXT"
    );
    console.log("");

    console.log("🚀 Step 2: Test /api/v1/distributor/chalans endpoint...\n");

    try {
      const chalansResponse = await axios.get("http://localhost:5000/api/v1/distributor/chalans", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          page: 1,
          limit: 20,
        },
      });

      console.log("✅ Success! Chalans fetched:");
      console.log("   Count:", chalansResponse.data.data?.length || 0);
      console.log("   Pagination:", chalansResponse.data.pagination);
    } catch (apiError) {
      console.log("❌ API Error:");
      console.log("   Status:", apiError.response?.status);
      console.log("   Message:", apiError.response?.data?.message);
      console.log("   Debug:", JSON.stringify(apiError.response?.data?.debug, null, 2));
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
    process.exit(1);
  }
}

testChalanEndpoint();
