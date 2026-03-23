const User = require('../models/User');

const apiKeyAuth = async (req, res, next) => {
  const submittedKey = req.header('x-api-key');

  // 1. Check if the key was provided
  if (!submittedKey) {
    return res.status(401).json({ error: "Access Denied: No API Key provided" });
  }

  try {
    // 2. Find the user who owns this API key
    const keyOwner = await User.findOne({ apiKey: submittedKey });

    if (!keyOwner) {
      return res.status(403).json({ error: "Access Denied: Invalid API Key" });
    }

    // 3. CRITICAL SECURITY CHECK:
    // Compare the ID from the JWT (req.user.id) with the ID of the API Key owner
    if (req.user.id !== keyOwner.id.toString()) {
      return res.status(403).json({
        error: "Security Alert: This API Key does not belong to your account."
      });
    }

    // If they match, proceed
    req.apiKeyUser = keyOwner;
    next();
  } catch (err) {
    console.error("Auth Error:", err);
    res.status(500).json({ error: "Server error during validation" });
  }
};

module.exports = apiKeyAuth;