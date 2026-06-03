const express = require("express");
const router = express.Router();
const multer = require("multer");
const AWS = require("aws-sdk");
const path = require("path");
const sharp = require("sharp");
const {
  addCategory,
  updateCategory,
  deleteCategory,
  getAllCategory,
} = require("../controllers/categoryController");

// AWS config
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Multer middleware (to memory) — no size limit compression, just store as-is
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max, no compression applied
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum allowed size is 50MB.",
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
};

// Raw S3 upload — no compression, no resizing, original file uploaded as-is
const uploadRawImageToS3 = async (fileBuffer, fileName, mimeType) => {
  const ext = path.extname(fileName) || ".png";
  const baseName = path.basename(fileName, ext);
  const s3FileName = `category/${Date.now()}-${baseName}${ext}`;

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: s3FileName,
    Body: fileBuffer,
    ContentType: mimeType,
  };

  const uploadResult = await s3.upload(params).promise();
  return uploadResult.Location;
};

// Image processor middleware — uploads original file directly, no edits
const processCategoryImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded ❌" });
    }

    // Process image to ensure transparency is flattened to WHITE instead of black
    const processedBuffer = await sharp(req.file.buffer)
      .flatten({ background: '#ffffff' }) // Ensure white background for transparency
      .toBuffer();

    const imageUrl = await uploadRawImageToS3(
      processedBuffer,
      req.file.originalname,
      req.file.mimetype
    );
    req.body.image = imageUrl;

    next();
  } catch (error) {
    console.error("🛑 Error in S3 upload/processing:", error);
    return res.status(500).json({ message: "Image processing/upload failed", error });
  }
};

// Routes
router.post(
  "/addCategory",
  upload.single("category"),
  handleMulterError,
  processCategoryImage,
  addCategory
);

router.post(
  "/updateCategory",
  upload.single("categoryImg"),
  handleMulterError,
  processCategoryImage,
  updateCategory
);

router.delete("/deleteCategory", deleteCategory);
router.get("/getAllCategory", getAllCategory);

module.exports = router;
