/**
 * Test that Inventory Depot user is blocked from production endpoints
 */

const http = require("http");

async function testDepotAccessBlocked() {
  try {
    // First login
    console.log("Step 1: Logging in as inventorymanagerpapaya (Depot user)...\n");

    const loginData = JSON.stringify({
      username: "inventorymanagerpapaya",
      password: "password123",
    });

    const loginOptions = {
      hostname: "localhost",
      port: 5000,
      path: "/api/v1/auth/login",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": loginData.length,
      },
    };

    const loginReq = http.request(loginOptions, (res) => {
      let loginResponseData = "";

      res.on("data", (chunk) => {
        loginResponseData += chunk;
      });

      res.on("end", () => {
        if (res.statusCode === 200) {
          const loginResponse = JSON.parse(loginResponseData);
          console.log("✅ Login successful!");
          console.log("   Role:", loginResponse.data.user.role.role);
          console.log("   Depot:", loginResponse.data.user.context.facility_id);

          const token = loginResponse.data.tokens.accessToken;
          console.log(
            "\nStep 2: Attempting to access /api/v1/inventory/factory-to-store/pending-receipts..."
          );
          console.log("   Expected: 403 Forbidden\n");

          // Now try to access pending-receipts (should be blocked)
          const pendingOptions = {
            hostname: "localhost",
            port: 5000,
            path: "/api/v1/inventory/factory-to-store/pending-receipts",
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          };

          const pendingReq = http.request(pendingOptions, (pendingRes) => {
            let pendingResponseData = "";

            pendingRes.on("data", (chunk) => {
              pendingResponseData += chunk;
            });

            pendingRes.on("end", () => {
              if (pendingRes.statusCode === 403) {
                console.log("✅ Correctly blocked from accessing production endpoint!");
                const response = JSON.parse(pendingResponseData);
                console.log("   Message:", response.message);
              } else if (pendingRes.statusCode === 200) {
                console.error(
                  "❌ ERROR: Depot user should NOT have access to production endpoints!"
                );
                console.error(
                  "   This is a security issue - depot users gained unauthorized access"
                );
              } else {
                console.log("⚠️  Unexpected status:", pendingRes.statusCode);
                console.log("   Response:", pendingResponseData);
              }
            });
          });

          pendingReq.on("error", (error) => {
            console.error("❌ Error:", error.message);
          });

          pendingReq.end();
        } else {
          console.error("❌ Login failed:");
          console.error("  Status:", res.statusCode);
          console.error("  Response:", loginResponseData);
        }
      });
    });

    loginReq.on("error", (error) => {
      console.error("❌ Error:", error.message);
    });

    loginReq.write(loginData);
    loginReq.end();
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testDepotAccessBlocked();
