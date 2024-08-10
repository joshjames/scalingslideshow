const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const uuid = require('uuid').v4;

const s3 = new AWS.S3();
const sqs = new AWS.SQS();

// S3 bucket name and SQS queue URL
const BUCKET_NAME = process.env.S3_BUCKET;
const QUEUE_URL = process.env.SQS_QUEUE;

// Function to download a file from S3
const downloadFile = async (bucket, key, downloadPath) => {
  const params = {
    Bucket: bucket,
    Key: key
  };
  const file = fs.createWriteStream(downloadPath);
  return new Promise((resolve, reject) => {
    s3.getObject(params).createReadStream().pipe(file)
      .on('close', resolve)
      .on('error', reject);
  });
};

// Function to upload a file to S3
const uploadFile = async (bucket, key, uploadPath) => {
  const fileContent = fs.readFileSync(uploadPath);
  const params = {
    Bucket: bucket,
    Key: key,
    Body: fileContent
  };
  return s3.upload(params).promise();
};

// Function to process the SQS message
const processMessage = async (message) => {
  const { bucket, key } = JSON.parse(message.Body);
  const downloadPath = path.join('/tmp', path.basename(key));
  const videoPath = path.join('/tmp', `${uuid()}.mp4`);

  try {
    // Download the photo from S3
    await downloadFile(bucket, key, downloadPath);

    // Create a video slideshow using ffmpeg
    const ffmpegCommand = `ffmpeg -loop 1 -i ${downloadPath} -c:v libx264 -t 10 -pix_fmt yuv420p -vf "scale=1280:720" ${videoPath}`;
    await new Promise((resolve, reject) => {
      exec(ffmpegCommand, (error, stdout, stderr) => {
        if (error) {
          console.error(`ffmpeg error: ${stderr}`);
          return reject(error);
        }
        console.log(`ffmpeg output: ${stdout}`);
        resolve();
      });
    });

    // Upload the video to S3
    const videoKey = `videos/${path.basename(videoPath)}`;
    await uploadFile(bucket, videoKey, videoPath);

    // Delete the message from the queue
    const deleteParams = {
      QueueUrl: QUEUE_URL,
      ReceiptHandle: message.ReceiptHandle
    };
    await sqs.deleteMessage(deleteParams).promise();

    console.log('Job processed successfully.');
  } catch (error) {
    console.error('Error processing job:', error);
  } finally {
    // Clean up temporary files
    fs.unlinkSync(downloadPath);
    fs.unlinkSync(videoPath);
  }
};

// Function to poll the SQS queue for messages
const pollQueue = async () => {
  const params = {
    QueueUrl: QUEUE_URL,
    MaxNumberOfMessages: 1,
    WaitTimeSeconds: 20
  };

  try {
    const data = await sqs.receiveMessage(params).promise();
    if (data.Messages && data.Messages.length > 0) {
      await processMessage(data.Messages[0]);
    }
  } catch (error) {
    console.error('Error polling queue:', error);
  }
};

// Start polling the queue
setInterval(pollQueue, 5000);