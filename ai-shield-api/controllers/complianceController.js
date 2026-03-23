const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const AuditLog = require('../models/AuditLog');

// Initialize Google Cloud Storage Client
const storageClient = new Storage({
  keyFilename: path.join(__dirname, '../gcs-key.json'),
});
const bucketName = process.env.GCS_BUCKET_NAME;

// Configure local storage TEMPORARILY
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
    // 1. Send HTTP request to the running Spring Boot service
    const url = `${process.env.BASE_URL}/api/sign-local`;
    console.log('######', url);
    const javaResponse = await fetch(`${process.env.BASE_URL}/api/sign-local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath, clientId })
    });

    const manifestData = await javaResponse.json();

    console.log("Java Service Response:", manifestData );

    if (!javaResponse.ok) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(500).json({ success: false, error: manifestData.error });
    }

    // 2. Upload the file to Google Cloud Storage
    const bucket = storageClient.bucket(bucketName);
    await bucket.upload(filePath, {
      destination: filename,
    });

    // 3. GENERATE A SECURE SIGNED URL (Valid for 15 minutes)
    const options = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 mins from now
    };
    const [signedUrl] = await bucket.file(filename).getSignedUrl(options);

    // 4. Delete the temporary local file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 5. Save the audit log to MongoDB
    const newLog = new AuditLog({
      assetHash: filename,
      clientId,
      fullManifest: JSON.stringify(manifestData)
    });
    await newLog.save();

    // 6. Return success to React, passing the temporary Signed URL
    res.status(201).json({
      success: true,
      manifest: manifestData,
      downloadPath: signedUrl
    });

  } catch (error) {
    console.error("Microservice/GCS Connection Error:", error);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: "Failed to process and upload the asset to cloud." });
  }
};

exports.getHistory = async (req, res) => {
  try {
    // Fetch logs from MongoDB
    const logs = await AuditLog.find({ clientId: req.user.id }).sort({ timestamp: -1 });

    const bucket = storageClient.bucket(bucketName);
    const options = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 mins from now
    };

    // GENERATE SECURE SIGNED URLS FOR EVERY ITEM IN HISTORY
    const logsWithSecureUrls = await Promise.all(logs.map(async (log) => {
      const [signedUrl] = await bucket.file(log.assetHash).getSignedUrl(options);

      // Convert mongoose document to a plain object and attach the secure URL
      return { ...log.toObject(), signedUrl };
    }));

    res.json({ success: true, logs: logsWithSecureUrls });
  } catch (error) {
    console.error("History Error:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
};