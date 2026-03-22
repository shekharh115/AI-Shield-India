const path = require('path');
const fs = require('fs'); // Built-in Node module to handle file deletion
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const AuditLog = require('../models/AuditLog');

// 1. Initialize Google Cloud Storage Client
// Make sure gcs-key.json is in your ai-shield-api folder and GCS_BUCKET_NAME is in .env
const storageClient = new Storage({
  keyFilename: path.join(__dirname, '../gcs-key.json'),
});
const bucketName = process.env.GCS_BUCKET_NAME;

// 2. Configure local storage TEMPORARILY for the Java service
const localStorage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: localStorage });

exports.uploadMiddleware = upload.single('asset');

exports.signAsset = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const filePath = path.resolve(req.file.path);
  const filename = req.file.filename;
  const clientId = req.user.id;

  try {
    // A. Send HTTP request to the running Spring Boot service
    const javaResponse = await fetch('http://localhost:8080/api/sign-local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath, clientId })
    });

    const manifestData = await javaResponse.json();

    if (!javaResponse.ok) {
      // Clean up the local file if the Java service fails
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(500).json({ success: false, error: manifestData.error });
    }

    // B. Upload the file to Google Cloud Storage
    const bucket = storageClient.bucket(bucketName);
    await bucket.upload(filePath, {
      destination: filename,
    });

    // Make the file public so React can display/download it directly
//    await bucket.file(filename).makePublic();
    const publicGcsUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;

    // C. Delete the temporary local file to save server space!
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // D. Save the audit log to MongoDB
    const newLog = new AuditLog({
      assetHash: filename,
      clientId,
      fullManifest: JSON.stringify(manifestData)
    });
    await newLog.save();

    // E. Return success to React, providing the cloud URL
    res.status(201).json({
      success: true,
      manifest: manifestData,
      downloadPath: publicGcsUrl // Updated to point to the cloud
    });

  } catch (error) {
    console.error("Microservice/GCS Connection Error:", error);
    // Clean up local file if an error occurs during upload
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: "Failed to process and upload the asset to cloud." });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const logs = await AuditLog.find({ clientId: req.user.id }).sort({ timestamp: -1 });
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
};