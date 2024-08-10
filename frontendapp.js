const express = require('express');
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const uuid = require('uuid').v4;

const app = express();
const port = 3000;

// Configure AWS SDK
AWS.config.update({ region: 'us-east-1' });
const s3 = new AWS.S3();
const sqs = new AWS.SQS();

// S3 bucket name and SQS queue URL
const BUCKET_NAME = process.env.S3_BUCKET;
const QUEUE_URL = process.env.SQS_QUEUE;

// Set up multer to use S3 for storage
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: BUCKET_NAME,
    key: function (req, file, cb) {
      const fileName = `${uuid()}-${file.originalname}`;
      cb(null, fileName);
    }
  })
});

// API endpoint to handle photo uploads
app.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    const file = req.file;
    const messageBody = {
      bucket: BUCKET_NAME,
      key: file.key
    };

    // Send message to SQS queue
    const params = {
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify(messageBody)
    };
    await sqs.sendMessage(params).promise();

    res.status(200).send({ message: 'Photo uploaded and job queued successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to upload photo and queue job.' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});