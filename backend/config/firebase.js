const admin = require("firebase-admin");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// const serviceAccount = require('./serviceAccountKey.json'); // Adjust the path if needed

const firebaseAdminKey = process.env.FIREBASE_ADMIN_KEY;

if (!firebaseAdminKey) {
  throw new Error("FIREBASE_ADMIN_KEY environment variable is not set.");
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(firebaseAdminKey);
} catch (error) {
  throw new Error(`FIREBASE_ADMIN_KEY is not a valid JSON string: ${error.message}`);
}
console.log(serviceAccount);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
