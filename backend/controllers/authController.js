const UserModel = require("../model/user");
const Banner = require("../model/banner");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const { uploadToS3 } = require("../services/authService");
const AWS = require("aws-sdk");
const WithdrawModel = require("../model/withdrawal")

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const {
  validateFiles,
  parseAddress,
  checkExistingUser,
  findReferrer,
  notifyReferrer,
  notifyAdmins,
} = require("../services/authService");
const {
  distributeReferralRewards,
} = require("../controllers/paymentController");
const { sendNotification } = require("./sendController");
const KYCModel = require("../model/kyc");

const getPublicIdFromUrl = (url) => {
  const regex = /\/(?:v\d+\/)?([^\/]+)\/([^\/]+)\.[a-z]+$/;
  const match = url.match(regex);
  if (match) {
    return `${match[1]}/${match[2]}`; // captures the folder and file name without versioning or extension
  }
  return null;
};

const deleteS3File = async (fileUrl) => {
  if (!fileUrl) return;

  // Extract the S3 object key from the full URL
  const url = new URL(fileUrl);
  const key = decodeURIComponent(url.pathname.slice(1)); // removes leading "/"

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  };

  try {
    await s3.deleteObject(params).promise();
    console.log(`[INFO] 🗑️ Deleted from S3: ${key}`);
  } catch (err) {
    console.error(`[ERROR] ❌ Failed to delete from S3: ${key}`, err);
  }
};

const registerUser = async (req, res) => {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Starting registerUser request`);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { files } = req;
    console.log("[DEBUG] Uploaded files:", files);

    // Validate required images
    if (
      !files?.frontAadhar?.[0] ||
      !files?.backAadhar?.[0] ||
      !files?.profilePic?.[0]
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please upload all required documents (Front Aadhar, Back Aadhar, and Profile Picture)",
      });
    }

    const {
      name,
      email,
      password,
      phone,
      businessCategory,
      businessName,
      businessAddress,
      businessDetaile,
      fcmToken,
      referralCode,
      area,
      city,
      state,
      country,
      pincode,
    } = req.body;

    const address = { area, city, state, country, pincode };

    const requiredAddressFields = [
      "area",
      "city",
      "state",
      "country",
      "pincode",
    ];
    const missingFields = requiredAddressFields.filter(
      (field) => !address[field]
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required address fields: ${missingFields.join(", ")}`,
      });
    }

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields",
      });
    }

    // Check existing email & phone
    const [emailExists, phoneExists] = await Promise.all([
      UserModel.exists({ email }).lean(),
      UserModel.exists({ phone }).lean(),
    ]);

    if (emailExists || phoneExists) {
      return res.status(400).json({
        success: false,
        message: emailExists
          ? "Email already exists"
          : "Phone number already exists",
      });
    }

    // Handle referral
    // 3️⃣ Find referrer
    const referrer = await findReferrer(referralCode);

    const hashedPassword = await bcrypt.hash(password, 10);
    const uniqueId = await generateUniqueId();

    const paymentExpiry = new Date();
    paymentExpiry.setFullYear(paymentExpiry.getFullYear() + 1);

    const fileKeys = await uploadToS3(req.files, uniqueId);
    console.log("[INFO] 🖼️ Uploaded images to S3:", fileKeys);

    const user = new UserModel({
      userId: uniqueId,
      name,
      email,
      password: hashedPassword,
      phone,
      address,
      businessCategory,
      businessName,
      businessAddress,
      businessDetaile,
      fcmToken,
      frontAadhar: fileKeys.frontAadhar || "",
      backAadhar: fileKeys.backAadhar || "",
      profilePic: fileKeys.profilePic || "",
      referralCode,
      referredBy: referrer ? [referrer._id] : [],
      isAdminApproved: false,
      walletBalance: 0,
      paymentExpiry,
    });

    user.referralCode = user._id;
    console.log("[SUCCESS] ✅ User registration completed!", user);
    await user.save({ session });

    if (referrer) {
      await UserModel.findByIdAndUpdate(referrer._id, {
        $push: { referrals: user._id },
      });
      console.log(`[INFO] 🔗 User added to ${referrer._id}'s referral list`);
      await notifyReferrer(referrer, name);
    }

    await notifyAdmins(name);
    console.log("[INFO] 🖼️ Registrated user:", user);

    await session.commitTransaction();
    session.endSession();

    console.log(`✅ Registration completed in ${Date.now() - startTime}ms`);

    return res.status(200).json({
      success: true,
      message: "Registration successful! Awaiting admin approval.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        referralCode: user.referralCode,
        referredBy: referrer?.phone || null,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("[ERROR] Registration failed:", error);
    return res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Step 1: Validate input
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Phone and Password are required",
      });
    }

    // Step 2: Check if user with the phone exists
    const userExists = await UserModel.findOne({ phone }).select("_id");

    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "No account found with this phone number",
      });
    }

    // Step 3: Now fetch full user with populated data
    const user = await UserModel.findOne({ phone })
      .populate({
        path: "referrals",
        select: "name phone email profilePic paymentVerified createdAt",
      })
      .populate({
        path: "earningsHistory.sourceUser",
        select: "name phone referredBy",
      });

    // Step 4: Check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid Phone or Password",
      });
    }

    // Step 5: Admin approval check
    if (!user.isAdminApproved) {
      return res.status(403).json({
        success: false,
        message: user.rejectedStep
          ? `Your registration step ${user.rejectedStep} was rejected: ${user.rejectedStepReason}. Please login via Website to update and resubmit.`
          : "Your account is not yet approved by the admin.",
      });
    }

    // Step 6: Successful login
    console.log("Login successful", user.paymentExpiry);

    res.status(200).json({
      success: true,
      message: "Login successful",
      user,
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred during login",
    });
  }
};

