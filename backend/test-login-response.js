const axios = require("axios");

async function testLogin() {
  try {
    const response = await axios.post("http://localhost:5000/api/v1/auth/login", {
      username: "areamanagermango",
      password: "password123",
    });

    console.log("✅ Login Response:\n");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log("❌ Login failed!");
    if (error.response) {
      console.log(JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(error.message);
    }
  }
}

testLogin();
