const axios = require("axios");

async function testFinanceAPI() {
  try {
    // First login as Finance
    const loginResponse = await axios.post("http://localhost:5000/api/v1/auth/login", {
      username: "financemanagerbanana",
      password: "Finance@2024",
    });

    const token = loginResponse.data.data.token;
    console.log("✅ Logged in as Finance");
    console.log("Token:", token.substring(0, 20) + "...");

    // Now fetch schedulings
    const schedulingsResponse = await axios.get(
      "http://localhost:5000/api/v1/ordermanagement/schedulings",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("\n📦 Schedulings Response:");
    console.log("Status:", schedulingsResponse.status);
    console.log("Data:", JSON.stringify(schedulingsResponse.data, null, 2));
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

testFinanceAPI();
