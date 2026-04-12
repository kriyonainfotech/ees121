const AWS = require("aws-sdk");
const sharp = require("sharp");
require("dotenv").config();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Function to upload an image (with compression)
const uploadImage = async (file) => {
  const compressedBuffer = await sharp(file.buffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toBuffer();

  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: `uploads/${Date.now()}-${file.originalname.replace(/\.[^.]+$/, "")}.jpg`,
    Body: compressedBuffer,
    ContentType: "image/jpeg",
  };

  return s3.upload(params).promise();
};


module.exports = { s3, uploadImage };

// const AWS = require("aws-sdk");
// const crypto = require("crypto");

// const s3 = new AWS.S3({
//   region: process.env.AWS_REGION,
// });

// const uploadImage = async (file) => {
//   const params = {
//     Bucket: process.env.AWS_S3_BUCKET_NAME,
//     Key: `uploads/${Date.now()}-${crypto.randomBytes(8).toString("hex")}-${file.originalname}`,
//     Body: file.buffer,
//     ContentType: file.mimetype,
//     ACL: "private",
//   };

//   return s3.upload(params).promise();
// };

// module.exports = { s3, uploadImage };