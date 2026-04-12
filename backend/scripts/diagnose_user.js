const mongoose = require("mongoose");

const MONGO_URI = "mongodb+srv://rajivmsurati11:rajivmsurati11@cluster0.p9hso.mongodb.net/EES-121_App";
const TARGET_PHONE = "7048700171";
const TARGET_CATEGORY_ID = "676163786e6fbd58487e84d5";

async function diagnose() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected!\n");

    const db = mongoose.connection.db;

    // 1. Find the target user
    const targetUser = await db.collection("users").findOne(
      { phone: TARGET_PHONE },
      {
        projection: {
          name: 1,
          phone: 1,
          businessCategory: 1,
          "address.city": 1,
          "address.pincode": 1,
          paymentVerified: 1,
          isAdminApproved: 1,
          isPartial: 1,
          registrationStep: 1,
          isDeleted: 1,
        },
      }
    );

    if (!targetUser) {
      console.log(`❌ No user found with phone: ${TARGET_PHONE}`);
      process.exit(1);
    }

    console.log("📋 Target User Details:");
    console.log("  Name            :", targetUser.name);
    console.log("  Phone           :", targetUser.phone);
    console.log("  businessCategory:", JSON.stringify(targetUser.businessCategory));
    console.log("  address.city    :", targetUser.address?.city);
    console.log("  address.pincode :", targetUser.address?.pincode);
    console.log("  paymentVerified :", targetUser.paymentVerified);
    console.log("  isAdminApproved :", targetUser.isAdminApproved);
    console.log("  isPartial       :", targetUser.isPartial);
    console.log("  registrationStep:", targetUser.registrationStep);
    console.log("  isDeleted       :", targetUser.isDeleted);

    // 2. Find the category name for the given ID
    const category = await db.collection("categories").findOne(
      { _id: new mongoose.Types.ObjectId(TARGET_CATEGORY_ID) },
      { projection: { categoryName: 1 } }
    );

    console.log("\n📦 Target Category:");
    if (category) {
      console.log("  categoryName:", category.categoryName);
    } else {
      console.log("  ❌ Category not found with ID:", TARGET_CATEGORY_ID);
    }

    // 3. Check if businessCategory matches
    const categoryName = category?.categoryName;
    const userCategories = targetUser.businessCategory || [];
    const isMatch = Array.isArray(userCategories)
      ? userCategories.some(c => c?.toLowerCase() === categoryName?.toLowerCase())
      : userCategories?.toLowerCase() === categoryName?.toLowerCase();

    console.log("\n🔍 Diagnosis:");
    console.log("  Category name match      :", isMatch ? "✅ YES" : "❌ NO (mismatch!)");
    console.log("  paymentVerified check    :", targetUser.paymentVerified ? "✅ PASS" : "❌ FAIL (not verified)");
    console.log("  isAdminApproved check    :", targetUser.isAdminApproved ? "✅ PASS" : "❌ FAIL (not approved)");
    console.log("  isDeleted check          :", !targetUser.isDeleted ? "✅ PASS" : "❌ FAIL (deleted)");
    console.log("  isPartial check          :", !targetUser.isPartial ? "✅ PASS (fully registered)" : "⚠️  PARTIAL registration");

    // 4. Find MY user (you — the one searching) to compare city
    console.log("\n🏙️  Checking city-based filter...");
    console.log("  User city:", targetUser.address?.city || "❌ No city set");
    console.log("  User pincode:", targetUser.address?.pincode || "❌ No pincode");
    console.log("\n  ⚠️  NOTE: The search filters by 'city', NOT 'pincode'.");
    console.log("  If your city name doesn't exactly match this user's city, they won't appear.");

  } catch (err) {
    console.error("💥 Error:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected.");
  }
}

diagnose();
