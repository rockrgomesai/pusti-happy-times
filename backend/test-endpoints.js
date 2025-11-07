/**
 * Test Depot Endpoints
 * Quick test to verify new depot inventory endpoints work
 */

const http = require("http");

const BASE_URL = "http://localhost:5000/api";

// You'll need to get a valid token by logging in first
// For now, we'll test without auth to see the error response
const TOKEN = "YOUR_TOKEN_HERE";

async function testEndpoints() {
  console.log("🧪 Testing Depot Inventory Endpoints...\n");

  const tests = [
    "/api/inventory/local-stock?page=1&limit=10",
    "/api/inventory/local-stock/dashboard/summary",
    "/api/inventory/factory-to-store?page=1&limit=10",
    "/api/inventory/factory-to-store/pending-receipts?page=1&limit=10",
  ];

  for (const path of tests) {
    await new Promise((resolve) => {
      console.log(`Testing: ${path}`);

      const req = http.get(`http://localhost:5000${path}`, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          console.log(`✅ Status: ${res.statusCode}`);

          if (res.statusCode === 401) {
            console.log("⚠️  Requires authentication (endpoint exists!)");
          } else if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);
              console.log(`✅ Success: ${json.success}`);
              if (json.data) {
                const keys = Object.keys(json.data);
                console.log(`✅ Data keys: ${keys.join(", ")}`);
              }
            } catch (e) {
              console.log("✅ Response received");
            }
          }

          console.log("");
          resolve();
        });
      });

      req.on("error", (error) => {
        console.log(`❌ Error: ${error.message}`);
        console.log("");
        resolve();
      });
    });
  }

  console.log("\n📊 Test Summary:");
  console.log("Endpoint testing complete.");
}

// Check if server is running
const healthCheck = http.get("http://localhost:5000/api/health", (res) => {
  if (res.statusCode === 200) {
    console.log("✅ Backend server is running\n");
    testEndpoints();
  }
});

healthCheck.on("error", () => {
  console.log("❌ Backend server is not running!");
  console.log("Please start the server with: npm run backend:dev");
  process.exit(1);
});
