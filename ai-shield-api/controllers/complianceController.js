const path = require('path');
const multer = require('multer');
const AuditLog = require('../models/AuditLog');

// Configure storage for uploaded images
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

exports.uploadMiddleware = upload.single('asset');

// Process and sign the asset via the Spring Boot Microservice
exports.signAsset = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const filePath = path.resolve(req.file.path);
  const clientId = req.user.id;

  try {
    // 1. Send HTTP request to the running Spring Boot service
    const javaResponse = await fetch('http://localhost:8080/api/sign-local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath, clientId })
    });

    const manifestData = await javaResponse.json();

    if (!javaResponse.ok) {
      return res.status(500).json({ success: false, error: manifestData.error });
    }

    // 2. Save the audit log to MongoDB
    // We convert the JSON manifest into a string for the database
    const newLog = new AuditLog({
      assetHash: req.file.filename,
      clientId,
      fullManifest: JSON.stringify(manifestData)
    });
    await newLog.save();

    // 3. Return success to React
    res.status(201).json({
      success: true,
      manifest: manifestData,
      downloadPath: req.file.path
    });

  } catch (error) {
    console.error("Microservice Connection Error:", error);
    res.status(500).json({ error: "Failed to connect to the Signing Service. Is the Java server running?" });
  }
};

// Fetch history for the logged-in user (remains unchanged)
exports.getHistory = async (req, res) => {
  try {
    const logs = await AuditLog.find({ clientId: req.user.id }).sort({ timestamp: -1 });
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
};