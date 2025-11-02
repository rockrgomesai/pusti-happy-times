/**
 * Test accessing pending-receipts endpoint with Inventory Factory user
 */

const http = require("http");

async function testPendingReceipts() {
  try {
    // First login
    console.log("Step 1: Logging in as inventorymanagerruby...\n");

    const loginData = JSON.stringify({
      username: "inventorymanagerruby",
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

          const token = loginResponse.data.tokens.accessToken;
          console.log(
            "\nStep 2: Accessing /api/v1/inventory/factory-to-store/pending-receipts...\n"
          );

          // Now try to access pending-receipts
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
              if (pendingRes.statusCode === 200) {
                console.log("✅ Successfully accessed pending-receipts endpoint!");
                console.log("\nResponse:", pendingResponseData.substring(0, 500));
              } else {
                console.error("❌ Failed to access endpoint:");
                console.error("  Status:", pendingRes.statusCode);
                console.error("  Response:", pendingResponseData);
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

testPendingReceipts();
