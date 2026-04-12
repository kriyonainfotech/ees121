const mongoose = require("mongoose");
const fs = require("fs");

const MONGO_URI = "mongodb+srv://rajivmsurati11:rajivmsurati11@cluster0.p9hso.mongodb.net/EES-121_App";

async function run() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const user = await db.collection("users").findOne(
    { phone: "7048700171" },
    {
      projection: {
        name: 1,
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

  const category = await db.collection("categories").findOne(
    { _id: new mongoose.Types.ObjectId("676163786e6fbd58487e84d5") },
    { projection: { categoryName: 1 } }
  );

  const result = { user, category };
  fs.writeFileSync("scripts/diagnose_result.json", JSON.stringify(result, null, 2), "utf8");
  console.log("DONE");
  await mongoose.disconnect();
}

run().catch(console.error);
