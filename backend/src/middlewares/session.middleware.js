const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { MESSAGES } = require('../config/constants');
const { sendUnauthorized } = require('../utils/response.util');
const tokenMap = require("../utils/tokenMap");

//Verify JWT token middleware
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendUnauthorized(res, MESSAGES.UNAUTHORIZED);
    }

    const token = authHeader.split(' ')[1];

    req.user = jwt.verify(token, env.JWT_SECRET);
    if (tokenMap.has(req.user.id)) {
      const storedToken = tokenMap.get(req.user.id);
      if (storedToken !== token) {
        return sendUnauthorized(res, MESSAGES.UNAUTHORIZED);
      }
    }
    next();
  } catch (error) {
    return sendUnauthorized(res, MESSAGES.INVALID_CREDENTIALS);
  }
};

//Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '24h' });
};

module.exports = {
  verifyToken,
  generateToken,
};

