const { exec } = require('child_process');
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

exports.uploadMiddleware = upload.single('asset'); // 'asset' is the field name from React

exports.signAsset = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const filePath = path.resolve(req.file.path);
  const clientId = req.body.clientId || "unknown_client";

  // Update command to pass the actual file path to Java
  const jarPath = path.join(__dirname, '../../Shield/target/Shield-1.0-SNAPSHOT-jar-with-dependencies.jar');
  const cmd = `java -jar "${jarPath}" "${filePath}" "${clientId}"`;

  exec(cmd, async (error, stdout, stderr) => {
    if (error) return res.status(500).json({ success: false, error: stderr });

    try {
      const newLog = new AuditLog({
        assetHash: req.file.filename, // Using filename as identifier for now
        clientId,
        fullManifest: stdout.trim()
      });
      await newLog.save();

      res.status(201).json({
        success: true,
        manifest: stdout.trim(),
        downloadPath: req.file.path // Path to the now-certified image
      });
    } catch (dbError) {
      res.status(500).json({ error: dbError.message });
    }
  });
};