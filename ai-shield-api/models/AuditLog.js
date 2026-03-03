const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    assetHash: { type: String, required: true, index: true },
    clientId: { type: String, required: true },
    fullManifest: { type: String, required: true }, // The XML from Java
    timestamp: {
        type: Date,
        default: Date.now,
        expires: '180d' // Automates IT Rules 2026 compliance
    }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);