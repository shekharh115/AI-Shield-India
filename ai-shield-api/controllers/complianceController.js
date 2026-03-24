const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const AuditLog = require('../models/AuditLog');
const FormData = require('form-data'); // Ensure you run: npm install form-data
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Initialize Google Cloud Storage Client
const storageClient = new Storage({
  keyFilename: path.join(__dirname, '../gcs-key.json'),
});
const bucketName = process.env.GCS_BUCKET_NAME;

// Configure local storage (Still used for initial receipt from user)
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
    // 1. Prepare Multipart Form Data to stream file to Java
    const form = new FormData();
    form.append('asset', fs.createReadStream(filePath));
    form.append('clientId', clientId);

    // 2. Send request to the Java microservice
    const javaResponse = await fetch('https://ai-shield-gsxr.onrender.com/api/sign-local', {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });

    if (!javaResponse.ok) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(500).json({ success: false, error: "Java processing failed" });
    }

    // 3. Extract the image buffer and decode the XMP header
    const processedImageBuffer = await javaResponse.buffer();
    const encodedXmp = javaResponse.headers.get('X-XMP-Payload');
    const xmpPayload = Buffer.from(encodedXmp, 'base64').toString('utf-8');

    // 4. Upload the PROCESSED buffer to Google Cloud Storage
    const bucket = storageClient.bucket(bucketName);
    const blob = bucket.file(filename);

    await new Promise((resolve, reject) => {
        const blobStream = blob.createWriteStream({
            resumable: false,
            contentType: req.file.mimetype,
        });
        blobStream.on('error', reject);
        blobStream.on('finish', resolve);
        blobStream.end(processedImageBuffer);
    });

    // 5. Generate a secure signed URL
    const options = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000,
    };
    const [signedUrl] = await blob.getSignedUrl(options);

    // 6. Cleanup local file
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    // 7. Save Audit Log
    const newLog = new AuditLog({
      assetHash: filename,
      clientId,
      fullManifest: JSON.stringify({
          status: "COMPLIANT",
          xmp_payload: xmpPayload
      })
    });
    await newLog.save();

    res.status(201).json({
      success: true,
      manifest: { status: "COMPLIANT", xmp_payload: xmpPayload },
      downloadPath: signedUrl
    });

  } catch (error) {
    console.error("Processing Error:", error);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: "Cloud upload or processing failed" });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const logs = await AuditLog.find({ clientId: req.user.id }).sort({ timestamp: -1 });
    const bucket = storageClient.bucket(bucketName);
    const options = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000,
    };

    const logsWithSecureUrls = await Promise.all(logs.map(async (log) => {
      const [signedUrl] = await bucket.file(log.assetHash).getSignedUrl(options);
      return { ...log.toObject(), signedUrl };
    }));

    res.json({ success: true, logs: logsWithSecureUrls });
  } catch (error) {
    console.error("History Error:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
};