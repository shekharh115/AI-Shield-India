require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { uploadMiddleware, signAsset, getHistory } = require('./controllers/complianceController');
const { register, login } = require('./controllers/authController');

const app = express();
app.use(express.json()); // Parses incoming JSON requests

const cors = require('cors');
app.use(cors()); // Place this BEFORE your routes

// Allow the React frontend to download files from the uploads folder
app.use('/uploads', express.static('uploads'));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Audit Vault Connected"))
    .catch(err => console.error("❌ DB Error:", err));

// Middlewares
const auth = require('./middleware/auth');

// The Compliance Endpoints
app.post('/api/v1/sign', auth, uploadMiddleware, signAsset);
app.get('/api/v1/history', auth, getHistory);

// Authentication Endpoints
app.post('/api/v1/register', register);
app.post('/api/v1/login', login);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 AI-Shield API active on port ${PORT}`));