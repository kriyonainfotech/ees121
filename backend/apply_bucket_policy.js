const AWS = require('aws-sdk');
require('dotenv').config();

const s3 = new AWS.S3({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const BUCKET = process.env.AWS_BUCKET_NAME;

async function applyBucketPolicy() {
    const policy = {
        Version: "2012-10-17",
        Statement: [
            {
                Sid: "PublicReadGetObject",
                Effect: "Allow",
                Principal: "*",
                Action: "s3:GetObject",
                Resource: [
                    `arn:aws:s3:::${BUCKET}/user-images/*`,
                    `arn:aws:s3:::${BUCKET}/banner/*`
                ]
            }
        ]
    };

    const params = {
        Bucket: BUCKET,
        Policy: JSON.stringify(policy)
    };

    console.log(`Applying public read policy to bucket: ${BUCKET}`);
    try {
        await s3.putBucketPolicy(params).promise();
        console.log("Bucket policy applied successfully! Images should now be public.");
    } catch (error) {
        console.error("Error applying bucket policy:", error.message);
        if (error.code === 'AccessDenied') {
            console.error("Permission denied. This bucket likely has 'Block Public Access' enabled.");
        }
    }
}

applyBucketPolicy();
