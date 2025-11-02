/**
 * Test login for Inventory Depot user
 */

const http = require("http");

async function testLogin() {
  try {
    console.log("Testing login for inventorymanagerpapaya...\n");

    const data = JSON.stringify({
      username: "inventorymanagerpapaya",
      password: "password123",
    });

    const options = {
      hostname: "localhost",
      port: 5000,
      path: "/api/v1/auth/login",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length,
      },
    };

    const req = http.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(responseData);
          console.log("✅ Login successful!");
          console.log("\nFull response:", JSON.stringify(response, null, 2));
        } else {
          console.error("❌ Login failed:");
          console.error("  Status:", res.statusCode);
          console.error("  Response:", responseData);
        }
      });
    });

    req.on("error", (error) => {
      console.error("❌ Error:", error.message);
    });

    req.write(data);
    req.end();
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testLogin();