const checkUserStatus = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }

    const user = await UserModel.findOne({ phone }).select("name phone email isPartial registrationStep profilePic");

    if (!user) {
      return res.status(200).json({
        success: true,
        exists: false,
        message: "No user found with this phone number",
      });
    }

    return res.status(200).json({
      success: true,
      exists: true,
      isPartial: user.isPartial || false,
      registrationStep: user.registrationStep || (user.isPartial ? 1 : 4),
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        profilePic: user.profilePic,
      },
    });
  } catch (error) {
    console.error("[ERROR] checkUserStatus:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


const registerUserweb = async (req, res) => {
  try {
    console.log("[INFO] 🟢 Starting Step 1: User personal details...", req.body);
    const {
      name,
      email,
      password,
      phone,
      address,
      referralCode,
    } = req.body;

    if (!name || !email || !password || !phone || !address) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // Parse address & check existing user
    const parsedAddress = parseAddress(address);
    // Use manual check since checkExistingUser is not async or is part of authService
    const [emailExists, phoneExists] = await Promise.all([
      UserModel.exists({ email }).lean(),
      UserModel.exists({ phone }).lean(),
    ]);

    if (emailExists || phoneExists) {
      return res.status(400).json({
        success: false,
        message: emailExists
          ? "Email already exists"
          : "Phone number already exists",
      });
    }

    // Find referrer
    const referrer = referralCode ? await findReferrer(referralCode) : null;

    const hashedPassword = await bcrypt.hash(password, 10);
    const uniqueId = await generateUniqueId();

    const paymentExpiry = new Date();
    paymentExpiry.setFullYear(paymentExpiry.getFullYear() + 1);

    const user = new UserModel({
      userId: uniqueId,
      name,
      email,
      password: hashedPassword,
      phone,
      address: parsedAddress,
      referralCode,
      referredBy: referrer ? [referrer._id] : [],
      isAdminApproved: false,
      isPartial: true,
      registrationStep: 2, // User completed step 1, now at step 2
      walletBalance: 0,
      paymentExpiry,
    });

    user.referralCode = user._id;
    await user.save();

    // Notify admins of new registration attempt
    await notifyAdmins(name);

    // Generate authentication token
    const token = jwt.sign(
      { id: user._id, isAdminApproved: false },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(200).json({
      success: true,
      message: "Step 1 complete! Registered basic details.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        registrationStep: user.registrationStep,
      },
      token,
    });
  } catch (error) {
    console.error("[ERROR] ❌ Step 1 failed:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateRegistrationStep1 = async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    const userId = req.user.id;

    // Check if other users already use this email (exclude self)
    const [emailExists, phoneExists] = await Promise.all([
      UserModel.exists({ email, _id: { $ne: userId } }).lean(),
      UserModel.exists({ phone, _id: { $ne: userId } }).lean(),
    ]);

    if (emailExists || phoneExists) {
      return res.status(400).json({
        success: false,
        message: emailExists
          ? "Email already exists"
          : "Phone number already exists",
      });
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        name,
        email,
        phone,
        address: parseAddress(address),
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Step 1 details updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        registrationStep: updatedUser.registrationStep,
      },
    });
  } catch (error) {
    console.error("[ERROR] ❌ Step 1 update failed:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateRegistrationStep2 = async (req, res) => {
  try {
    const { businessCategory, businessName, businessAddress, businessDetaile } = req.body;
    const userId = req.user.id;

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        businessCategory,
        businessName,
        businessAddress,
        businessDetaile,
        registrationStep: 3 // User completed step 2, now at step 3
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Step 2 complete! Updated business details.",
      user: {
        id: updatedUser._id,
        registrationStep: updatedUser.registrationStep,
      }
    });
  } catch (error) {
    console.error("[ERROR] ❌ Step 2 failed:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateRegistrationStep3 = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!req.files) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }

    const fileKeys = await uploadToS3(req.files, user.userId);

    const updateFields = {
      ...(fileKeys.profilePic && { profilePic: fileKeys.profilePic }),
      ...(fileKeys.frontAadhar && { frontAadhar: fileKeys.frontAadhar }),
      ...(fileKeys.backAadhar && { backAadhar: fileKeys.backAadhar }),
      registrationStep: 5, // Finalized!
      isPartial: false,
      rejectedStep: null,
      rejectedStepReason: ""
    };

    const updatedUser = await UserModel.findByIdAndUpdate(user._id, updateFields, { new: true });

    // If referrer exists, update their lists only after registration is complete
    if (updatedUser.referredBy && updatedUser.referredBy.length > 0) {
      const referrerId = updatedUser.referredBy[0];
      await UserModel.findByIdAndUpdate(referrerId, {
        $addToSet: { referrals: user._id },
      });
      console.log(`[INFO] 🔗 User added to ${referrerId}'s referral list`);
      // Optional: Notify referrer here too if preferred after full documents are up
      // const referrer = await UserModel.findById(referrerId);
      // await notifyReferrer(referrer, updatedUser.name);
    }

    return res.status(200).json({
      success: true,
      message: "Registration complete! All documents uploaded.",
      user: {
        id: updatedUser._id,
        registrationStep: updatedUser.registrationStep,
      }
    });
  } catch (error) {
    console.error("[ERROR] ❌ Step 3 failed:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

async function generateUniqueId() {
  const counterDoc = await mongoose.connection.db
    .collection("counters")
    .findOneAndUpdate(
      { _id: "userId" },
      { $inc: { seq: 1 } },
      { returnDocument: "after", upsert: true }
    );
  return counterDoc.seq.toString().padStart(3, "0");
}

const updateUsersPaymentVerified = async (req, res) => {
  try {
    const result = await UserModel.updateMany(
      { paymentVerified: false },
      { $set: { paymentVerified: true } }
    );

    return res.status(200).json({
      success: true,
      message: "Added paymentVerified field to existing users",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error updating users:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update users",
      error: error.message,
    });
  }
};

const updateReferralChain = async (referrerId, newUserId) => {
  const referrer = referralCode ? await findReferrer(referralCode) : null;

  // const referrer = await UserModel.findById(referrerId);
  if (referrer) {
    if (!referrer.referrals.includes(newUserId)) {
      referrer.referrals.push(newUserId); // Add new user to the referrer's referrals list
      await referrer.save();
    }

    // Recursively update the chain for each referrer in the chain
    if (referrer.referredBy && referrer.referredBy.length > 0) {
      for (const parentReferrerId of referrer.referredBy) {
        await updateReferralChain(parentReferrerId, newUserId); // Call recursively
      }
    }
  }
};

const approveUser = async (req, res) => {
  try {
    const { userId } = req.body;
    console.log(req.body);

    // Find the user by ID
    const user = await UserModel.findById(userId);
    if (!user) {
      return res
        .status(400)
        .send({ success: false, message: "User not found" });
    }

    if (!user.paymentVerified) {
      return res.status(400).send({ success: false, message: "Cannot approve: Payment is not completed yet" });
    }
    if (!user.frontAadhar || !user.backAadhar) {
      return res.status(400).send({ success: false, message: "Cannot approve: Aadhar card photos are missing" });
    }
    if (!user.profilePic) {
      return res.status(400).send({ success: false, message: "Cannot approve: Profile photo is missing" });
    }

    // Update the user's approval status
    user.isAdminApproved = true;
    await user.save();

    return res.status(200).send({
      success: true,
      message: "User approved successfully",
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: "Error approving user",
      error: error.message,
    });
  }
};

const rejectUserStep = async (req, res) => {
  try {
    const { userId, stepNumber, reason } = req.body;
    if (!userId || !stepNumber) {
      return res.status(400).json({ success: false, message: "Missing userId or stepNumber" });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.registrationStep = stepNumber;
    user.rejectedStep = stepNumber;
    user.rejectedStepReason = reason || "";
    user.isPartial = true;
    user.isAdminApproved = false;

    await user.save();

    return res.status(200).json({
      success: true,
      message: `User step ${stepNumber} rejected successfully.`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error rejecting user step",
      error: error.message,
    });
  }
};

const loginUserweb = async (req, res) => {
  try {
    console.log(req.body, "body");

    const { phone, password, fcmToken } = req.body;

    // Step 1: Input validation
    if (!phone || !password) {
      return res.status(400).send({
        success: false,
        message: "Phone and Password are required",
      });
    }

    // Step 2: Check if user with phone exists first (faster lookup)
    const userExists = await UserModel.findOne({ phone }).select("_id");

    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "No account found with this phone number",
      });
    }

    // Step 3: Fetch user with all registration fields
    const user = await UserModel.findOne({ phone })
      .populate({
        path: "referrals",
        select: "name phone email profilePic paymentVerified createdAt",
      })
      .populate({
        path: "earningsHistory.sourceUser",
        select: "name phone referredBy",
      });

    // 🚫 Check if soft-deleted
    if (user.isDeleted) {
      return res.status(403).send({
        success: false,
        message: "Account has been deleted. Please contact support if this is a mistake.",
      });
    }

    // Step 4: Check admin approval (ONLY for fully registered users)
    if (!user.isPartial && !user.isAdminApproved) {
      return res.status(403).send({
        success: false,
        message: "Your account is pending admin approval",
      });
    }

    // Step 5: Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid Phone or Password",
      });
    }

    // Step 6: Update FCM token if provided
    if (fcmToken) {
      user.fcmToken = fcmToken; // Make sure `fcmToken` exists in schema
      await user.save();
    }

    // Step 7: Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        isAdminApproved: user.isAdminApproved,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "24h",
      }
    );

    // Step 8: Set refresh token cookie
    res.cookie("refreshToken", token, {
      httpOnly: true,
      sameSite: "None",
      secure: true,
      maxAge: 3 * 60 * 60 * 1000, // 3 hours
    });

    console.log("Login successful");

    // Step 9: Final response
    return res.status(200).json({
      success: true,
      message: user.isPartial ? "Please complete your registration" : "Login successful",
      token,
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "An error occurred during login",
      error: error.message,
    });
  }
};

