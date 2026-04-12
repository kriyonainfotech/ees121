const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const UserModel = require("../model/user");

const migrateUsers = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MongoDB || process.env.MONGODB_URI);
    console.log("Connected successfully!");

    console.log("Updating existing users to complete registration state...");

    const result = await UserModel.updateMany(
      { isDeleted: { $ne: true } }, // Update all active users
      {
        $set: {
          registrationStep: 4,
          isPartial: false,
        }
      }
    );

    console.log(`Migration successful!`);
    console.log(`Matched: ${result.matchedCount} users`);
    console.log(`Modified: ${result.modifiedCount} users`);

    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

migrateUsers();
