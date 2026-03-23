const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const AuditLog = require('../models/AuditLog');
const FormData = require('form-data'); // Ensure you have form-data installed

const storageClient = new Storage({
  keyFilename: path.join(__dirname, '../gcs-key.json'),
});
const bucketName = process.env.GCS_BUCKET_NAME;

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
    // 1. Prepare Multipart Form Data to send the actual file to Java
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('clientId', clientId);

    const javaResponse = await fetch(`${process.env.BASE_URL}/api/sign-local`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });

    if (!javaResponse.ok) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(500).json({ success: false, error: "Java service failed to process image" });
    }

    // Get the processed image data and metadata from headers
    const processedImageBuffer = Buffer.from(await javaResponse.arrayBuffer());
    const xmpPayload = javaResponse.headers.get('X-XMP-Payload');

    // Overwrite the local file with the watermarked version from Java
    fs.writeFileSync(filePath, processedImageBuffer);

    // 2. Upload the watermarked file to Google Cloud Storage
    const bucket = storageClient.bucket(bucketName);
    await bucket.upload(filePath, {
      destination: filename,
    });

    // 3. Generate Signed URL
    const options = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000,
    };
    const [signedUrl] = await bucket.file(filename).getSignedUrl(options);

    // 4. Delete temp file
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    // 5. Save audit log
    const manifestData = { status: "COMPLIANT", xmp_payload: xmpPayload };
    const newLog = new AuditLog({
      assetHash: filename,
      clientId,
      fullManifest: JSON.stringify(manifestData)
    });
    await newLog.save();

    res.status(201).json({
      success: true,
      manifest: manifestData,
      downloadPath: signedUrl
    });

  } catch (error) {
    console.error("Processing Error:", error);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: "Failed to process and upload the asset." });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const logs = await AuditLog.find({ clientId: req.user.id }).sort({ timestamp: -1 });
    const bucket = storageClient.bucket(bucketName);
    const options = { version: 'v4', action: 'read', expires: Date.now() + 15 * 60 * 1000 };

    const logsWithSecureUrls = await Promise.all(logs.map(async (log) => {
      const [signedUrl] = await bucket.file(log.assetHash).getSignedUrl(options);
      return { ...log.toObject(), signedUrl };
    }));

    res.json({ success: true, logs: logsWithSecureUrls });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
};