const getAdmin = async (req, res) => {
  try {
    res.status(200).send({
      success: true,
      message: "Welcome, Admin! You have access to this route.",
      user: req.user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "An error occurred during login",
      error: error.message,
    });
  }
};

// without pagination
const getalluser = async (req, res) => {
  try {
    const user = await UserModel.find({ isDeleted: { $ne: true } })
      .populate("referredBy", "name phone")
      .populate(
        "ekyc",
        "bankProof panCardback panCardfront bankAccountNumber accountHolderName ifscCode status"
      );

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully.",
      user,
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: "An error occurred while fetching users",
      error: error.message,
    });
  }
};

const getUser = async (req, res) => {
  try {
    const id = req.user.id;
    const user = await UserModel.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate("ekyc");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "User Fetched Succesfully.",
      user,
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: "An error occurred during userfetch",
      error: error.message,
    });
  }
};


const getUserMobile = async (req, res) => {
  try {
    const userId = req.body.userId; // Extract userId from request body
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const user = await UserModel.findOne({ _id: userId, isDeleted: { $ne: true } })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User fetched successfully.",
      user,
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: "An error occurred during user fetch.",
      error: error.message,
    });
  }
};

const logout = async (req, res) => {
  try {
    res.setHeader(
      "Set-Cookie",
      "refreshToken=; HttpOnly; SameSite=None; Secure; Path=/; Max-Age=0"
    );

    console.log("Logout successful");

    return res.status(200).send({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).send({
      success: false,
      message: "An error occurred during logout",
      error: error.message,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log("[INFO] Incoming files and body:", req.files, req.body);

    // Upload files to S3 if present
    let s3FileKeys = {};
    if (req.files) {
      s3FileKeys = await uploadToS3(req.files, userId);
      console.log("[INFO] S3 uploaded keys:", s3FileKeys);
    }

    const {
      name,
      email,
      phone,
      address,
      businessCategory,
      businessName,
      businessAddress,
      businessDetaile,
      fcmToken,
    } = req.body;

    const updatedFields = {};

    if (name) updatedFields.name = name;
    if (email) updatedFields.email = email;
    if (phone) updatedFields.phone = phone;
    if (address) {
      try {
        const parsedAddress =
          typeof address === "string" ? JSON.parse(address) : address;
        updatedFields.address = parsedAddress;
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid address format. Must be valid JSON.",
        });
      }
    }

    // Add S3 keys if uploaded
    if (s3FileKeys.profilePic) updatedFields.profilePic = s3FileKeys.profilePic;
    if (s3FileKeys.frontAadhar)
      updatedFields.frontAadhar = s3FileKeys.frontAadhar;
    if (s3FileKeys.backAadhar) updatedFields.backAadhar = s3FileKeys.backAadhar;

    if (businessCategory) updatedFields.businessCategory = businessCategory;
    if (businessName) updatedFields.businessName = businessName;
    if (businessAddress) updatedFields.businessAddress = businessAddress;
    if (businessDetaile) updatedFields.businessDetaile = businessDetaile;
    if (fcmToken) updatedFields.fcmToken = fcmToken;

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $set: updatedFields },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("[ERROR] Profile update failed:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the profile",
      error: error.message,
    });
  }
};

