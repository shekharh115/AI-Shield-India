require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { uploadMiddleware, signAsset } = require('./controllers/complianceController');

const app = express();
app.use(express.json()); // Parses incoming JSON requests

const cors = require('cors');
app.use(cors()); // Place this BEFORE your routes

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Audit Vault Connected"))
    .catch(err => console.error("❌ DB Error:", err));

// The Compliance Endpoint
app.post('/api/v1/sign',uploadMiddleware, signAsset);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 AI-Shield API active on port ${PORT}`));