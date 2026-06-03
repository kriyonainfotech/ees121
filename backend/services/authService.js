const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const UserModel = require("../model/user");
const { sendNotification } = require("../controllers/sendController");
const AWS = require("aws-sdk");
const sharp = require("sharp");
const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

// ✅ 1. Validate File Uploads
const validateFiles = (files) => {
  if (
    !files?.frontAadhar?.[0] ||
    !files?.backAadhar?.[0] ||
    !files?.profilePic?.[0]
  ) {
    throw new Error("Please upload all required files");
  }

  if (
    files.frontAadhar[0].size > MAX_FILE_SIZE ||
    files.backAadhar[0].size > MAX_FILE_SIZE ||
    files.profilePic[0].size > MAX_FILE_SIZE
  ) {
    throw new Error("Each file must be less than 2MB");
  }
};

// ✅ 2. Parse Address
const parseAddress = (address) => {
  try {
    return typeof address === "string" ? JSON.parse(address) : address;
  } catch (err) {
    throw new Error("Invalid address format");
  }
};

// ✅ 3. Check if User Already Exists
const checkExistingUser = async (email, phone) => {
  console.log(email, "email");
  const existingUser = await UserModel.findOne({ $or: [{ email }, { phone }] });
  if (existingUser) {
    throw new Error(
      existingUser.email === email
        ? "Email already exists"
        : "Phone number already exists"
    );
  }
};

// ✅ 4. Find Referrer (if applicable)
const findReferrer = async (referralCode) => {
  if (!referralCode) return null; // ✅ If no referral code, return null

  let referrer = null;

  if (/^\d{10}$/.test(referralCode)) {
    referrer = await UserModel.findOne({ phone: referralCode }).select(
      "_id fcmToken"
    );
  } else if (/^[a-fA-F0-9]{24}$/.test(referralCode)) {
    referrer = await UserModel.findById(referralCode).select("_id fcmToken");
  }

  return referrer; // ✅ If no referrer is found, just return null (NO ERROR)
};

// ✅ 5. Notify Referrer
const notifyReferrer = async (referrer, userName) => {
  if (referrer && referrer.fcmToken) {
    await sendNotification({
      type: "referral",
      senderName: "System",
      fcmToken: referrer.fcmToken,
      title: "New Referral Registered 🎉",
      message: `${userName} has registered using your referral code!`,
      receiverId: referrer._id,
    });
  }
};

// ✅ Notify Specific Admins
const notifyAdmins = async (userName) => {
  const specificAdminIds = [
    "67a60210ad6aa4fa92a3aa0a",
    "67a1b44479dba4870ea1083a",
    "677f5c7cead1254b486e57c0",
    "67c2a58d91f8cfbbb876f54d",
  ]; // Replace with actual admin IDs

  const admins = await UserModel.find({
    _id: { $in: specificAdminIds },
  }).select("_id fcmToken");

  const adminNotifications = admins
    .filter((admin) => admin.fcmToken)
    .map((admin) =>
      sendNotification({
        senderName: "System",
        fcmToken: admin.fcmToken,
        title: "New User Registered 🆕",
        message: `A new user, ${userName}, has registered on the platform.`,
        receiverId: admin._id,
      })
    );

  await Promise.all(adminNotifications);
};


const uploadToS3 = async (files, userId) => {
  const compressImage = async (buffer) => {
    let quality = 75;
    let compressedBuffer = await sharp(buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();

    // Adaptive quality loop: reduce quality until under 2MB
    while (compressedBuffer.length > 2 * 1024 * 1024 && quality > 30) {
      quality -= 10;
      compressedBuffer = await sharp(buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality })
        .toBuffer();
    }

    return compressedBuffer;
  };

  const uploadFile = async (file) => {
    const compressedBuffer = await compressImage(file.buffer);

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `user-images/${userId}/${file.fieldname}_${Date.now()}.jpg`,
      Body: compressedBuffer,
      ContentType: "image/jpeg",
    };

    return s3.upload(params).promise();
  };

  const result = {};
  for (const [fieldname, fileArray] of Object.entries(files)) {
    const file = fileArray[0]; // maxCount: 1
    if (!file) continue;

    const uploaded = await uploadFile(file);
    result[fieldname] = uploaded.Location; // ✅ Full URL
  }

  return result;
};

// ✅ 6. Hash Password

module.exports = {
  validateFiles,
  parseAddress,
  checkExistingUser,
  findReferrer,
  notifyReferrer,
  notifyAdmins,
  uploadToS3,
};