const updateProfileMobile = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const profilePic = req.file?.path || null;

    console.log("[DEBUG] Uploaded File:", req.file);
    console.log("[DEBUG] Request Body:", req.body);

    const {
      name,
      email,
      phone,
      address,
      businessCategory,
      businessName,
      businessAddress,
      businessDetaile,
      fcmToken,
    } = req.body;

    const updatedFields = {
      ...(name && { name }),
      ...(email && { email }),
      ...(phone && { phone }),
      ...(profilePic && { profilePic }),
      ...(businessCategory && { businessCategory }),
      ...(businessName && { businessName }),
      ...(businessAddress && { businessAddress }),
      ...(businessDetaile && { businessDetaile }),
      ...(fcmToken && { fcmToken }),
    };

    // Address parsing & validation
    if (address) {
      try {
        updatedFields.address =
          typeof address === "string" ? JSON.parse(address) : address;
      } catch (error) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid address format. Address must be a valid JSON object.",
        });
      }
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $set: updatedFields },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("[ERROR] updateProfileMobile:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// const deleteUser = async (req, res) => {
//   try {
//     const userId = req.body.id;

//     // Fetch user before deletion
//     const user = await UserModel.findById(userId).populate("ekyc"); // Populate KYC data
//     if (!user) {
//       return res.status(404).send({
//         success: false,
//         message: "User not found",
//       });
//     }

//     console.log(`[INFO] 🔄 Removing user-related data for user: ${userId}`);

//     // Remove the user's requests from both users
//     await UserModel.updateMany(
//       { "sended_requests.user": userId },
//       { $pull: { sended_requests: { user: userId } } }
//     );

//     await UserModel.updateMany(
//       { "received_requests.user": userId },
//       { $pull: { received_requests: { user: userId } } }
//     );

//     console.log("[INFO] ✅ Cleared all related requests");

//     // Remove user ID from referrer's referral list if applicable
//     if (user.referredBy) {
//       await UserModel.updateOne(
//         { _id: user.referredBy },
//         { $pull: { referrals: userId } }
//       );
//       console.log("[INFO] ✅ Removed user from referrer’s referral list");
//     }

//     const userImages = [];

//     if (user.profilePic) userImages.push(user.profilePic);
//     if (user.frontAadhar) userImages.push(user.frontAadhar);
//     if (user.backAadhar) userImages.push(user.backAadhar);

//     if (user.ekyc) {
//       console.log("[INFO] 🔍 User has eKYC, deleting KYC images...");

//       if (user.ekyc.panCardfront) userImages.push(user.ekyc.panCardfront);
//       if (user.ekyc.panCardback) userImages.push(user.ekyc.panCardback);
//       if (user.ekyc.bankProof) userImages.push(user.ekyc.bankProof);

//       await KYCModel.findByIdAndDelete(user.ekyc._id);
//       console.log("[INFO] ✅ Deleted user's KYC record");
//     }

//     // Delete user's KYC images if they have eKYC
//     if (user.ekyc) {
//       console.log("[INFO] 🔍 User has eKYC, deleting KYC images...");
//       userImages.push(
//         user.ekyc.panCardfront,
//         user.ekyc.panCardback,
//         user.ekyc.bankProof
//       );

//       // Delete the KYC record
//       await KYCModel.findByIdAndDelete(user.ekyc._id);
//       console.log("[INFO] ✅ Deleted user's KYC record");
//     }

//     // Delete all collected images from Cloudinary
//     await Promise.all(userImages.map((key) => deleteS3File(key)));

//     console.log("[INFO] ✅ Deleted all user's images from S3");

//     // Finally, delete user
//     await UserModel.findByIdAndDelete(userId);

//     console.log("[SUCCESS] 🚀 User deleted successfully");

//     return res.status(200).send({
//       success: true,
//       message: "User deleted successfully",
//     });
//   } catch (error) {
//     console.log("[ERROR] ❌", error);
//     return res.status(500).send({
//       success: false,
//       message: "An error occurred while deleting the user",
//       error: error.message,
//     });
//   }
// };

const deleteUser = async (req, res) => {
  try {
    const userId = req.body.id;
    console.log(req.body, "userId im delete user")
    const user = await UserModel.findById(userId).populate("ekyc");

    if (!user) {
      console.log("User Not Found")
      return res.status(404).send({ success: false, message: "User not found" });
    }

    console.log(`[INFO] 🔄 Removing user-related data for user: ${userId}`);

    // 3. Collect all images to delete
    const userImages = [];

    if (user.profilePic) userImages.push(user.profilePic);
    if (user.frontAadhar) userImages.push(user.frontAadhar);
    if (user.backAadhar) userImages.push(user.backAadhar);

    // 4. Delete eKYC images + document
    if (user.ekyc) {
      const { panCardfront, panCardback, bankProof, _id: ekycId } = user.ekyc;
      if (panCardfront) userImages.push(panCardfront);
      if (panCardback) userImages.push(panCardback);
      if (bankProof) userImages.push(bankProof);

      await KYCModel.findByIdAndDelete(ekycId);
      console.log("[INFO] ✅ Deleted eKYC document");
    }

    // 5. Delete withdrawal documents (no proofImage field now)
    await WithdrawModel.deleteMany({ user: userId });
    console.log("[INFO] ✅ Deleted all withdrawal records for the user");

    // 5.5. Delete user's banners and banner images
    const userBanners = await Banner.find({ userId: userId });

    if (userBanners.length) {
      const bannerImages = userBanners.map((banner) => banner.imageUrl);

      // Delete banner images from S3
      await Promise.all(bannerImages.map((key) => deleteS3File(key)));
      console.log("[INFO] ✅ Deleted user's banner images from AWS");

      // Delete banner documents
      await Banner.deleteMany({ userId: userId });
      console.log("[INFO] ✅ Deleted all banner documents for the user");
    }

    // 6. Delete all collected images from AWS
    await Promise.all(userImages.map((key) => deleteS3File(key)));
    console.log("[INFO] ✅ Deleted all user's images from AWS");

    // 7. Soft delete user and nullify sensitive fields
    const nullifiedFields = {
      isDeleted: true,
      userstatus: null,
      userAverageRating: null,
      userRatingCount: 0,
      providerAverageRating: null,
      providerRatingCount: 0,
      referralCode: null,
      notifications: [],
      profilePic: "",
      backAadhar: "",
      frontAadhar: "",
    };

    // await UserModel.findByIdAndUpdate(userId, nullifiedFields);
    await UserModel.findByIdAndDelete(userId);
    console.log("[SUCCESS] 🚫 User marked as deleted & cleaned");

    return res.status(200).send({
      success: true,
      message: "User marked as deleted successfully"
    });

  } catch (error) {
    console.log("[ERROR] ❌", error);
    return res.status(500).send({
      success: false,
      message: "An error occurred while deleting the user",
      error: error.message,
    });
  }
};

const UpdateUser = async (req, res) => {
  try {
    const {
      userId,
      name,
      email,
      phone,
      address,
      businessCategory,
      businessName,
      businessAddress,
      businessDetaile,
    } = req.body;

    console.log("🔹 Incoming Update Request for User:", userId);

    // Validate userId format early
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID ❌",
      });
    }

    // Construct updatedFields dynamically (skip undefined/null values)
    const updatedFields = {};

    if (name) updatedFields.name = name;
    if (email) updatedFields.email = email;
    if (phone) updatedFields.phone = phone;

    if (address) {
      try {
        const parsedAddress =
          typeof address === "string" ? JSON.parse(address) : address;
        updatedFields.address = parsedAddress;
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Invalid address format. Must be JSON.",
        });
      }
    }

    if (businessCategory) updatedFields.businessCategory = businessCategory;
    if (businessName) updatedFields.businessName = businessName;
    if (businessAddress) updatedFields.businessAddress = businessAddress;
    if (typeof businessDetaile !== "undefined")
      updatedFields.businessDetaile = businessDetaile;

    if (Object.keys(updatedFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update provided ⚠️",
      });
    }

    // 🔄 Update user
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $set: updatedFields },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found 🚫",
      });
    }

    console.log("✅ User updated:", updatedUser._id);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully 🎉",
      user: updatedUser,
    });
  } catch (error) {
    console.error("🔥 Error Updating User:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the profile ❗",
      error: error.message,
    });
  }
};

