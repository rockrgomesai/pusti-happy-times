/**
 * Test Collections API Endpoint
 */

const axios = require("axios");

async function testCollectionsAPI() {
  try {
    console.log("🧪 Testing Collections API...\n");

    // Test 1: Try to access without authentication
    console.log("1. Testing GET /api/ordermanagement/demandorders/collections (no auth)");
    try {
      const response = await axios.get(
        "http://localhost:5000/api/ordermanagement/demandorders/collections"
      );
      console.log("   ❌ Should have failed with 401");
    } catch (error) {
      if (error.response?.status === 401) {
        console.log("   ✅ Correctly returns 401 Unauthorized");
      } else {
        console.log(`   ⚠️  Unexpected status: ${error.response?.status}`);
      }
    }

    // Test 2: Check if route exists
    console.log("\n2. Testing if route is registered");
    try {
      const response = await axios.get(
        "http://localhost:5000/api/ordermanagement/demandorders/collections"
      );
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log("   ✅ Route exists (auth required)");
      } else if (error.response?.status === 404) {
        console.log("   ❌ Route NOT FOUND - not registered!");
      } else {
        console.log(`   ⚠️  Status: ${error.response?.status} - ${error.response?.data?.message}`);
      }
    }

    // Test 3: Check bd-banks active endpoint
    console.log("\n3. Testing GET /api/master/bd-banks/active (no auth)");
    try {
      const response = await axios.get("http://localhost:5000/api/master/bd-banks/active");
      console.log("   ❌ Should have failed with 401");
    } catch (error) {
      if (error.response?.status === 401) {
        console.log("   ✅ Correctly returns 401 Unauthorized");
      } else if (error.response?.status === 403) {
        console.log("   ✅ Returns 403 Forbidden (needs bdbank:read permission)");
      } else if (error.response?.status === 404) {
        console.log("   ❌ Route NOT FOUND!");
      } else {
        console.log(`   ⚠️  Status: ${error.response?.status}`);
      }
    }

    console.log("\n✨ Test complete");
    console.log(
      "\n📝 Note: To fully test, you need a valid JWT token with collection:read permission"
    );
  } catch (error) {
    console.error("\n❌ Unexpected error:", error.message);
  }
}

testCollectionsAPI();
