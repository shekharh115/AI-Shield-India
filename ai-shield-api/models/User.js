const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // Add this field to store the unique API key
  apiKey: { type: String, unique: true },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);