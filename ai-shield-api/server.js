require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { uploadMiddleware, signAsset } = require('./controllers/complianceController');
const { register, login } = require('./controllers/authController');

const app = express();
app.use(express.json()); // Parses incoming JSON requests

const cors = require('cors');
app.use(cors()); // Place this BEFORE your routes

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Audit Vault Connected"))
    .catch(err => console.error("❌ DB Error:", err));

// The Compliance Endpoint
const auth = require('./middleware/auth');
app.post('/api/v1/sign', auth, uploadMiddleware, signAsset);

// Add this temporary route to generate a test token
const jwt = require('jsonwebtoken');

//app.get('/api/v1/get-test-token', (req, res) => {
//  const payload = { user: { id: "test_user_id" } };
//
//  // Sign the token using your secret key from .env
//  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
//    if (err) throw err;
//    res.json({ token });
//  });
//});


app.post('/api/v1/register', register);
app.post('/api/v1/login', login);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 AI-Shield API active on port ${PORT}`));