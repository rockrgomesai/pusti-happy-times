const axios = require("axios");

async function testLogin() {
  try {
    console.log("🔐 Testing login for areamanagermango...\n");

    const response = await axios.post("http://localhost:5000/api/v1/auth/login", {
      username: "areamanagermango",
      password: "password123",
    });

    console.log("✅ Login successful!");
    console.log("\n📋 Response:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log("❌ Login failed!");
    if (error.response) {
      console.log("\n📋 Error Response:");
      console.log(`Status: ${error.response.status}`);
      console.log(JSON.stringify(error.response.data, null, 2));
    } else {
      console.log("\n📋 Error:");
      console.log(error.message);
    }
  }
}

testLogin();
