require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const limiter = require('./middleware/rateLimiter');
const apiKeyAuth = require('./middleware/apiKeyAuth');

const { uploadMiddleware, signAsset, getHistory } = require('./controllers/complianceController');
const { register, login } = require('./controllers/authController');

const app = express();

app.set('trust proxy', 1);

// Protect the entire server from spam/DDoS
app.use(limiter);

app.use(express.json());
app.use(cors());
app.use('/uploads', express.static('uploads'));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Audit Vault Connected"))
    .catch(err => console.error("❌ DB Error:", err));

const auth = require('./middleware/auth');

// Compliance Endpoints: Now requires BOTH a valid JWT and a valid Personal API Key
app.post('/api/v1/sign', [auth, apiKeyAuth], uploadMiddleware, signAsset);
app.get('/api/v1/history', [auth, apiKeyAuth], getHistory);

// Auth Endpoints (No API key needed to register or login)
app.post('/api/v1/register', register);
app.post('/api/v1/login', login);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 AI-Shield API active on port ${PORT}`));