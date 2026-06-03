const AWS = require('aws-sdk');
require('dotenv').config();

const s3 = new AWS.S3({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const BUCKET = process.env.AWS_BUCKET_NAME;

async function fixPermissions() {
    console.log(`Starting to fix permissions for bucket: ${BUCKET}`);

    try {
        const folders = ['user-images/', 'banner/'];

        for (const prefix of folders) {
            console.log(`Checking folder: ${prefix}`);
            const listParams = {
                Bucket: BUCKET,
                Prefix: prefix,
            };

            const data = await s3.listObjectsV2(listParams).promise();

            if (!data.Contents || data.Contents.length === 0) {
                console.log(`No objects found in ${prefix}`);
                continue;
            }

            console.log(`Found ${data.Contents.length} objects in ${prefix}`);

            for (const obj of data.Contents) {
                console.log(`Setting public-read for: ${obj.Key}`);
                try {
                    await s3.putObjectAcl({
                        Bucket: BUCKET,
                        Key: obj.Key,
                        ACL: 'public-read',
                    }).promise();
                } catch (aclError) {
                    console.error(`Failed to set ACL for ${obj.Key}:`, aclError.message);
                }
            }
        }

        console.log('Finished fixing permissions!');
    } catch (error) {
        console.error('Error fixing permissions:', error);
    }
}

fixPermissions();
