/**
 * Quick test script for tracking API endpoints
 * Usage: node test-tracking-api.js
 */

const axios = require("axios");

const BASE_URL = "http://localhost:8080/api/v1";
const AUTH_URL = "http://localhost:8080/api/v1/auth";

// Test credentials - use a real field officer user
const TEST_USERNAME = "superadmin"; // Sales Officer (has tracking role)
const TEST_PASSWORD = "Admin@123";

let authToken = null;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to add auth token
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers["Authorization"] = `Bearer ${authToken}`;
  }
  return config;
});

async function login() {
  try {
    console.log(`🔐 Logging in as ${TEST_USERNAME}...`);
    const response = await axios.post(`${AUTH_URL}/login`, {
      username: TEST_USERNAME,
      password: TEST_PASSWORD,
    });

    authToken = response.data.data.accessToken;
    console.log("✅ Login successful");
    console.log(
      `👤 User: ${response.data.data.user.full_name} (${response.data.data.user.role?.role})\n`
    );
    return response.data.data;
  } catch (error) {
    console.error("❌ Login failed:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Error:", error.message);
    }
    process.exit(1);
  }
}

async function testTrackingFlow() {
  try {
    console.log("🧪 Testing Tracking API Flow...\n");

    // 0. Login first
    await login();

    // 1. Start Session
    console.log("1️⃣ Starting tracking session...");
    const startResponse = await api.post("/tracking/sessions/start", {
      device_info: {
        model: "Test Device",
        os_version: "Android 9",
        app_version: "1.0.0",
      },
      start_location: {
        latitude: 23.8103,
        longitude: 90.4125,
      },
    });

    console.log("✅ Session started:", startResponse.data);
    const sessionId = startResponse.data.data.session_id;
    console.log(`📍 Session ID: ${sessionId}\n`);

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 2. Upload location batch
    console.log("2️⃣ Uploading location batch...");
    const mockLocations = [
      {
        latitude: 23.8103,
        longitude: 90.4125,
        timestamp: new Date().toISOString(),
        accuracy: 10,
        speed: 5,
        heading: 90,
        altitude: 10,
        is_mock: true,
        provider: "mock",
      },
      {
        latitude: 23.811,
        longitude: 90.413,
        timestamp: new Date(Date.now() + 5000).toISOString(),
        accuracy: 10,
        speed: 6,
        heading: 90,
        altitude: 10,
        is_mock: true,
        provider: "mock",
      },
      {
        latitude: 23.8115,
        longitude: 90.4135,
        timestamp: new Date(Date.now() + 10000).toISOString(),
        accuracy: 10,
        speed: 5,
        heading: 90,
        altitude: 10,
        is_mock: true,
        provider: "mock",
      },
    ];

    const uploadResponse = await api.post(`/tracking/sessions/${sessionId}/locations/batch`, {
      locations: mockLocations,
    });

    console.log("✅ Locations uploaded:", uploadResponse.data);
    console.log(`📍 Points recorded: ${uploadResponse.data.data.points_recorded}\n`);

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 3. Stop Session
    console.log("3️⃣ Stopping tracking session...");
    const stopResponse = await api.put(`/tracking/sessions/${sessionId}/stop`);

    console.log("✅ Session stopped:", stopResponse.data);
    const summary = stopResponse.data.data;
    console.log(`📊 Summary:`);
    console.log(`   Distance: ${summary.total_distance} km`);
    console.log(`   Duration: ${summary.duration_minutes} minutes`);
    console.log(`   Points: ${summary.total_points}`);
    console.log(`   Status: ${summary.status}\n`);

    console.log("🎉 All tests passed!\n");
  } catch (error) {
    console.error("❌ Test failed:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Error:", error.message);
    }
    process.exit(1);
  }
}

// Run the test
testTrackingFlow();
