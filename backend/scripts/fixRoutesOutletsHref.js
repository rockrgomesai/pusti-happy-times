const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const { connectDB } = require("../src/config/database");
const { SidebarMenuItem } = require("../src/models");

async function fixHref() {
  try {
    await connectDB();

    const parent = await SidebarMenuItem.findOne({ 
      label: "Routes & Outlets", 
      parent_id: null 
    });

    if (parent) {
      console.log(`Found parent menu: ${parent.label}`);
      console.log(`Current href: ${parent.href}`);
      
      parent.href = null;
      await parent.save();
      
      console.log(`✅ Updated href to: null`);
    } else {
      console.log("❌ Parent menu not found");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

fixHref();
