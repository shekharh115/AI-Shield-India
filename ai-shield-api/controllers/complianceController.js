const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const AuditLog = require('../models/AuditLog');
const FormData = require('form-data');

const storageClient = new Storage({
  keyFilename: path.join(__dirname, '../gcs-key.json'),
});
const bucketName = process.env.GCS_BUCKET_NAME;

const upload = multer({ dest: 'uploads/' });
exports.uploadMiddleware = upload.single('asset');

exports.signAsset = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const filePath = path.resolve(req.file.path);
  const filename = req.file.filename;
  const originalName = req.file.originalname;
  const clientId = req.user.id;

  try {
    // 1. Use FormData properly
    const form = new FormData();
    // Use fs.createReadStream to pipe the file without loading it all into memory
    form.append('file', fs.createReadStream(filePath), {
        filename: originalName,
        contentType: req.file.mimetype,
    });
    form.append('clientId', clientId);

    // 2. Send to Java
    const javaResponse = await fetch(`${process.env.BASE_URL}/api/sign-local`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(), // Let FormData generate the boundary
    });

    if (!javaResponse.ok) {
        const errorText = await javaResponse.text();
        throw new Error(`Java service failed: ${errorText}`);
    }

    // 3. Receive the watermarked image back
    const arrayBuffer = await javaResponse.arrayBuffer();
    const processedBuffer = Buffer.from(arrayBuffer);
    const xmpPayload = javaResponse.headers.get('X-XMP-Payload');

    // Overwrite the local file with the processed version
    fs.writeFileSync(filePath, processedBuffer);

    // 4. Upload to Cloud
    const bucket = storageClient.bucket(bucketName);
    await bucket.upload(filePath, { destination: filename });

    const options = { version: 'v4', action: 'read', expires: Date.now() + 15 * 60 * 1000 };
    const [signedUrl] = await bucket.file(filename).getSignedUrl(options);

    // Clean up local temp file
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    // 5. Audit Log
    const manifestData = { status: "COMPLIANT", xmp_payload: xmpPayload };
    const newLog = new AuditLog({
      assetHash: filename,
      clientId,
      fullManifest: JSON.stringify(manifestData)
    });
    await newLog.save();

    res.status(201).json({ success: true, manifest: manifestData, downloadPath: signedUrl });

  } catch (error) {
    console.error("Pipeline Error:", error);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: error.message || "Failed to process asset" });
  }
};

exports.getHistory = async (req, res) => {
    try {
      const logs = await AuditLog.find({ clientId: req.user.id }).sort({ timestamp: -1 });
      const bucket = storageClient.bucket(bucketName);
      const options = { version: 'v4', action: 'read', expires: Date.now() + 15 * 60 * 1000 };

      const logsWithSecureUrls = await Promise.all(logs.map(async (log) => {
        try {
            const [signedUrl] = await bucket.file(log.assetHash).getSignedUrl(options);
            return { ...log.toObject(), signedUrl };
        } catch (e) {
            return { ...log.toObject(), signedUrl: null };
        }
      }));

      res.json({ success: true, logs: logsWithSecureUrls });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch history" });
    }
  };