const setUserStatus = async (req, res) => {
  try {
    console.log("🔍 Received request to update user status"); // Log request start

    const userId = req.user?.id; // Ensure user ID is available
    console.log(userId, "userId");
    if (!userId) {
      console.log("❌ User ID missing in request");
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized request" });
    }

    const { userstatus } = req.body;

    // Validate status
    if (!userstatus || !["available", "unavailable"].includes(userstatus)) {
      console.log("❌ Invalid status value:", userstatus);
      return res.status(400).json({
        success: false,
        message:
          "Invalid status value. Please choose 'available' or 'unavailable'.",
      });
    }

    console.log(`🛠 Updating status for user ${userId} to ${userstatus}`);

    // Measure query execution time
    const startTime = Date.now();
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $set: { userstatus } },
      { new: true, select: "userstatus" } // ✅ Returns the updated document with only `userstatus`
    );

    console.log(updatedUser, "updatedUser");
    const endTime = Date.now();
    console.log(`✅ Database update completed in ${endTime - startTime}ms`);

    // If user not found, return an error
    if (!updatedUser) {
      console.log("❌ User not found:", userId);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("✅ User status updated successfully:", updatedUser.userstatus);
    return res.status(200).json({
      success: true,
      message: `User status updated to ${userstatus}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("🔥 Error in setUserStatus:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the user status",
      error: error.message,
    });
  }
};

const setUserStatusMobile = async (req, res) => {
  try {
    console.log("🔍 Received request to update user status");

    const { userId, userstatus } = req.body;

    // Ensure user ID is provided
    if (!userId) {
      console.log("❌ User ID missing in request");
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Validate status
    if (!userstatus || !["available", "unavailable"].includes(userstatus)) {
      console.log("❌ Invalid status value:", userstatus);
      return res.status(400).json({
        success: false,
        message: "Invalid status value. Use 'available' or 'unavailable'.",
      });
    }

    console.log(`🛠 Updating status for user ${userId} to ${userstatus}`);

    // Measure query execution time
    const startTime = Date.now();
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $set: { userstatus } },
      { new: true, select: "userstatus" }
    );

    const endTime = Date.now();
    console.log(`✅ Database update completed in ${endTime - startTime}ms`);

    if (!updatedUser) {
      console.log("❌ User not found:", userId);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("✅ User status updated successfully:", updatedUser.userstatus);
    return res.status(200).json({
      success: true,
      message: `User status updated to ${userstatus}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("🔥 Error in setUserStatus:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the user status",
      error: error.message,
    });
  }
};

const updateRoleByEmail = async (req, res) => {
  try {
    const { email, role } = req.body;

    // Validate role
    if (!role || !["User", "Admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role value. Please choose 'User' or 'Admin'.",
      });
    }

    // Find the user by email and update their role
    const updatedUser = await UserModel.findOneAndUpdate(
      { email: email },
      { role: role },
      { new: true, runValidators: true }
    );

    // If user not found, return an error
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Respond with success
    return res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the user role",
      error: error.message,
    });
  }
};

const createTransporter = () => {
  return nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER, // Your Gmail address
      pass: process.env.EMAIL_PASS, // 16-char App Password
    },
  });
};

// Function to send email
const sendEmail = async (to, subject, text) => {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  });
};

// Forgot Password API
const forgotPassword = async (req, res) => {
  try {
    const { email, phone } = req.body;
    console.log(req.body, "Request Body");

    let user;

    // Handle email-based reset
    if (email) {
      user = await UserModel.findOne({ email });
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Email not found" });
      }

      // Generate 6-digit reset code
      const resetCode = crypto.randomInt(100000, 999999).toString();
      console.log(resetCode, "resetCode");
      // Update user without triggering full validation
      await UserModel.updateOne(
        { _id: user._id },
        {
          $set: {
            resetCode,
            resetCodeExpires: Date.now() + 10 * 60 * 1000, // Code valid for 10 minutes
          },
        }
      );

      console.log(user, "user1");
      // Send reset code via email
      await sendEmail(
        email,
        "Password Reset Code",
        `Your password reset code is ${resetCode}`
      );

      return res
        .status(200)
        .json({ success: true, message: "6-digit code sent to your email" });
    }

    // Handle phone-based reset
    if (phone) {
      user = await UserModel.findOne({ phone });
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Phone number not found" });
      }
      return res
        .status(200)
        .json({ success: true, message: "Email required for further steps" });
    }

    // If neither email nor phone is provided
    return res
      .status(400)
      .json({ success: false, message: "Email or phone is required" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    console.log(req.body, "rb2");

    const user = await UserModel.findOne({
      email,
      resetCode: code,
      resetCodeExpires: { $gt: Date.now() },
    });
    console.log(user, "user1");

    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired code" });

    return res
      .status(200)
      .json({ success: true, message: "Code verified successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    if (!email) {
      return res.status(400).send({
        success: false,
        message: "email required.",
      });
    }

    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 4 characters long.",
      });
    }

    const user = await UserModel.findOne({
      email,
      resetCodeExpires: { $gt: Date.now() },
    });
    console.log(user, "user3");
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired reset code" });

    // Hash the new password before saving it
    const salt = await bcrypt.genSalt(10); // Generate salt
    const hashedPassword = await bcrypt.hash(newPassword, salt); // Hash the password

    // Update the user's password without triggering full validation
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
        },
        $unset: {
          resetCode: "",
          resetCodeExpires: "",
        },
      }
    );

    return res
      .status(200)
      .json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getrequests = async (req, res) => {
  try {
    const { userId } = req.body;
    console.log(userId);
    // Check if the userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID format" });
    }
    const user = await UserModel.findById(userId)
      .select("sended_requests received_requests")
      .lean();

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "request get successfully",
      user,
    });
  } catch (error) {
    console.log("Error fetching requests:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await UserModel.findById(id).select(
      "-received_requests -sended_requests -password -resetCode -resetCodeExpires"
    );
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.log("Error fetching user by ID:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  registerUserweb,
  loginUserweb,
  getalluser,
  getUser,
  getUserMobile,
  logout,
  getAdmin,
  updateProfile,
  updateProfileMobile,
  deleteUser,
  UpdateUser,
  setUserStatus,
  updateRoleByEmail,
  approveUser,
  setUserStatusMobile,
  resetPassword,
  verifyCode,
  forgotPassword,
  updateUsersPaymentVerified,
  getrequests,
  updateReferralChain,
  getUserById,
  updateRegistrationStep2,
  updateRegistrationStep3,
  updateRegistrationStep1,
  checkUserStatus,
  rejectUserStep,
};
